import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { redis } from "../../redis.js";

export const router = express.Router();

router.use(requireAuth, requireRole("game"));

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

// Get plugin key for user
router.post("/", async (req, res) => {
  try {
    // Generate a secure plugin key based on user data
    const pluginKey = await generateUserPluginKey(req.user.userId, req.user.username);
    res.json({ ok: true, key: pluginKey });
  } catch (err) {
    console.error("Error generating plugin key:", err);
    res.status(500).json({ ok: false, error: "Failed to generate plugin key" });
  }
});

