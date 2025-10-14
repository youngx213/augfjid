// backend/listener-manager.js
import { startListener as start } from "./listener.js"; // hoặc listener.js nếu bạn đặt tên khác
const listeners = new Map();

export async function startListener(accountId, username) {
  if (listeners.has(accountId)) {
    return { status: "already_running" };
  }
  const instance = await start(username, accountId);
  listeners.set(accountId, { username, instance, status: "running" });
  return { status: "running" };
}

export async function stopListener(accountId) {
  const listener = listeners.get(accountId);
  if (!listener) return { status: "not_running" };

  // nếu tiktok connection có close()
  if (listener.instance && listener.instance.disconnect) {
    await listener.instance.disconnect();
  }
  listeners.delete(accountId);
  return { status: "stopped" };
}

export function getStatus(accountId) {
  return listeners.get(accountId)?.status || "stopped";
}

export function listAccounts() {
  return Array.from(listeners.entries()).map(([id, info]) => ({
    id,
    username: info.username,
    status: info.status,
  }));
}
