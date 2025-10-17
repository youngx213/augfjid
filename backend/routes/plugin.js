import express from "express";
import { body, param } from "express-validator";
import { handleValidation } from "../middleware/validate.js";
import { getOverlay, getPresets, getStats, setStats } from "../services/gameService.js";
import { config } from "../config.js";

export const router = express.Router();

function requirePluginKey(req, res, next) {
  const configured = config.pluginKey;
  if (!configured) {
    return res.status(503).json({ ok: false, error: "Plugin integration disabled" });
  }
  const key = req.headers["x-plugin-key"]; 
  if (!key || key !== configured) {
    return res.status(401).json({ ok: false, error: "Invalid plugin key" });
  }
  next();
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
          io.to(`overlay:${username}`).emit("overlay:update", { type: "gift", giftName, nickname, amount, coinsAdded, stats: next });
        } else {
          io.to(`overlay:${username}`).emit("overlay:update", { type: "trigger", giftName, nickname, amount });
        }
        io.to(`plugin:${username}`).emit("plugin:trigger", { giftName, nickname, amount, coinsAdded });
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


