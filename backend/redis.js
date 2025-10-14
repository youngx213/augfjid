// redis.js
import Redis from "ioredis";

export const redis = new Redis();
export const redisSub = new Redis(); // dùng cho pub/sub
