// redis.js
import Redis from "ioredis";
import { config } from "./config.js";

const redisUrl = config.redis.url;

export const redis = new Redis(redisUrl, {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

export const redisSub = new Redis(redisUrl, {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Test Redis connection on startup
export async function testRedisConnection() {
  try {
    await redis.ping();
    console.log("✅ Redis connection successful");
    return true;
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    return false;
  }
}

// Validate Redis before operations
export async function validateRedisConnection() {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis connection validation failed:", error.message);
    return false;
  }
}
