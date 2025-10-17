import express from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleValidation } from "../../middleware/validate.js";
import { getPresets, setPresets, upsertPreset, deletePreset } from "../../services/gameService.js";

export const router = express.Router();
router.use(requireAuth, requireRole("game"));

router.get("/", async (req, res) => {
  const presets = await getPresets(req.user.username);
  res.json({ ok: true, presets });
});

router.post(
  "/",
  body("presets").isArray(),
  handleValidation,
  async (req, res) => {
    await setPresets(req.user.username, req.body.presets);
    res.json({ ok: true });
  }
);

router.patch(
  "/:id",
  body("giftName").optional().isString().trim().notEmpty(),
  body("coinsPerUnit").optional().isNumeric(),
  body("imageUrl").optional().isString(),
  body("soundFile").optional().isString(),
  body("commands").optional().isArray(),
  body("enabled").optional().isBoolean(),
  handleValidation,
  async (req, res) => {
    const updated = await upsertPreset(req.user.username, req.params.id, req.body);
    res.json({ ok: true, presets: updated });
  }
);

router.delete("/:id", async (req, res) => {
  const presets = await deletePreset(req.user.username, req.params.id);
  res.json({ ok: true, presets });
});


