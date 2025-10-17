import { redis } from "../redis.js";

const ORDER_HASH = "payments:orders:data";
const ORDER_LIST = "payments:orders:list";

export async function createOrder(order) {
  const record = { ...order, createdAt: order.createdAt || Date.now() };
  await redis.hset(ORDER_HASH, record.orderCode, JSON.stringify(record));
  await redis.lpush(ORDER_LIST, record.orderCode);
  await redis.ltrim(ORDER_LIST, 0, 199);
  return record;
}

export async function updateOrder(orderCode, patch) {
  const current = await getOrder(orderCode);
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await redis.hset(ORDER_HASH, orderCode, JSON.stringify(next));
  return next;
}

export async function getOrder(orderCode) {
  const json = await redis.hget(ORDER_HASH, orderCode);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function listOrders(limit = 100) {
  const codes = await redis.lrange(ORDER_LIST, 0, limit - 1);
  if (codes.length === 0) return [];
  const pipe = redis.pipeline();
  codes.forEach((code) => pipe.hget(ORDER_HASH, code));
  const res = await pipe.exec();
  return res
    .map(([err, json], idx) => {
      if (err || !json) return null;
      try {
        return JSON.parse(json);
      } catch {
        return { orderCode: codes[idx], raw: json };
      }
    })
    .filter(Boolean);
}

