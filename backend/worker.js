// queue-worker.js
import { redis } from "./redis.js";
import { analyticsService } from "./services/analyticsService.js";

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
  const startTime = Date.now();
  await writeLog(accountId, "queue", `⏳ Bắt đầu vẽ ảnh cho @${job.user}`);

  try {
    // TODO: chỗ này bạn tích hợp lệnh điều khiển tay robot
    // Ví dụ: gửi lệnh qua serial, socket, hoặc API sang máy robot
    await new Promise(r => setTimeout(r, 5000)); // giả lập robot vẽ mất 5s

    const executionTime = Date.now() - startTime;
    await writeLog(accountId, "queue", `✅ Đã vẽ xong ảnh cho @${job.user}`);
    
    // Ghi nhận command thành công vào analytics
    analyticsService.recordCommand(accountId, {
      command: `draw_image_${job.jobId}`,
      success: true,
      executionTime: executionTime,
      timestamp: Date.now()
    });
    
    // cập nhật trạng thái job
    job.status = "done";
    await redis.hset(`job:${accountId}:${job.jobId}`, job);
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    await writeLog(accountId, "error", `❌ Lỗi khi vẽ ảnh cho @${job.user}: ${error.message}`);
    
    // Ghi nhận command thất bại vào analytics
    analyticsService.recordCommand(accountId, {
      command: `draw_image_${job.jobId}`,
      success: false,
      executionTime: executionTime,
      errorType: error.name || 'unknown',
      timestamp: Date.now()
    });
    
    // cập nhật trạng thái job
    job.status = "failed";
    job.error = error.message;
    await redis.hset(`job:${accountId}:${job.jobId}`, job);
    
    throw error; // Re-throw để worker manager xử lý
  }
}

/**
 * Worker chạy vòng lặp xử lý queue tuần tự
 */
export async function startQueueWorker(accountId, signal) {
  await writeLog(accountId, "info", `Queue worker khởi động cho account ${accountId}`);

  while (!signal?.aborted) {
    const jobStr = await redis.blpop(`queue:${accountId}`, 5);
    if (!jobStr) continue;
    const payload = Array.isArray(jobStr) ? jobStr[1] : jobStr;

    let job;
    try {
      job = JSON.parse(payload);
    } catch (e) {
      await writeLog(accountId, "error", `Lỗi parse job: ${e.message}`);
      continue;
    }

    await redis.hset(`job:${accountId}:${job.jobId}`, job);

    try {
      await processJob(accountId, job);
    } catch (err) {
      await writeLog(accountId, "error", `Job ${job.jobId} bị lỗi: ${err.message}`);
    }
  }
}
