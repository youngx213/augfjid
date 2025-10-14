import Redis from "ioredis";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "./config.js";

const redis = new Redis(config.redis.url);
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

function hashPassword(password) {
  return crypto.createHash("sha256").update(password || "").digest("hex");
}

// Đăng ký tài khoản
export async function register(username, password, key) {
  if (!username || !password || !key) {
    return { ok: false, error: "username, password và key là bắt buộc" };
  }

  const role = await getRoleByKey(key);
  if (!role) return { ok: false, error: "Key không hợp lệ" };

  const exists = await redis.hget("users", username);
  if (exists) return { ok: false, error: "Tài khoản đã tồn tại" };

  const passwordHash = hashPassword(password);
  const userObj = {
    username,
    passwordHash,
    role,
    key,
    createdAt: Date.now()
  };

  await redis.hset("users", username, JSON.stringify(userObj));

  const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: "7d" });
  return { ok: true, role, token, username };
}

// Đăng nhập
export async function login(username, password) {
  if (!username || !password) return { ok: false, error: "username và password là bắt buộc" };

  const raw = await redis.hget("users", username);
  if (!raw) return { ok: false, error: "Tài khoản không tồn tại" };

  let user;
  try { user = JSON.parse(raw); } catch { return { ok: false, error: "Dữ liệu user lỗi" }; }

  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) return { ok: false, error: "Sai mật khẩu" };

  const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { ok: true, token, role: user.role, username };
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