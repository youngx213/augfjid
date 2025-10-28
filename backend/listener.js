import { WebcastPushConnection } from "tiktok-live-connector";
import { markGift, hasGifted } from "./gift-tracker.js";
import { redis } from "./redis.js";
import { analyticsService } from "./services/analyticsService.js";
import { gameFeaturesService } from "./services/gameFeaturesService.js";
import { getPresets } from "./services/gameService.js";
let ioRef = null;

// Thêm Map để quản lý listeners
const listeners = new Map();

// Gán socket.io từ server
export function setSocketIO(io) { 
  ioRef = io; 
}

// Ghi log
async function writeLog(accountId, level, text) {
  const entry = { time: Date.now(), level, text };
  await redis.lpush(`logs:${accountId}`, JSON.stringify(entry));
  await redis.ltrim(`logs:${accountId}`, 0, 99);
  if (ioRef) ioRef.emit("log", { accountId, ...entry });
}

// Gửi job tới WebSocket
async function pushJobToWS(accountId, job) {
  if (!ioRef) return;
  ioRef.emit("message", {
    type: "new_job",
    accountId,
    user: job.user,
    imageUrl: job.imageUrl,
    jobId: job.jobId
  });
  await writeLog(accountId, "queue", `Job từ @${job.user} đã gửi tới Python client.`);
}

// Trigger plugin với gift events
async function triggerPlugin(username, giftData) {
  try {
    const presets = await getPresets(username);
    const preset = Array.isArray(presets) 
      ? presets.find(p => p.giftName === giftData.giftName && p.enabled !== false)
      : null;
    
    if (preset && preset.commands && preset.commands.length > 0) {
      // Emit plugin trigger event via Socket.IO
      if (ioRef) {
        ioRef.to(`plugin:${username}`).emit("plugin:trigger", {
          giftName: giftData.giftName,
          nickname: giftData.username,
          amount: giftData.repeatCount || 1,
          commands: preset.commands,
          sound: preset.soundFile,
          punishmentImage: preset.punishmentImage,
          repetition: preset.repetition || 1,
          delay: preset.delay || 0,
          interval: preset.interval || 100,
          hideInOverlay: preset.hideInOverlay || false,
          coinsAdded: (preset.coinsPerUnit || 1) * (giftData.repeatCount || 1)
        });
        console.log(`🔌 Sent plugin trigger for ${giftData.giftName} to plugin:${username}`);
      }
    }
  } catch (err) {
    console.error("Failed to trigger plugin:", err);
  }
}

// Start listener
export async function startListener(accountId, username) {
  // Kiểm tra nếu đã có listener
  if (listeners.has(accountId)) {
    return { status: "already_running" };
  }

  const tiktok = new WebcastPushConnection(username);

  try {
    await tiktok.connect();
    // Lưu listener vào Map với trạng thái
    listeners.set(accountId, {
      instance: tiktok,
      status: "running",
      username
    });
    await writeLog(accountId, "info", `Đã kết nối tới live của @${username}`);
  } catch (err) {
    await writeLog(accountId, "error", `Lỗi kết nối: ${err.message}`);
    return { status: "error", error: err.message };
  }

  tiktok.on("gift", async (data) => {
    await writeLog(accountId, "gift", `${data.uniqueId} tặng ${data.giftName}`);
    await markGift(accountId, data.uniqueId);
    
    // Ghi nhận gift vào analytics
    analyticsService.recordGift(accountId, {
      giftName: data.giftName,
      giftValue: data.diamondCount || 1,
      username: data.uniqueId,
      timestamp: Date.now()
    });
    
    // Cập nhật leaderboard
    gameFeaturesService.updateLeaderboard(accountId, {
      gifts: 1,
      revenue: data.diamondCount || 1,
      viewers: 1
    });
    
    // Kiểm tra achievements
    const analytics = analyticsService.getAnalyticsSummary(accountId);
    if (analytics) {
      await gameFeaturesService.checkAchievements(accountId, {
        gifts: 1,
        totalGifts: analytics.totalGifts,
        totalRevenue: analytics.totalRevenue,
        uniqueViewers: analytics.uniqueViewers
      });
    }
    
    // Trigger plugin với gift data
    await triggerPlugin(username, {
      giftName: data.giftName,
      username: data.uniqueId,
      repeatCount: data.repeatCount || 1
    });
  });

  tiktok.on("chat", async (chat) => {
    const user = chat.uniqueId;
    const text = chat.comment || "";

    const imgRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp))/i;
    const match = text.match(imgRegex);

    if (match && await hasGifted(accountId, user)) {
      const job = {
        jobId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user,
        imageUrl: match[1],
        status: "pending",
        createdAt: Date.now()
      };
      await redis.rpush(`queue:${accountId}`, JSON.stringify(job));
      await writeLog(accountId, "queue", `Ảnh từ @${user} đã vào queue.`);

      await pushJobToWS(accountId, job);
    }
  });

  tiktok.on("streamEnd", async () => {
    await writeLog(accountId, "info", `Stream của @${username} đã kết thúc`);
    listeners.get(accountId).status = "ended";
  });

  tiktok.on("disconnected", async () => {
    await writeLog(accountId, "warn", `Mất kết nối với @${username}`);
    listeners.get(accountId).status = "disconnected";
  });

  return { status: "running" };
}

// Stop listener
export async function stopListener(accountId) {
  const listener = listeners.get(accountId);
  if (!listener) return { status: "not_running" };

  try {
    if (listener.instance && typeof listener.instance.disconnect === 'function') {
      await listener.instance.disconnect();
    }
    listeners.delete(accountId);
    await writeLog(accountId, "info", `Đã dừng listener cho account ${accountId}`);
    return { status: "stopped" };
  } catch (err) {
    await writeLog(accountId, "error", `Lỗi khi dừng listener: ${err.message}`);
    return { status: "error", error: err.message };
  }
}

// Get status
export function getStatus(accountId) {
  const listener = listeners.get(accountId);
  return listener ? listener.status : "stopped";
}

// Get all listeners status
export function getAllListeners() {
  const status = {};
  for (const [accountId, listener] of listeners) {
    status[accountId] = {
      status: listener.status,
      username: listener.username
    };
  }
  return status;
}