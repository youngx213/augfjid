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
import { register, login, getAllUsers, deleteUser, addKey, removeKey, verifyAdminToken, generateKey, getAllUsedKeys, getUsedKeyInfo } from "./auth.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { workerManager } from "./workerManager.js";
import { rateLimitService } from "./services/rateLimitService.js";
import { analyticsService } from "./services/analyticsService.js";
import { gameFeaturesService } from "./services/gameFeaturesService.js";
import { twoFactorService } from "./services/twoFactorService.js";
import { oauthService } from "./services/oauthService.js";
import { apiKeyService } from "./services/apiKeyService.js";
import { environmentService } from "./services/environmentService.js";
import { autoRestartService } from "./services/autoRestartService.js";
import { logAggregationService } from "./services/logAggregationService.js";
import { machineLearningService } from "./services/machineLearningService.js";
import { predictiveAnalyticsService } from "./services/predictiveAnalyticsService.js";
import { autoScalingService } from "./services/autoScalingService.js";
import { loadBalancerService } from "./services/loadBalancerService.js";
import { autoDeploymentService } from "./services/autoDeploymentService.js";
import { backupService } from "./services/backupService.js";
import { monitoringAlertsService } from "./services/monitoringAlertsService.js";
import { paymentService } from "./services/paymentService.js";
import { subscriptionService } from "./services/subscriptionService.js";
import { invoiceService } from "./services/invoiceService.js";
import { customerSupportService } from "./services/customerSupportService.js";
import { affiliateService } from "./services/affiliateService.js";
import { i18nService } from "./services/i18nService.js";
import { 
  securityMiddleware, 
  secureCorsMiddleware, 
  requestSizeLimiter,
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  apiVersioningMiddleware
} from "./middleware/security.js";
import { router as accountsRouter } from "./routes/accounts.js";
import { router as presetsRouter } from "./routes/game/presets.js";
import { router as overlayRouter } from "./routes/game/overlay.js";
import overlayGeneratorRouter from "./routes/overlay.js";
import uploadRouter from "./routes/upload.js";
import { router as statsRouter } from "./routes/game/stats.js";
import { router as leaderboardRouter } from "./routes/game/leaderboard.js";
import { router as historyRouter } from "./routes/game/history.js";
import { router as pluginKeyRouter } from "./routes/game/pluginKey.js";
import { router as pluginRouter, attachSocket as attachPluginSocket } from "./routes/plugin.js";
import { router as paymentsRouter } from "./routes/payments.js";
import { body } from "express-validator";
import { handleValidation } from "./middleware/validate.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { logger } from "./logger.js";
import jwt from "jsonwebtoken";
import { redisSub, testRedisConnection } from "./redis.js";

requireProdSecret();

// Initialize services
async function initializeServices() {
  try {
    // Initialize environment service
    await environmentService.initializeEnvironment();
    
    // Start log aggregation
    logAggregationService.start();
    
    // Start auto-restart service
    autoRestartService.startMonitoring();
    
    console.log("✅ All services initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize services:", error.message);
    process.exit(1);
  }
}

// Initialize services before creating app
await initializeServices();

const app = express();

// Security Middleware
app.use(securityMiddleware());
app.use(secureCorsMiddleware());
app.use(requestSizeLimiter('10mb'));
app.use(requestLoggingMiddleware());
app.use(apiVersioningMiddleware());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// Health check endpoints
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0"
  });
});

app.get("/health/redis", async (req, res) => {
  try {
    const isHealthy = await testRedisConnection();
    res.json({ 
      status: isHealthy ? "healthy" : "unhealthy",
      service: "redis",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      service: "redis",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
  
  socket.on("join:plugin", async (data) => {
    try {
      // Check if data contains plugin key
      const pluginKey = data?.pluginKey || socket.handshake.auth?.pluginKey || socket.handshake.headers?.["x-plugin-key"];
      
      if (pluginKey) {
        // Validate plugin key from Redis
        const redis = (await import("./redis.js")).redis;
        const userId = await redis.get(`plugin_key_reverse:${pluginKey}`);
        
        if (userId) {
          // Get username from userId (you might want to store username mapping)
          const userData = await redis.get(`user:${userId}`);
          const username = userData ? JSON.parse(userData).username : "streamer";
          
          socket.join(`plugin:${username}`);
          console.log(`🔌 Plugin client joined room: plugin:${username}`);
          // Emit plugin ready event
          socket.emit("plugin:ready", { status: "connected", username: username });
        } else {
          console.log("❌ Invalid plugin key");
        }
      }
    } catch (e) {
      console.error("Error in join:plugin:", e);
    }
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
  rateLimitService.createMiddleware('api:auth:register'),
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
  rateLimitService.createMiddleware('api:auth:login'),
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

// Lấy danh sách key đã sử dụng
app.get("/api/admin/keys/used", requireAdmin, async (req, res) => {
  const usedKeys = await getAllUsedKeys();
  res.json({ ok: true, usedKeys });
});

// Lấy thông tin key cụ thể
app.get("/api/admin/keys/:key/info", requireAdmin, async (req, res) => {
  const { key } = req.params;
  const info = await getUsedKeyInfo(key);
  if (!info) {
    return res.status(404).json({ ok: false, error: "Key not found or not used" });
  }
  res.json({ ok: true, key, info });
});

// Analytics routes
app.get("/api/analytics/:accountId", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const analytics = analyticsService.getAnalyticsSummary(accountId);
  if (!analytics) {
    return res.status(404).json({ error: "Analytics not found" });
  }
  res.json(analytics);
});

app.get("/api/analytics/:accountId/realtime", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const realTimeData = analyticsService.getRealTimeData(accountId);
  if (!realTimeData) {
    return res.status(404).json({ error: "Real-time data not found" });
  }
  res.json(realTimeData);
});

app.get("/api/analytics/:accountId/report", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const { period = 'daily' } = req.query;
  const report = analyticsService.generateReport(accountId, period);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json(report);
});

// Game Features routes
app.get("/api/game/leaderboard", (req, res) => {
  const { limit = 10, sortBy = 'totalRevenue' } = req.query;
  gameFeaturesService.getLeaderboard(parseInt(limit), sortBy)
    .then(leaderboard => res.json(leaderboard))
    .catch(error => res.status(500).json({ error: error.message }));
});

app.get("/api/game/achievements/:accountId", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const achievements = gameFeaturesService.getAchievements(accountId);
  res.json(achievements);
});

app.get("/api/game/minigames/:accountId", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const miniGames = gameFeaturesService.getActiveMiniGames(accountId);
  res.json(miniGames);
});

app.post("/api/game/minigames", requireAuth, (req, res) => {
  const { accountId, gameType, config } = req.body;
  const miniGame = gameFeaturesService.createMiniGame(accountId, gameType, config);
  res.json(miniGame);
});

app.post("/api/game/minigames/:gameId/join", requireAuth, (req, res) => {
  const { gameId } = req.params;
  const { username } = req.body;
  const result = gameFeaturesService.joinMiniGame(gameId, username);
  res.json(result);
});

app.post("/api/game/minigames/:gameId/score", requireAuth, (req, res) => {
  const { gameId } = req.params;
  const { username, score } = req.body;
  const result = gameFeaturesService.updateMiniGameScore(gameId, username, score);
  res.json(result);
});

app.post("/api/game/minigames/:gameId/end", requireAuth, (req, res) => {
  const { gameId } = req.params;
  const result = gameFeaturesService.endMiniGame(gameId);
  res.json(result);
});

app.get("/api/game/rewards/:accountId", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const { claimed } = req.query;
  const rewards = gameFeaturesService.getRewards(accountId, claimed === 'true' ? true : claimed === 'false' ? false : null);
  res.json(rewards);
});

app.post("/api/game/rewards", requireAuth, (req, res) => {
  const { accountId, rewardType, rewardData } = req.body;
  const reward = gameFeaturesService.createReward(accountId, rewardType, rewardData);
  res.json(reward);
});

app.post("/api/game/rewards/:rewardId/claim", requireAuth, (req, res) => {
  const { rewardId } = req.params;
  const { username } = req.body;
  const result = gameFeaturesService.claimReward(rewardId, username);
  res.json(result);
});

// Bot Health routes
app.get("/api/bot/health/:accountId", requireAuth, (req, res) => {
  const { accountId } = req.params;
  const healthStatus = workerManager.getHealthStatus(accountId);
  if (!healthStatus) {
    return res.status(404).json({ error: "Health status not found" });
  }
  res.json(healthStatus);
});

app.get("/api/bot/health", requireAuth, (req, res) => {
  const allHealthStatus = workerManager.getAllHealthStatus();
  res.json(allHealthStatus);
});

// 2FA routes
app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const result = await twoFactorService.setup2FA(username);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/2fa/confirm", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { token } = req.body;
    const result = await twoFactorService.confirm2FA(username, token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/2fa/verify", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { token } = req.body;
    const result = await twoFactorService.verify2FA(username, token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { token } = req.body;
    const result = await twoFactorService.disable2FA(username, token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/auth/2fa/status", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const status = await twoFactorService.get2FAStatus(username);
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/2fa/backup-codes", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { token } = req.body;
    const result = await twoFactorService.regenerateBackupCodes(username, token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// OAuth routes
app.get("/api/oauth/:provider", (req, res) => {
  try {
    const { provider } = req.params;
    const result = oauthService.generateAuthUrl(provider);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/oauth/:provider/callback", async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    // Verify state
    const stateData = await oauthService.verifyState(state);
    if (stateData.provider !== provider) {
      throw new Error("Invalid state");
    }

    // Get access token
    const token = await oauthService.getAccessToken(provider, code);
    
    // Get user info
    const userInfo = await oauthService.getUserInfo(provider, token.access_token);
    
    // Create or update user
    const result = await oauthService.createOrUpdateUser(userInfo);
    
    // Generate JWT
    const jwtToken = oauthService.generateJWT(result.user);
    
    res.json({
      success: true,
      token: jwtToken,
      user: result.user,
      isNewUser: result.isNewUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/oauth/link", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { provider, code } = req.body;
    
    // Get access token
    const token = await oauthService.getAccessToken(provider, code);
    
    // Get user info
    const userInfo = await oauthService.getUserInfo(provider, token.access_token);
    
    // Link account
    const result = await oauthService.linkOAuthAccount(username, userInfo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/oauth/:provider", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { provider } = req.params;
    const result = await oauthService.unlinkOAuthAccount(username, provider);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/oauth/accounts", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const accounts = await oauthService.getLinkedAccounts(username);
    res.json(accounts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API Key routes
app.post("/api/keys", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const result = await apiKeyService.createAPIKey(username, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/keys", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const keys = await apiKeyService.getUserAPIKeys(username);
    res.json(keys);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/keys/:keyId", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { keyId } = req.params;
    const result = await apiKeyService.updateAPIKey(username, keyId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/keys/:keyId/disable", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { keyId } = req.params;
    const result = await apiKeyService.disableAPIKey(username, keyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/keys/:keyId/enable", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { keyId } = req.params;
    const result = await apiKeyService.enableAPIKey(username, keyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/keys/:keyId", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { keyId } = req.params;
    const result = await apiKeyService.deleteAPIKey(username, keyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/keys/:keyId/stats", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { keyId } = req.params;
    const stats = await apiKeyService.getAPIKeyStats(username, keyId);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Environment & DevOps routes
app.get("/api/system/environment", requireAuth, (req, res) => {
  try {
    const envInfo = environmentService.getSystemInfo();
    const envVars = environmentService.getEnvironmentVariables();
    res.json({ ...envInfo, environmentVariables: envVars });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/system/health", async (req, res) => {
  try {
    const health = await environmentService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/system/processes", requireAuth, (req, res) => {
  try {
    const processes = autoRestartService.getAllProcessesStatus();
    res.json(processes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/system/processes/:name/restart", requireAuth, (req, res) => {
  try {
    const { name } = req.params;
    autoRestartService.restartProcess(name);
    res.json({ success: true, message: `Process ${name} restart initiated` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/logs", requireAuth, async (req, res) => {
  try {
    const { level, date, limit = 100 } = req.query;
    const logs = await logAggregationService.getLogs(level, date, parseInt(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/search", requireAuth, async (req, res) => {
  try {
    const { q: query, level, date, limit = 100 } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    const logs = await logAggregationService.searchLogs(query, level, date, parseInt(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/stats", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await logAggregationService.getLogStats(date);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/health", requireAuth, async (req, res) => {
  try {
    const health = await logAggregationService.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/export", requireAuth, async (req, res) => {
  try {
    const { level, date, format = 'json' } = req.query;
    const logs = await logAggregationService.exportLogs(level, date, format);
    
    if (!logs) {
      return res.status(500).json({ error: "Failed to export logs" });
    }

    const filename = `logs-${date || new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    }
    
    res.send(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Advanced Analytics routes
// Machine Learning routes
app.get("/api/analytics/ml/models", requireAuth, async (req, res) => {
  try {
    const status = machineLearningService.getModelsStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/train/:modelName", requireAuth, async (req, res) => {
  try {
    const { modelName } = req.params;
    const result = await machineLearningService.trainModel(modelName);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/collect-data", requireAuth, async (req, res) => {
  try {
    const { dataType, data } = req.body;
    const result = await machineLearningService.collectTrainingData(dataType, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/predict/gift", requireAuth, async (req, res) => {
  try {
    const { accountId, currentData } = req.body;
    const prediction = await machineLearningService.predictNextGift(accountId, currentData);
    res.json(prediction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/predict/revenue", requireAuth, async (req, res) => {
  try {
    const { accountId, streamData } = req.body;
    const prediction = await machineLearningService.predictRevenue(accountId, streamData);
    res.json(prediction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/analyze/viewer", requireAuth, async (req, res) => {
  try {
    const { accountId, viewerId } = req.body;
    const analysis = await machineLearningService.analyzeViewerBehavior(accountId, viewerId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/ml/recommendations", requireAuth, async (req, res) => {
  try {
    const { username } = req.user;
    const { type = 'content' } = req.body;
    const recommendations = await machineLearningService.generateRecommendations(username, type);
    res.json(recommendations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/analytics/ml/stats", requireAuth, async (req, res) => {
  try {
    const stats = await machineLearningService.getMLStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Predictive Analytics routes
app.get("/api/analytics/predictive/status", requireAuth, async (req, res) => {
  try {
    const status = predictiveAnalyticsService.getAnalyticsStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/analytics/predictive/gift-trends", requireAuth, async (req, res) => {
  try {
    const { accountId, period = '7d' } = req.body;
    const analysis = await predictiveAnalyticsService.analyzeGiftTrends(accountId, period);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/predictive/viewer-growth", requireAuth, async (req, res) => {
  try {
    const { accountId, forecastDays = 30 } = req.body;
    const analysis = await predictiveAnalyticsService.predictViewerGrowth(accountId, forecastDays);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/predictive/revenue", requireAuth, async (req, res) => {
  try {
    const { accountId, forecastDays = 30 } = req.body;
    const analysis = await predictiveAnalyticsService.predictRevenue(accountId, forecastDays);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/predictive/peak-hours", requireAuth, async (req, res) => {
  try {
    const { accountId, period = '7d' } = req.body;
    const analysis = await predictiveAnalyticsService.analyzePeakHours(accountId, period);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/analytics/predictive/comprehensive-report", requireAuth, async (req, res) => {
  try {
    const { accountId, period = '30d' } = req.body;
    const report = await predictiveAnalyticsService.generateComprehensiveReport(accountId, period);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Automation routes
// Auto-scaling routes
app.get("/api/automation/scaling/status", requireAuth, async (req, res) => {
  try {
    const status = autoScalingService.getScalingStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/scaling/start", requireAuth, async (req, res) => {
  try {
    const { interval = 30000 } = req.body;
    autoScalingService.startMonitoring(interval);
    res.json({ success: true, message: "Auto-scaling monitoring started" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/scaling/stop", requireAuth, async (req, res) => {
  try {
    autoScalingService.stopMonitoring();
    res.json({ success: true, message: "Auto-scaling monitoring stopped" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/scaling/scale-up", requireAuth, async (req, res) => {
  try {
    const instance = await autoScalingService.createNewInstance();
    res.json({ success: true, instance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/scaling/scale-down", requireAuth, async (req, res) => {
  try {
    const instance = await autoScalingService.removeInstance();
    res.json({ success: true, instance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/automation/scaling/rules/:ruleName", requireAuth, async (req, res) => {
  try {
    const { ruleName } = req.params;
    const result = await autoScalingService.updateScalingRule(ruleName, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/scaling/history", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = await autoScalingService.getScalingHistory(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/automation/scaling/metrics", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const metrics = await autoScalingService.getMetricsHistory(parseInt(limit));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load balancer routes
app.get("/api/automation/loadbalancer/status", requireAuth, async (req, res) => {
  try {
    const status = loadBalancerService.getLoadBalancerStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/loadbalancer/start", requireAuth, async (req, res) => {
  try {
    const { port = 8080 } = req.body;
    loadBalancerService.startLoadBalancer(port);
    res.json({ success: true, message: "Load balancer started" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/loadbalancer/stop", requireAuth, async (req, res) => {
  try {
    loadBalancerService.stopLoadBalancer();
    res.json({ success: true, message: "Load balancer stopped" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/loadbalancer/servers", requireAuth, async (req, res) => {
  try {
    const server = loadBalancerService.addServer(req.body);
    res.json({ success: true, server });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/automation/loadbalancer/servers/:serverId", requireAuth, async (req, res) => {
  try {
    const { serverId } = req.params;
    const success = loadBalancerService.removeServer(serverId);
    res.json({ success, message: success ? "Server removed" : "Server not found" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/automation/loadbalancer/servers/:serverId", requireAuth, async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = loadBalancerService.updateServer(serverId, req.body);
    res.json({ success: !!server, server });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/automation/loadbalancer/algorithm", requireAuth, async (req, res) => {
  try {
    const { algorithm } = req.body;
    loadBalancerService.setAlgorithm(algorithm);
    res.json({ success: true, message: `Algorithm changed to ${algorithm}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/loadbalancer/metrics", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const metrics = await loadBalancerService.getMetricsHistory(parseInt(limit));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-deployment routes
app.get("/api/automation/deployment/status", requireAuth, async (req, res) => {
  try {
    const deployments = autoDeploymentService.getAllDeployments();
    const stats = autoDeploymentService.getDeploymentStats();
    res.json({ deployments, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/deployment/create", requireAuth, async (req, res) => {
  try {
    const deployment = await autoDeploymentService.createDeployment(req.body);
    res.json({ success: true, deployment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/deployment/:deploymentId", requireAuth, async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deployment = autoDeploymentService.getDeploymentStatus(deploymentId);
    res.json(deployment);
  } catch (error) {
    res.status(404).json({ error: "Deployment not found" });
  }
});

app.post("/api/automation/deployment/:deploymentId/rollback", requireAuth, async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { targetCommit } = req.body;
    const deployment = await autoDeploymentService.rollbackDeployment(deploymentId, targetCommit);
    res.json({ success: true, deployment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/deployment/history", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await autoDeploymentService.getDeploymentHistory(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/automation/deployment/environments", requireAuth, async (req, res) => {
  try {
    const environments = Array.from(autoDeploymentService.environments.entries()).map(([name, env]) => ({
      name,
      ...env,
      status: autoDeploymentService.getEnvironmentStatus(name)
    }));
    res.json(environments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/automation/deployment/environments/:envName", requireAuth, async (req, res) => {
  try {
    const { envName } = req.params;
    const environment = autoDeploymentService.updateEnvironmentConfig(envName, req.body);
    res.json({ success: !!environment, environment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/deployment/webhook/git", async (req, res) => {
  try {
    const deployment = await autoDeploymentService.handleGitWebhook(req.body);
    res.json({ success: true, deployment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Backup Service routes
app.get("/api/automation/backup/status", requireAuth, async (req, res) => {
  try {
    const jobs = backupService.getBackupJobs();
    const history = backupService.getBackupHistory();
    const schedules = backupService.getBackupSchedules();
    const stats = backupService.getBackupStats();
    res.json({ jobs, history, schedules, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/backup/create", requireAuth, async (req, res) => {
  try {
    const { type, options = {} } = req.body;
    const job = await backupService.createBackupJob(type, options);
    res.json({ success: true, job });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/backup/execute/:jobId", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await backupService.executeBackup(jobId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/backup/schedule", requireAuth, async (req, res) => {
  try {
    const { type, cronExpression } = req.body;
    const schedule = await backupService.scheduleBackup(type, cronExpression);
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/backup/restore", requireAuth, async (req, res) => {
  try {
    const { backupPath, backupType } = req.body;
    const result = await backupService.restoreFromBackup(backupPath, backupType);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/backup/start-monitoring", requireAuth, async (req, res) => {
  try {
    backupService.startMonitoring();
    res.json({ success: true, message: "Backup monitoring started" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/backup/stop-monitoring", requireAuth, async (req, res) => {
  try {
    backupService.stopMonitoring();
    res.json({ success: true, message: "Backup monitoring stopped" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Monitoring Alerts routes
app.get("/api/automation/monitoring/status", requireAuth, async (req, res) => {
  try {
    const alerts = monitoringAlertsService.getActiveAlerts();
    const history = monitoringAlertsService.getAlertHistory();
    const rules = monitoringAlertsService.getAlertRules();
    const stats = monitoringAlertsService.getMonitoringStats();
    res.json({ alerts, history, rules, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/start", requireAuth, async (req, res) => {
  try {
    const { interval = 30000 } = req.body;
    monitoringAlertsService.startMonitoring(interval);
    res.json({ success: true, message: "Monitoring alerts started" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/stop", requireAuth, async (req, res) => {
  try {
    monitoringAlertsService.stopMonitoring();
    res.json({ success: true, message: "Monitoring alerts stopped" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/rules", requireAuth, async (req, res) => {
  try {
    const rule = await monitoringAlertsService.createAlertRule(req.body);
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/automation/monitoring/rules/:ruleId", requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = await monitoringAlertsService.updateAlertRule(ruleId, req.body);
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/automation/monitoring/rules/:ruleId", requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const result = await monitoringAlertsService.deleteAlertRule(ruleId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/alerts/:alertId/acknowledge", requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    const alert = await monitoringAlertsService.acknowledgeAlert(alertId, acknowledgedBy);
    res.json({ success: true, alert });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/alerts/:alertId/resolve", requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    const alert = await monitoringAlertsService.resolveAlert(alertId, resolvedBy);
    res.json({ success: true, alert });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/automation/monitoring/channels", requireAuth, async (req, res) => {
  try {
    const channel = await monitoringAlertsService.addNotificationChannel(req.body);
    res.json({ success: true, channel });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/monitoring/channels", requireAuth, async (req, res) => {
  try {
    const channels = await monitoringAlertsService.getNotificationChannels();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment Service routes
app.get("/api/business/payment/methods", requireAuth, async (req, res) => {
  try {
    const methods = paymentService.getPaymentMethods();
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/payment/configure", requireAuth, async (req, res) => {
  try {
    const { methodId, config } = req.body;
    const method = await paymentService.configurePaymentMethod(methodId, config);
    res.json({ success: true, method });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/payment/create-intent", requireAuth, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user.id
    };
    const paymentIntent = await paymentService.createPaymentIntent(paymentData);
    res.json({ success: true, paymentIntent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/payment/confirm/:paymentIntentId", requireAuth, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { confirmationData } = req.body;
    const result = await paymentService.confirmPayment(paymentIntentId, confirmationData);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/payment/history", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await paymentService.getPaymentHistory(req.user.id, parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/payment/stats", requireAuth, async (req, res) => {
  try {
    const stats = await paymentService.getPaymentStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/payment/webhook/:source", async (req, res) => {
  try {
    const { source } = req.params;
    const signature = req.headers['stripe-signature'] || req.headers['paypal-signature'];
    const result = await paymentService.handleWebhook(req.body, signature, source);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Subscription Service routes
app.get("/api/business/subscription/plans", requireAuth, async (req, res) => {
  try {
    const plans = subscriptionService.getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/subscription/current", requireAuth, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/subscription/create", requireAuth, async (req, res) => {
  try {
    const subscriptionData = {
      ...req.body,
      userId: req.user.id
    };
    const subscription = await subscriptionService.createSubscription(subscriptionData);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business/subscription/:subscriptionId", requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await subscriptionService.updateSubscription(subscriptionId, req.body);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/subscription/:subscriptionId/cancel", requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;
    const subscription = await subscriptionService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/subscription/:subscriptionId/upgrade", requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId } = req.body;
    const subscription = await subscriptionService.upgradeSubscription(subscriptionId, newPlanId);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/subscription/check-feature/:feature", requireAuth, async (req, res) => {
  try {
    const { feature } = req.params;
    const hasAccess = await subscriptionService.checkFeatureAccess(req.user.id, feature);
    res.json({ hasAccess });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/subscription/check-limits/:limitType", requireAuth, async (req, res) => {
  try {
    const { limitType } = req.params;
    const { currentValue = 0 } = req.query;
    const result = await subscriptionService.checkLimits(req.user.id, limitType, parseInt(currentValue));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/subscription/history", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await subscriptionService.getSubscriptionHistory(req.user.id, parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/subscription/stats", requireAuth, async (req, res) => {
  try {
    const stats = await subscriptionService.getSubscriptionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin subscription plan management
app.post("/api/business/subscription/plans", requireAdmin, async (req, res) => {
  try {
    const plan = await subscriptionService.createSubscriptionPlan(req.body);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business/subscription/plans/:planId", requireAdmin, async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await subscriptionService.updateSubscriptionPlan(planId, req.body);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/business/subscription/plans/:planId", requireAdmin, async (req, res) => {
  try {
    const { planId } = req.params;
    const result = await subscriptionService.deleteSubscriptionPlan(planId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Invoice Service routes
app.get("/api/business/invoice/templates", requireAuth, async (req, res) => {
  try {
    const templates = invoiceService.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/invoice/generate", requireAuth, async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      userId: req.user.id
    };
    const invoice = await invoiceService.generateInvoice(invoiceData);
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/invoice/:invoiceId", requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await invoiceService.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/invoice/history", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await invoiceService.getInvoiceHistory(req.user.id, parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/business/invoice/:invoiceId/status", requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;
    const invoice = await invoiceService.updateInvoiceStatus(invoiceId, status);
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/invoice/stats", requireAuth, async (req, res) => {
  try {
    const stats = await invoiceService.getInvoiceStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Support Service routes
app.get("/api/business/support/categories", requireAuth, async (req, res) => {
  try {
    const categories = customerSupportService.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/priorities", requireAuth, async (req, res) => {
  try {
    const priorities = customerSupportService.getPriorities();
    res.json(priorities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/statuses", requireAuth, async (req, res) => {
  try {
    const statuses = customerSupportService.getStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/support/ticket", requireAuth, async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      userId: req.user.id
    };
    const ticket = await customerSupportService.createTicket(ticketData);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/support/ticket/:ticketId", requireAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await customerSupportService.getTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/business/support/ticket/:ticketId", requireAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await customerSupportService.updateTicket(ticketId, req.body);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/support/ticket/:ticketId/comment", requireAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const commentData = {
      ...req.body,
      userId: req.user.id
    };
    const comment = await customerSupportService.addComment(ticketId, commentData);
    res.json({ success: true, comment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/support/ticket/:ticketId/comments", requireAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { limit = 50 } = req.query;
    const comments = await customerSupportService.getTicketComments(ticketId, parseInt(limit));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/tickets", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const tickets = await customerSupportService.getUserTickets(req.user.id, parseInt(limit));
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/stats", requireAuth, async (req, res) => {
  try {
    const stats = await customerSupportService.getSupportStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/knowledge", requireAuth, async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    const articles = await customerSupportService.getKnowledgeBaseArticles(category, parseInt(limit));
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/support/faq", requireAuth, async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    const faqs = await customerSupportService.getFAQs(category, parseInt(limit));
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Affiliate Service routes
app.post("/api/business/affiliate/register", requireAuth, async (req, res) => {
  try {
    const affiliateData = {
      ...req.body,
      userId: req.user.id
    };
    const affiliate = await affiliateService.createAffiliate(affiliateData);
    res.json({ success: true, affiliate });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/status", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    res.json(affiliate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/referrals", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    
    const { limit = 50 } = req.query;
    const referrals = await affiliateService.getAffiliateReferrals(affiliate.id, parseInt(limit));
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/commissions", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    
    const { limit = 50 } = req.query;
    const commissions = await affiliateService.getAffiliateCommissions(affiliate.id, parseInt(limit));
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/payouts", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    
    const { limit = 50 } = req.query;
    const payouts = await affiliateService.getAffiliatePayouts(affiliate.id, parseInt(limit));
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/affiliate/payout/request", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    
    const payoutData = {
      ...req.body,
      affiliateId: affiliate.id
    };
    const payout = await affiliateService.createPayoutRequest(payoutData);
    res.json({ success: true, payout });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/stats", requireAuth, async (req, res) => {
  try {
    const affiliate = await affiliateService.getAffiliateByUserId(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    
    const stats = await affiliateService.getAffiliateStats(affiliate.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/rates", requireAuth, async (req, res) => {
  try {
    const rates = affiliateService.getCommissionRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/thresholds", requireAuth, async (req, res) => {
  try {
    const thresholds = affiliateService.getPayoutThresholds();
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/business/affiliate/methods", requireAuth, async (req, res) => {
  try {
    const methods = affiliateService.getPayoutMethods();
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin business management routes
app.get("/api/business/admin/affiliates", requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const affiliates = await affiliateService.getAllAffiliates(parseInt(limit));
    res.json(affiliates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/admin/affiliate/:affiliateId/approve", requireAdmin, async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const affiliate = await affiliateService.approveAffiliate(affiliateId);
    res.json({ success: true, affiliate });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/admin/payouts", requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const payouts = await affiliateService.getAllPayouts(parseInt(limit));
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/admin/payout/:payoutId/process", requireAdmin, async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionId } = req.body;
    const payout = await affiliateService.processPayout(payoutId, transactionId);
    res.json({ success: true, payout });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business/admin/payout/:payoutId/complete", requireAdmin, async (req, res) => {
  try {
    const { payoutId } = req.params;
    const payout = await affiliateService.completePayout(payoutId);
    res.json({ success: true, payout });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/admin/support/tickets", requireAdmin, async (req, res) => {
  try {
    const { status, priority, category, assignedAgent, limit = 50 } = req.query;
    const filters = { status, priority, category, assignedAgent };
    const tickets = await customerSupportService.getAllTickets(filters);
    res.json(tickets.slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/business/admin/support/ticket/:ticketId/assign", requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { agentId } = req.body;
    const ticket = await customerSupportService.assignTicket(ticketId, agentId);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [affiliateStats, supportStats, invoiceStats] = await Promise.all([
      affiliateService.getAffiliateStats(),
      customerSupportService.getSupportStats(),
      invoiceService.getInvoiceStats()
    ]);
    
    res.json({
      affiliate: affiliateStats,
      support: supportStats,
      invoice: invoiceStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// I18n Service routes
app.get("/api/i18n/languages", requireAuth, async (req, res) => {
  try {
    const languages = i18nService.getEnabledLanguages();
    res.json(languages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/i18n/currencies", requireAuth, async (req, res) => {
  try {
    const currencies = i18nService.getEnabledCurrencies();
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/i18n/timezones", requireAuth, async (req, res) => {
  try {
    const timezones = i18nService.getEnabledTimezones();
    res.json(timezones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/i18n/preferences", requireAuth, async (req, res) => {
  try {
    const preferences = await i18nService.getUserPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/i18n/preferences", requireAuth, async (req, res) => {
  try {
    const preferences = await i18nService.updateUserPreferences(req.user.id, req.body);
    res.json({ success: true, preferences });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/translations/:language", requireAuth, async (req, res) => {
  try {
    const { language } = req.params;
    const { keys } = req.query;
    
    if (keys) {
      const keyArray = keys.split(',');
      const translations = await i18nService.getTranslations(keyArray, language);
      res.json(translations);
    } else {
      // Return all translations for the language
      const translations = await redis.hgetall(`translations:${language}`);
      res.json(translations);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/i18n/translate/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { language = 'en' } = req.query;
    
    const translation = await i18nService.getTranslation(key, language);
    res.json({ key, language, translation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/i18n/translate", requireAuth, async (req, res) => {
  try {
    const translation = await i18nService.createTranslation(req.body);
    res.json({ success: true, translation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/i18n/translate/:translationId", requireAuth, async (req, res) => {
  try {
    const { translationId } = req.params;
    const translation = await i18nService.updateTranslation(translationId, req.body);
    res.json({ success: true, translation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/format/currency", requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'USD', language = 'en' } = req.query;
    const formatted = i18nService.formatCurrency(parseFloat(amount), currency, language);
    res.json({ amount, currency, language, formatted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/format/date", requireAuth, async (req, res) => {
  try {
    const { date, format = 'MM/DD/YYYY', timezone = 'UTC' } = req.query;
    const formatted = i18nService.formatDate(date, format, timezone);
    res.json({ date, format, timezone, formatted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/format/number", requireAuth, async (req, res) => {
  try {
    const { number, language = 'en', options = {} } = req.query;
    const formatted = i18nService.formatNumber(parseFloat(number), language, options);
    res.json({ number, language, options, formatted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/detect", async (req, res) => {
  try {
    const language = i18nService.detectLanguage(req);
    res.json({ detectedLanguage: language });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/i18n/stats", requireAuth, async (req, res) => {
  try {
    const stats = await i18nService.getI18nStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/i18n/import", requireAuth, async (req, res) => {
  try {
    const { translations } = req.body;
    const result = await i18nService.bulkImportTranslations(translations);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/i18n/export", requireAuth, async (req, res) => {
  try {
    const { language, format = 'json' } = req.query;
    const exported = await i18nService.exportTranslations(language, format);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    }
    
    res.send(exported);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin i18n management routes
app.post("/api/i18n/admin/languages", requireAdmin, async (req, res) => {
  try {
    const language = await i18nService.createLanguage(req.body);
    res.json({ success: true, language });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/i18n/admin/currencies", requireAdmin, async (req, res) => {
  try {
    const currency = await i18nService.createCurrency(req.body);
    res.json({ success: true, currency });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/i18n/admin/timezones", requireAdmin, async (req, res) => {
  try {
    const timezone = await i18nService.createTimezone(req.body);
    res.json({ success: true, timezone });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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
app.use("/api/game/plugin-key", pluginKeyRouter);

// ============ OVERLAY GENERATOR ROUTES ============
app.use("/overlay", overlayGeneratorRouter);
app.use("/upload", uploadRouter);

// ============ PLUGIN ROUTES (for Minecraft plugin) ============
app.use("/api/plugin", attachPluginSocket(io));

// Error middleware
app.use(notFound);
app.use(errorHandler);
app.use(errorHandlingMiddleware());
// Start server
httpServer.listen(config.port, () =>
  console.log(`✅ Backend API + WebSocket chạy ở http://localhost:${config.port}`)
);
