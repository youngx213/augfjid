// queue-worker.js
import Redis from "ioredis";
import { config } from "./config.js";

const redis = new Redis(config.redis.url);

/**
 * Ghi log để Dashboard thấy realtime
 */
async function writeLog(accountId, level, text) {
  const entry = { time: Date.now(), level, text };
  await redis.lpush(`logs:${accountId}`, JSON.stringify(entry));
  await redis.ltrim(`logs:${accountId}`, 0, 99);
  await redis.publish(`log:${accountId}`, JSON.stringify(entry));
}

/**
 * Xử lý 1 job trong hàng đợi
 */
async function processJob(accountId, job) {
  await writeLog(accountId, "queue", `⏳ Bắt đầu vẽ ảnh cho @${job.user}`);

  // TODO: chỗ này bạn tích hợp lệnh điều khiển tay robot
  // Ví dụ: gửi lệnh qua serial, socket, hoặc API sang máy robot
  await new Promise(r => setTimeout(r, 5000)); // giả lập robot vẽ mất 5s

  await writeLog(accountId, "queue", `✅ Đã vẽ xong ảnh cho @${job.user}`);
  
  // cập nhật trạng thái job
  job.status = "done";
  await redis.hset(`job:${accountId}:${job.jobId}`, job);
}

/**
 * Worker chạy vòng lặp xử lý queue tuần tự
 */
export async function startQueueWorker(accountId) {
  await writeLog(accountId, "info", `Queue worker khởi động cho account ${accountId}`);

  while (true) {
    // lấy job từ queue
    const jobStr = await redis.lpop(`queue:${accountId}`);
    if (!jobStr) {
      await new Promise(r => setTimeout(r, 2000)); // chờ 2s rồi check lại
      continue;
    }

    let job;
    try {
      job = JSON.parse(jobStr);
    } catch (e) {
      await writeLog(accountId, "error", `Lỗi parse job: ${e.message}`);
      continue;
    }

    // lưu job vào Redis hash để quản lý trạng thái
    await redis.hset(`job:${accountId}:${job.jobId}`, job);

    // xử lý job
    try {
      await processJob(accountId, job);
    } catch (err) {
      await writeLog(accountId, "error", `Job ${job.jobId} bị lỗi: ${err.message}`);
    }
  }
}
