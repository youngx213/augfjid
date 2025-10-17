// server.js
import express from "express";
import cors from 'cors';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, requireProdSecret } from "./config.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { notifyUser } from "./notifier.js";
import { startListener, stopListener, getStatus, setSocketIO } from "./listener.js";
import { register, login, getAllUsers, deleteUser, addKey, removeKey, verifyAdminToken, generateKey } from "./auth.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { workerManager } from "./workerManager.js";
import { router as accountsRouter } from "./routes/accounts.js";
import { router as presetsRouter } from "./routes/game/presets.js";
import { router as overlayRouter } from "./routes/game/overlay.js";
import { router as statsRouter } from "./routes/game/stats.js";
import { router as leaderboardRouter } from "./routes/game/leaderboard.js";
import { router as historyRouter } from "./routes/game/history.js";
import { router as pluginRouter, attachSocket as attachPluginSocket } from "./routes/plugin.js";
import { router as paymentsRouter } from "./routes/payments.js";
import { body } from "express-validator";
import { handleValidation } from "./middleware/validate.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { logger } from "./logger.js";
import jwt from "jsonwebtoken";
import { redisSub } from "./redis.js";

requireProdSecret();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
const limiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max, standardHeaders: true, legacyHeaders: false });
app.use(limiter);
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: config.corsOrigin, credentials: true } });
workerManager.setIO(io);

// Socket.IO token auth
io.use((socket, next) => {
  const t = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
  if (!t) return next(new Error("Unauthorized"));
  try {
    jwt.verify(t, config.jwtSecret);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// cors configured above

// Kết nối Redis (sử dụng instance chia sẻ trong redis.js nếu cần ở nơi khác)

// Cho listener sử dụng WebSocket
setSocketIO(io);

// Deprecated runtime accounts removed; stats will be computed via Redis data

// Khi có client kết nối socket
io.on("connection", (socket) => {
  console.log("🔌 Client connected");
  
  // Join room based on user role and username
  socket.on("join:game", () => {
    try {
      const t = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      const payload = jwt.verify(t, config.jwtSecret);
      const username = payload?.username;
      if (username) {
        socket.join(`overlay:${username}`);
        console.log(`🎮 Game client joined room: overlay:${username}`);
      }
    } catch {}
  });
  
  socket.on("join:plugin", () => {
    try {
      const t = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      const payload = jwt.verify(t, config.jwtSecret);
      const username = payload?.username;
      if (username) {
        socket.join(`plugin:${username}`);
        console.log(`🔌 Plugin client joined room: plugin:${username}`);
        // Emit plugin ready event
        socket.emit("plugin:ready", { status: "connected" });
      }
    } catch {}
  });

  socket.on("join:user", (data) => {
    const { userId } = data;
    socket.join(`user:${userId}`);
    console.log(`👤 Dashboard joined room: user:${userId}`);
  });
  
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

// Redis pub/sub để đẩy log realtime ra socket (dùng shared subscriber)
redisSub.psubscribe("log:*");
redisSub.on("pmessage", (pattern, channel, message) => {
  const accountId = channel.split(":")[1];
  const entry = JSON.parse(message);
  io.emit("log", { accountId, ...entry });
});

// Simple request log
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ============ API ROUTES ============
app.use("/api/accounts", accountsRouter);
app.use("/api/payments", paymentsRouter);

app.post(
  "/api/auth/register",
  body("username").isString().trim().notEmpty(),
  body("password").isString().isLength({ min: 6 }),
  body("key").optional().isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { username, password, key } = req.body;
    const result = await register(username, password, key);
    res.json(result);
  }
);

app.post(
  "/api/auth/login",
  body("username").isString().trim().notEmpty(),
  body("password").isString().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { username, password } = req.body;
    const result = await login(username, password);
    res.json(result);
  }
);

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  const admin = verifyAdminToken(token);
  if (!admin) return res.status(403).json({ error: "Not admin" });
  req.admin = admin;
  next();
}

// ADMIN API
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

app.post("/api/admin/users/delete", requireAdmin, async (req, res) => {
  const { username } = req.body;
  await deleteUser(username);
  res.json({ ok: true });
});

app.post(
  "/api/admin/keys/add",
  requireAdmin,
  body("key").isString().trim().notEmpty(),
  body("role").optional().isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { key, role } = req.body;
    await addKey(key, role);
    res.json({ ok: true });
  }
);

app.post(
  "/api/admin/keys/remove",
  requireAdmin,
  body("key").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { key } = req.body;
    await removeKey(key);
    res.json({ ok: true });
  }
);
app.post(
  "/api/admin/keys/gen",
  requireAdmin,
  body("role").optional().isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const key = generateKey();
    await addKey(key, req.body.role || undefined);
    res.json({ ok: true, key, role: req.body.role || "game" });
  }
);

// Admin stats route
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  // Count total TikTok accounts across users by scanning Redis lists matching accounts:*
  try {
    const { redis } = await import("./redis.js");
    const keys = await redis.keys("accounts:*");
    let tiktokAccounts = 0;
    if (keys.length) {
      const pipe = redis.pipeline();
      keys.forEach((k) => pipe.llen(k));
      const lens = await pipe.exec();
      tiktokAccounts = lens.reduce((sum, [, len]) => sum + (Number(len) || 0), 0);
    }
    res.json({ total: users.length, active: 0, tiktokAccounts });
  } catch {
    res.json({ total: users.length, active: 0, tiktokAccounts: 0 });
  }
});

// User gifts placeholder routes to avoid 404
app.get("/api/user/gifts", requireAuth, (req, res) => res.json([]));
app.post("/api/user/gifts", requireAuth, (req, res) => res.json({ ok: true }));
app.post("/api/user/gifts/remove", requireAuth, (req, res) => res.json({ ok: true }));

// ============ GAME ROUTES (for role=game) ============
app.use("/api/game/presets", presetsRouter);
app.use("/api/game/overlay", overlayRouter);
app.use("/api/game/stats", statsRouter);
app.use("/api/game/leaderboard", leaderboardRouter);
app.use("/api/game/history", historyRouter);

// ============ PLUGIN ROUTES (for Minecraft plugin) ============
app.use("/api/plugin", attachPluginSocket(io));

// Error middleware
app.use(notFound);
app.use(errorHandler);
// Start server
httpServer.listen(config.port, () =>
  console.log(`✅ Backend API + WebSocket chạy ở http://localhost:${config.port}`)
);
