import express from "express";
import { body, param } from "express-validator";
import { handleValidation } from "../middleware/validate.js";
import { getOverlay, getPresets, getStats, setStats } from "../services/gameService.js";
import { config } from "../config.js";
import { redis, validateRedisConnection } from "../redis.js";

export const router = express.Router();

async function requirePluginKey(req, res, next) {
  const pluginKey = req.headers["x-plugin-key"];
  if (!pluginKey) {
    return res.status(401).json({ ok: false, error: "Unauthorized: Missing plugin key" });
  }
  
  // Validate Redis connection first
  const isRedisConnected = await validateRedisConnection();
  if (!isRedisConnected) {
    return res.status(503).json({ ok: false, error: "Service temporarily unavailable" });
  }
  
  try {
    // Check if key exists in Redis (user-specific key)
    const userId = await redis.get(`plugin_key_reverse:${pluginKey}`);
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized: Invalid or expired plugin key" });
    }
    
    // Add user info to request for later use
    req.pluginUser = { userId };
    next();
  } catch (err) {
    console.error("Plugin key validation error:", err);
    return res.status(401).json({ ok: false, error: "Unauthorized: Key validation failed" });
  }
}

export function attachSocket(io) {
  router.post(
    "/trigger",
    body("username").isString().trim().notEmpty(),
    body(["gift", "giftName"]).custom((_, { req }) => {
      return typeof req.body.gift === "string" || typeof req.body.giftName === "string";
    }),
    body("nickname").optional().isString(),
    body("amount").isInt({ min: 1 }),
    handleValidation,
    requirePluginKey,
    async (req, res) => {
      const { username, nickname, amount } = req.body;
      const giftName = req.body.giftName || req.body.gift;
        try {
          const presets = await getPresets(username);
          const rule = Array.isArray(presets) ? presets.find(p => (p.giftName || p.gift) === giftName && (p.enabled !== false)) : null;
          let coinsAdded = 0;
          
          if (rule) {
            const perUnit = Number(rule.coinsPerUnit || rule.amount || 1);
            coinsAdded = perUnit * Number(amount || 1);
            const current = await getStats(username);
            const next = { ...current, coins: (current.coins || 0) + coinsAdded };
            await setStats(username, next);
            
            // Send overlay update with gift info
            io.to(`overlay:${username}`).emit("overlay:update", { 
              type: "gift", 
              giftName, 
              nickname, 
              amount, 
              coinsAdded, 
              stats: next,
              imageUrl: rule.imageUrl,
              punishmentImage: rule.punishmentImage
            });
            
            // Send plugin trigger with full rule data
            io.to(`plugin:${username}`).emit("plugin:trigger", { 
              giftName, 
              nickname, 
              amount, 
              coinsAdded,
              commands: rule.commands || [],
              sound: rule.soundFile,
              punishmentImage: rule.punishmentImage,
              repetition: rule.repetition || 1,
              delay: rule.delay || 0,
              interval: rule.interval || 100,
              hideInOverlay: rule.hideInOverlay || false
            });
          } else {
            io.to(`overlay:${username}`).emit("overlay:update", { type: "trigger", giftName, nickname, amount });
            io.to(`plugin:${username}`).emit("plugin:trigger", { giftName, nickname, amount, coinsAdded: 0 });
          }
          
          res.json({ ok: true, coinsAdded });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message || "trigger error" });
      }
    }
  );

  return router;
}

router.use(requirePluginKey);

router.get(
  "/config/:username",
  param("username").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { username } = req.params;
    const presets = await getPresets(username);
    const overlay = await getOverlay(username);
    const stats = await getStats(username);
    res.json({ ok: true, presets, overlay, stats });
  }
);

router.post(
  "/stats",
  body("username").isString().trim().notEmpty(),
  body("viewers").optional().isInt({ min: 0 }),
  body("coins").optional().isInt({ min: 0 }),
  body("winGoal").optional().isInt({ min: 0 }),
  body("timer").optional().isInt({ min: 0 }),
  handleValidation,
  async (req, res) => {
    const { username, ...updates } = req.body;
    const current = await getStats(username);
    const next = { ...current, ...updates };
    await setStats(username, next);
    res.json({ ok: true });
  }
);

// New endpoint for leaderboard
router.get(
  "/leaderboard/:username",
  param("username").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { username } = req.params;
    try {
      // Get leaderboard data from Redis or database
      // This is a simplified version - you might want to implement proper leaderboard logic
      const stats = await getStats(username);
      res.json({ ok: true, leaderboard: [{ username, coins: stats.coins || 0 }] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

// Endpoint for game status
router.get(
  "/game-status/:username",
  param("username").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    const { username } = req.params;
    try {
      const stats = await getStats(username);
      res.json({ 
        ok: true, 
        gameActive: true, // You might want to track this in Redis
        streamer: username,
        timer: stats.timer || 0,
        viewers: stats.viewers || 0
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);