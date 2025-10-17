import express from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleValidation } from "../../middleware/validate.js";
import { getStats, setStats } from "../../services/gameService.js";

export const router = express.Router();
router.use(requireAuth, requireRole("game"));

router.get("/", async (req, res) => {
  const stats = await getStats(req.user.username);
  res.json({ ok: true, stats });
});

router.post(
  "/update",
  body("viewers").optional().isInt({ min: 0 }),
  body("coins").optional().isInt({ min: 0 }),
  body("winProgress").optional().isInt({ min: 0 }),
  body("timer").optional().isInt({ min: 0 }),
  handleValidation,
  async (req, res) => {
    const current = await getStats(req.user.username);
    const next = { ...current, ...req.body };
    await setStats(req.user.username, next);
    res.json({ ok: true });
  }
);


