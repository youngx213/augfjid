import { redis } from "./redis.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

const JWT_SECRET = config.jwtSecret;

// Kiểm tra key hợp lệ
export async function isValidKey(key) {
  if (!key) return false;
  const role = await redis.hget("valid_keys", key);
  return role !== null;
}

// Thêm key mới (admin call)
export async function addKey(key, role = "game") {
  if (!key) throw new Error("Key required");
  await redis.hset("valid_keys", key, role);
  // giữ tối đa metadata nếu cần: redis.hset("valid_keys_meta", key, JSON.stringify({...}))
  return { ok: true, key, role };
}

export async function getRoleByKey(key) {
  if (!key) return null;
  const role = await redis.hget("valid_keys", key);
  return role; // null nếu không có
}

export async function removeKey(key) {
  if (!key) throw new Error("Key required");
  const removed = await redis.hdel("valid_keys", key);
  return removed > 0;
}

export function generateKey(length = 16) {
  // length là số ký tự hex; dùng randomBytes
  const bytes = Math.ceil(length / 2);
  return crypto.randomBytes(bytes).toString("hex").slice(0, length);
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password || "", salt);
}

// Đăng ký tài khoản
export async function register(username, password, key) {
  if (!username || !password) {
    return { ok: false, error: "username và password là bắt buộc" };
  }

  // Determine role strictly by key; default to "bot" if no key/invalid
  let role = null;
  if (key) {
    role = await getRoleByKey(key);
  }
  if (!role) role = "bot";

  const exists = await redis.hget("users", username);
  if (exists) return { ok: false, error: "Tài khoản đã tồn tại" };

  const passwordHash = await hashPassword(password);
  const userId = crypto.createHash("sha256").update(`u:${username}`).digest("hex").slice(0, 16);
  const userObj = {
    userId,
    username,
    passwordHash,
    role,
    key,
    createdAt: Date.now()
  };

  await redis.hset("users", username, JSON.stringify(userObj));

  // Thêm dữ liệu mẫu cho user role=game (chuẩn hoá schema presets)
  if (role === "game") {
    const samplePresets = [
      { id: "follow", giftName: "Follow", amount: 1, coinsPerUnit: 1, commands: ["say Thanks for the follow!"], soundFile: "sub.mp3", imageUrl: "", enabled: true },
      { id: "rose", giftName: "Rose", amount: 1, coinsPerUnit: 1, commands: ["give @p tnt 1"], soundFile: "bue.mp3", imageUrl: "", enabled: true },
      { id: "perfume", giftName: "Perfume", amount: 20, coinsPerUnit: 20, commands: ["give @p tnt 20"], soundFile: "chipi.mp3", imageUrl: "", enabled: true }
    ];
    await redis.hset(`game:${username}:presets`, "data", JSON.stringify(samplePresets));
    
    const sampleOverlay = {
      goalLikes: `https://app.streamtoearn.io/overlay/${username}/goal-likes`,
      smartBar: `https://app.streamtoearn.io/overlay/${username}/smart-bar`,
      topGifters: `https://app.streamtoearn.io/overlay/${username}/top-gifters`
    };
    await redis.hset(`game:${username}:overlay`, "data", JSON.stringify(sampleOverlay));
    
    const sampleStats = {
      coins: 0,
      viewers: 0,
      winGoal: 100,
      timer: 0
    };
    await redis.hset(`game:${username}:stats`, "data", JSON.stringify(sampleStats));
  }

  const token = jwt.sign({ username, role, userId }, JWT_SECRET, { expiresIn: "6h" });
  return { ok: true, role, token, username, userId };
}

// Đăng nhập
export async function login(username, password) {
  if (!username || !password) return { ok: false, error: "username và password là bắt buộc" };

  const raw = await redis.hget("users", username);
  if (!raw) return { ok: false, error: "Tài khoản không tồn tại" };

  let user;
  try { user = JSON.parse(raw); } catch { return { ok: false, error: "Dữ liệu user lỗi" }; }

  const isMatch = await bcrypt.compare(password || "", user.passwordHash || "");
  if (!isMatch) return { ok: false, error: "Sai mật khẩu" };

  const token = jwt.sign({ username, role: user.role, userId: user.userId }, JWT_SECRET, { expiresIn: "6h" });
  return { ok: true, token, role: user.role, username, userId: user.userId };
}

// Verify admin token -> returns decoded payload or null
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.role === "admin") return decoded;
    return null;
  } catch {
    return null;
  }
}

// Lấy danh sách user (admin)
export async function getAllUsers() {
  const names = await redis.hkeys("users");
  const out = [];
  for (const name of names) {
    try {
      const raw = await redis.hget("users", name);
      const u = JSON.parse(raw);
      out.push({ username: u.username || name, role: u.role || null, key: u.key || null, createdAt: u.createdAt || null });
    } catch {
      out.push({ username: name });
    }
  }
  return out;
}

// Xóa user (admin)
export async function deleteUser(username) {
  if (!username) return { ok: false, error: "username required" };
  const removed = await redis.hdel("users", username);
  return removed > 0 ? { ok: true } : { ok: false, error: "User not found" };
}