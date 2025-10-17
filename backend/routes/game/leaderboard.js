import express from "express";
import { query } from "express-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleValidation } from "../../middleware/validate.js";
import { getTopGifters } from "../../services/gameService.js";

export const router = express.Router();
router.use(requireAuth, requireRole("game"));

router.get(
  "/top-gifters",
  query("limit").optional().isInt({ min: 1, max: 50 }),
  handleValidation,
  async (req, res) => {
    const limit = Number(req.query.limit || 10);
    const data = await getTopGifters(req.user.username, limit);
    res.json({ ok: true, topGifters: data });
  }
);


