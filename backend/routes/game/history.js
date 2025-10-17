import express from "express";
import { query } from "express-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleValidation } from "../../middleware/validate.js";
import { getGiftHistory } from "../../services/gameService.js";

export const router = express.Router();
router.use(requireAuth, requireRole("game"));

router.get(
  "/",
  query("limit").optional().isInt({ min: 1, max: 200 }),
  handleValidation,
  async (req, res) => {
    const limit = Number(req.query.limit || 50);
    const data = await getGiftHistory(req.user.username, limit);
    res.json({ ok: true, history: data });
  }
);


