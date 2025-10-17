// redis.js
import Redis from "ioredis";
import { config } from "./config.js";

const redisUrl = config.redis.url;

export const redis = new Redis(redisUrl);
export const redisSub = new Redis(redisUrl); // dùng cho pub/sub
