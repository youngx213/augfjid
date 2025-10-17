import express from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";
import { listAccounts, createAccount, updateAccount, deleteAccount, getAccount, getAccountQueue, getAccountGifted } from "../services/accountService.js";
import { workerManager } from "../workerManager.js";

export const router = express.Router();

router.use(requireAuth, requireRole("bot"));

router.get("/", async (req, res) => {
  const accounts = await listAccounts(req.user.userId);
  const withStatus = accounts.map((a) => ({ ...a, status: workerManager.status(a.id) }));
  res.json({ ok: true, accounts: withStatus });
});

router.post(
  "/",
  body("username").isString().trim().notEmpty(),
  body("settings").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const account = await createAccount(req.user.userId, { username: req.body.username, settings: req.body.settings || {} });
    res.json({ ok: true, account });
  }
);

router.patch(
  "/:id",
  body("settings").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const updated = await updateAccount(req.user.userId, req.params.id, { settings: req.body.settings || {} });
    if (!updated) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, account: updated });
  }
);

router.delete("/:id", async (req, res) => {
  await deleteAccount(req.user.userId, req.params.id);
  res.json({ ok: true });
});

router.get("/:id/queue", async (req, res) => {
  const queue = await getAccountQueue(req.user.userId, req.params.id);
  if (queue === null) return res.status(404).json({ ok: false, error: "Not found" });
  res.json(queue);
});

router.get("/:id/gifted", async (req, res) => {
  const gifted = await getAccountGifted(req.user.userId, req.params.id);
  if (gifted === null) return res.status(404).json({ ok: false, error: "Not found" });
  res.json(gifted);
});

router.post("/:id/start", async (req, res) => {
  const acc = await getAccount(req.user.userId, req.params.id);
  if (!acc) return res.status(404).json({ ok: false, error: "Not found" });
  await workerManager.start(acc);
  res.json({ ok: true });
});

router.post("/:id/stop", async (req, res) => {
  const acc = await getAccount(req.user.userId, req.params.id);
  if (!acc) return res.status(404).json({ ok: false, error: "Not found" });
  await workerManager.stop(acc);
  res.json({ ok: true });
});


