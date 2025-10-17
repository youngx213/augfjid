import { redis } from "../redis.js";

const KEYS = {
  presets: (username) => `game:${username}:presets`,
  overlay: (username) => `game:${username}:overlay`,
  stats: (username) => `game:${username}:stats`,
};

export async function getPresets(username) {
  const data = await redis.hget(KEYS.presets(username), "data");
  return data ? JSON.parse(data) : [];
}

export async function setPresets(username, presets) {
  await redis.hset(KEYS.presets(username), "data", JSON.stringify(presets));
}

export async function upsertPreset(username, id, preset) {
  const presets = await getPresets(username);
  const idx = presets.findIndex((p) => p.id === id);
  if (idx === -1) presets.push({ ...preset, id });
  else presets[idx] = { ...presets[idx], ...preset, id };
  await setPresets(username, presets);
  return presets;
}

export async function deletePreset(username, id) {
  const presets = await getPresets(username);
  const filtered = presets.filter((p) => p.id !== id);
  await setPresets(username, filtered);
  return filtered;
}

export async function getOverlay(username) {
  const data = await redis.hget(KEYS.overlay(username), "data");
  return data ? JSON.parse(data) : {};
}

export async function setOverlay(username, overlay) {
  await redis.hset(KEYS.overlay(username), "data", JSON.stringify(overlay));
}

export async function getStats(username) {
  const data = await redis.hget(KEYS.stats(username), "data");
  return data ? JSON.parse(data) : { coins: 0, viewers: 0, winGoal: 100, timer: 0 };
}

export async function setStats(username, stats) {
  await redis.hset(KEYS.stats(username), "data", JSON.stringify(stats));
}

export async function incrCoins(username, by = 1) {
  const stats = await getStats(username);
  const nextCoins = (stats.coins || 0) + by;
  await setStats(username, { ...stats, coins: nextCoins });
  return nextCoins;
}

export async function incrWin(username, by = 1) {
  const stats = await getStats(username);
  const next = { ...stats, winGoal: (stats.winGoal || 0) + by };
  await setStats(username, next);
  return next.winGoal;
}

// ========== StreamToEarn helpers ==========
const Z = {
  gifters: (username) => `game:${username}:gifters:z`,
};
const L = {
  history: (username) => `game:${username}:history:l`,
};

export async function incrGifter(username, nickname, coins = 0) {
  if (!nickname) return;
  await redis.zincrby(Z.gifters(username), coins, nickname);
}

export async function getTopGifters(username, limit = 10) {
  const rows = await redis.zrevrange(Z.gifters(username), 0, limit - 1, "WITHSCORES");
  const out = [];
  for (let i = 0; i < rows.length; i += 2) {
    out.push({ nickname: rows[i], coins: Number(rows[i + 1]) || 0 });
  }
  return out;
}

export async function addGiftEvent(username, evt) {
  const key = L.history(username);
  await redis.lpush(key, JSON.stringify({ ts: Date.now(), ...evt }));
  await redis.ltrim(key, 0, 199);
}

export async function getGiftHistory(username, limit = 50) {
  const items = await redis.lrange(L.history(username), 0, limit - 1);
  return items.map((s) => {
    try { return JSON.parse(s); } catch { return null; }
  }).filter(Boolean);
}
