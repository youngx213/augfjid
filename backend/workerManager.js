import EventEmitter from "events";
import { startListener, stopListener, getStatus as getListenerStatus } from "./listener.js";
import { startQueueWorker } from "./worker.js";
import { botHealthService } from "./services/botHealthService.js";
import { analyticsService } from "./services/analyticsService.js";
import { gameFeaturesService } from "./services/gameFeaturesService.js";

class WorkerManager extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map();
    this.io = null;
  }

  setIO(io) {
    this.io = io;
  }

  status(accountId) {
    const w = this.workers.get(accountId);
    if (w?.abortController?.signal?.aborted) return "stopped";
    return w?.status || getListenerStatus(accountId) || "stopped";
  }

  async start(account) {
    const { id: accountId, userId, username } = account;
    if (this.workers.has(accountId)) return this.status(accountId);

    const abortController = new AbortController();
    const listenerResult = await startListener(accountId, username);
    if (listenerResult.status !== "running") {
      return listenerResult.status;
    }

    const worker = {
      id: accountId,
      userId,
      username,
      status: "running",
      startedAt: Date.now(),
      abortController
    };

    // Khởi tạo các services
    botHealthService.initHealthCheck(accountId);
    analyticsService.initAnalytics(accountId);
    gameFeaturesService.initGameFeatures(accountId);

    // Lắng nghe events từ services
    this.setupServiceEventListeners(accountId);

    startQueueWorker(accountId, abortController.signal).catch((err) => {
      this.emit("error", { accountId, error: err });
    });

    this.workers.set(accountId, worker);
    if (this.io) this.io.to(`user:${userId}`).emit("account:status", { accountId, status: "running" });
    return worker.status;
  }

  async stop(account) {
    const { id: accountId, userId } = account;
    const worker = this.workers.get(accountId);
    if (!worker) return "stopped";
    if (worker.abortController && !worker.abortController.signal.aborted) {
      worker.abortController.abort();
    }
    await stopListener(accountId);
    
    // Dừng các services
    botHealthService.stopHealthCheck(accountId);
    analyticsService.stopAnalytics(accountId);
    gameFeaturesService.stopGameFeatures(accountId);
    
    this.workers.delete(accountId);
    if (this.io) this.io.to(`user:${userId}`).emit("account:status", { accountId, status: "stopped" });
    return "stopped";
  }

  /**
   * Thiết lập event listeners cho các services
   */
  setupServiceEventListeners(accountId) {
    // Bot Health Service events
    botHealthService.on('healthCheck:failure', (data) => {
      if (data.accountId === accountId) {
        this.emit('bot:health:failure', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('bot:health:failure', data);
        }
      }
    });

    botHealthService.on('recovery:success', (data) => {
      if (data.accountId === accountId) {
        this.emit('bot:recovery:success', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('bot:recovery:success', data);
        }
      }
    });

    // Analytics Service events
    analyticsService.on('gift:recorded', (data) => {
      if (data.accountId === accountId) {
        this.emit('analytics:gift:recorded', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('analytics:gift:recorded', data);
        }
      }
    });

    analyticsService.on('realtime:update', (data) => {
      if (data.accountId === accountId) {
        this.emit('analytics:realtime:update', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('analytics:realtime:update', data);
        }
      }
    });

    // Game Features Service events
    gameFeaturesService.on('achievements:unlocked', (data) => {
      if (data.accountId === accountId) {
        this.emit('game:achievements:unlocked', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('game:achievements:unlocked', data);
        }
      }
    });

    gameFeaturesService.on('leaderboard:updated', (data) => {
      if (data.accountId === accountId) {
        this.emit('game:leaderboard:updated', data);
        if (this.io) {
          this.io.to(`account:${accountId}`).emit('game:leaderboard:updated', data);
        }
      }
    });
  }

  /**
   * Lấy health status của account
   */
  getHealthStatus(accountId) {
    return botHealthService.getHealthStatus(accountId);
  }

  /**
   * Lấy analytics của account
   */
  getAnalytics(accountId) {
    return analyticsService.getAnalyticsSummary(accountId);
  }

  /**
   * Lấy game features của account
   */
  getGameFeatures(accountId) {
    return {
      leaderboard: this.leaderboards.get(accountId),
      achievements: gameFeaturesService.getAchievements(accountId),
      miniGames: gameFeaturesService.getActiveMiniGames(accountId),
      rewards: gameFeaturesService.getRewards(accountId)
    };
  }
}

export const workerManager = new WorkerManager();


