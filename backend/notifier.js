// notifier.js
import Redis from "ioredis";
import { config } from "./config.js";
const redis = new Redis(config.redis.url);

/**
 * Ghi log vào Redis + publish pub/sub để Dashboard realtime
 */
async function writeLog(accountId, level, text) {
  const entry = { time: Date.now(), level, text };
  await redis.lpush(`logs:${accountId}`, JSON.stringify(entry));
  await redis.ltrim(`logs:${accountId}`, 0, 99);
  await redis.publish(`log:${accountId}`, JSON.stringify(entry));
}

/**
 * Gửi notify đến user (giả lập gửi tin nhắn TikTok)
 * Ở đây bạn sẽ cần tích hợp TikTok API để gửi DM thật
 */
export async function notifyUser(accountId, username, message) {
  // TODO: call TikTok API ở đây
  await writeLog(accountId, "notify", `Đã gửi notify cho @${username}: ${message}`);
}

/**
 * Gửi notify hàng loạt
 */
export async function notifyUsers(accountId, users, message) {
  for (const u of users) {
    await notifyUser(accountId, u, message);
  }
}
