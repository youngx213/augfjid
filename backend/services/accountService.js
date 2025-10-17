import { redis } from "../redis.js";

const LIST_KEY = (userId) => `accounts:${userId}`;
const HASH_KEY = (userId, accountId) => `account:${userId}:${accountId}`;

export async function listAccounts(userId) {
  const ids = await redis.lrange(LIST_KEY(userId), 0, -1);
  const pipe = redis.pipeline();
  ids.forEach((id) => pipe.hget(HASH_KEY(userId, id), "data"));
  const res = await pipe.exec();
  return res.map(([, json]) => (json ? JSON.parse(json) : null)).filter(Boolean);
}

export async function createAccount(userId, data) {
  const accountId = String(Date.now());
  const account = { id: accountId, userId, settings: data.settings || {}, username: data.username || "", status: "stopped", createdAt: Date.now() };
  await redis.rpush(LIST_KEY(userId), accountId);
  await redis.hset(HASH_KEY(userId, accountId), "data", JSON.stringify(account));
  return account;
}

export async function getAccount(userId, accountId) {
  const json = await redis.hget(HASH_KEY(userId, accountId), "data");
  return json ? JSON.parse(json) : null;
}

export async function updateAccount(userId, accountId, patch) {
  const current = await getAccount(userId, accountId);
  if (!current) return null;
  const updated = { ...current, settings: { ...(current.settings || {}), ...(patch.settings || {}) }, username: patch.username ?? current.username };
  await redis.hset(HASH_KEY(userId, accountId), "data", JSON.stringify(updated));
  return updated;
}

export async function deleteAccount(userId, accountId) {
  await redis.lrem(LIST_KEY(userId), 0, accountId);
  await redis.del(HASH_KEY(userId, accountId));
  return true;
}

export async function getAccountQueue(userId, accountId) {
  const account = await getAccount(userId, accountId);
  if (!account) return null;
  const items = await redis.lrange(`queue:${accountId}`, 0, -1);
  return items
    .map((row) => {
      try {
        return JSON.parse(row);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function getAccountGifted(userId, accountId) {
  const account = await getAccount(userId, accountId);
  if (!account) return null;
  return await redis.smembers(`gifted:${accountId}`);
}


