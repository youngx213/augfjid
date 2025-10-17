import express from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleValidation } from "../../middleware/validate.js";
import { getOverlay, setOverlay } from "../../services/gameService.js";

export const router = express.Router();
router.use(requireAuth, requireRole("game"));

router.get("/", async (req, res) => {
  const overlay = await getOverlay(req.user.username);
  res.json({ ok: true, overlay });
});

router.post(
  "/",
  body("goalLikes").optional().isString(),
  body("smartBar").optional().isString(),
  body("topGifters").optional().isString(),
  handleValidation,
  async (req, res) => {
    const current = await getOverlay(req.user.username);
    const overlay = { ...current, ...req.body };
    await setOverlay(req.user.username, overlay);
    res.json({ ok: true });
  }
);


