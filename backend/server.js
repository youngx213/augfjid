// server.js
import express from "express";
import cors from 'cors';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, requireProdSecret } from "./config.js";
import Redis from "ioredis";
import { createServer } from "http";
import { Server } from "socket.io";
import { notifyUser } from "./notifier.js";
import { startListener, stopListener, getStatus, setSocketIO } from "./listener.js";
import { register, login, getAllUsers, deleteUser, addKey, removeKey, verifyAdminToken, generateKey } from "./auth.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { body } from "express-validator";
import { handleValidation } from "./middleware/validate.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { logger } from "./logger.js";

requireProdSecret();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
const limiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max, standardHeaders: true, legacyHeaders: false });
app.use(limiter);
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// cors configured above

// Kết nối Redis
const redis = new Redis(config.redis.url);

// Cho listener sử dụng WebSocket
setSocketIO(io);

// Quản lý accounts demo
let accounts = [{ id: "1", username: "acc1", status: "stopped" }];

// Khi có client kết nối socket
io.on("connection", (socket) => {
  console.log("🔌 Client connected");
  socket.on("disconnect", () => console.log("❌ Client disconnected"));
});

// Redis pub/sub để đẩy log realtime ra socket
const sub = new Redis(config.redis.url);
sub.psubscribe("log:*");
sub.on("pmessage", (pattern, channel, message) => {
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
app.get("/api/accounts", (req, res) => {
  accounts = accounts.map(a => ({ ...a, status: getStatus(a.id) }));
  res.json(accounts);
});

app.post(
  "/api/accounts",
  requireAuth,
  body("username").isString().trim().notEmpty(),
  handleValidation,
  (req, res) => {
    const { username } = req.body;
    const id = String(Date.now());
    accounts.push({ id, username, status: "stopped", owner: req.user.username });
    res.json({ ok: true, id });
  }
);

app.post("/api/accounts/:id/start", requireAuth, async (req, res) => {
  const acc = accounts.find(a => a.id === req.params.id);
  if (acc) {
    await startListener(acc.id, acc.username);
    acc.status = "running";
  }
  res.json({ ok: true });
});

app.post("/api/accounts/:id/stop", requireAuth, async (req, res) => {
  const acc = accounts.find(a => a.id === req.params.id);
  if (acc) {
    await stopListener(acc.id);
    acc.status = "stopped";
  }
  res.json({ ok: true });
});

app.get("/api/accounts/:id/queue", async (req, res) => {
  const jobs = await redis.lrange(`queue:${req.params.id}`, 0, -1);
  res.json(jobs.map(j => JSON.parse(j)));
});

app.post("/api/accounts/:id/queue/:jobId/remove", async (req, res) => {
  const jobs = await redis.lrange(`queue:${req.params.id}`, 0, -1);
  const job = jobs.find(j => JSON.parse(j).jobId == req.params.jobId);
  if (job) await redis.lrem(`queue:${req.params.id}`, 1, job);
  res.json({ ok: true });
});

app.post("/api/accounts/:id/queue/:jobId/markdone", async (req, res) => {
  // Có thể lưu trạng thái job sang Redis hash
  res.json({ ok: true });
});

app.get("/api/accounts/:id/gifted", async (req, res) => {
  const users = await redis.smembers(`gifted:${req.params.id}`);
  res.json(users);
});

app.get("/api/accounts/:id/logs", async (req, res) => {
  const logs = await redis.lrange(`logs:${req.params.id}`, 0, 50);
  res.json(logs.map(l => JSON.parse(l)));
});

app.post(
  "/api/accounts/:id/notify",
  requireAuth,
  body("users").isArray({ min: 1 }),
  body("message").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { users, message } = req.body;
    for (const u of users) await notifyUser(req.params.id, u, message);
    res.json({ ok: true });
  }
);

app.post(
  "/api/auth/register",
  body("username").isString().trim().notEmpty(),
  body("password").isString().isLength({ min: 6 }),
  body("key").isString().trim().notEmpty(),
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
app.post("/api/admin/keys/gen", requireAdmin, async (req, res) => {
  const key = generateKey();
  await addKey(key);
  res.json({ ok: true, key });
});

// Error middleware
app.use(notFound);
app.use(errorHandler);
// Start server
httpServer.listen(3001, () =>
  console.log("✅ Backend API + WebSocket chạy ở http://localhost:3001")
);
