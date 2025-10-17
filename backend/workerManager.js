import EventEmitter from "events";
import { startListener, stopListener, getStatus as getListenerStatus } from "./listener.js";
import { startQueueWorker } from "./worker.js";

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
    this.workers.delete(accountId);
    if (this.io) this.io.to(`user:${userId}`).emit("account:status", { accountId, status: "stopped" });
    return "stopped";
  }
}

export const workerManager = new WorkerManager();


