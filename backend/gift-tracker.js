// gift-tracker.js
import { redis } from "./redis.js";

/**
 * Đánh dấu 1 user đã tặng quà trong account cụ thể
 */
export async function markGift(accountId, username) {
  await redis.sadd(`gifted:${accountId}`, username);
}

/**
 * Kiểm tra xem user đã tặng quà chưa
 */
export async function hasGifted(accountId, username) {
  return await redis.sismember(`gifted:${accountId}`, username) === 1;
}

/**
 * Lấy toàn bộ danh sách user đã tặng quà
 */
export async function getGiftedUsers(accountId) {
  return await redis.smembers(`gifted:${accountId}`);
}
