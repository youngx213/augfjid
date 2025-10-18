import express from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";
import { listAccounts, createAccount, updateAccount, deleteAccount, getAccount, getAccountQueue, getAccountGifted } from "../services/accountService.js";
import { workerManager } from "../workerManager.js";
import { redis } from "../redis.js";

export const router = express.Router();

router.use(requireAuth, requireRole(["bot", "game"]));

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

// Get plugin key for user
router.get("/plugin-key", async (req, res) => {
  try {
    // Generate a secure plugin key based on user data
    const pluginKey = await generateUserPluginKey(req.user.userId, req.user.username);
    res.json({ ok: true, pluginKey });
  } catch (err) {
    console.error("Error generating plugin key:", err);
    res.status(500).json({ ok: false, error: "Failed to generate plugin key" });
  }
});

// Generate secure plugin key for user
async function generateUserPluginKey(userId, username) {
  const crypto = await import("crypto");
  const timestamp = Date.now();
  const data = `${userId}:${username}:${timestamp}`;
  
  // Create HMAC-based key that's hard to forge
  const hmac = crypto.createHmac("sha256", process.env.JWT_SECRET || "453782thien");
  hmac.update(data);
  const key = hmac.digest("hex");
  
  // Store key in Redis with expiration
  await redis.setex(`plugin_key:${userId}`, 86400, key); // 24 hours
  await redis.setex(`plugin_key_reverse:${key}`, 86400, userId); // Reverse lookup
  
  return key;
}


