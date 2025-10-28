import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service quản lý sức khỏe và hiệu suất của bot
 */
class BotHealthService extends EventEmitter {
  constructor() {
    super();
    this.healthChecks = new Map();
    this.performanceMetrics = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 giây
  }

  /**
   * Khởi tạo health check cho một account
   */
  initHealthCheck(accountId) {
    const healthCheck = {
      accountId,
      isHealthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: Date.now()
    };

    this.healthChecks.set(accountId, healthCheck);
    this.performanceMetrics.set(accountId, {
      responseTimes: [],
      errorRates: [],
      throughput: []
    });

    // Bắt đầu health check định kỳ
    this.startPeriodicHealthCheck(accountId);
    
    return healthCheck;
  }

  /**
   * Bắt đầu health check định kỳ
   */
  startPeriodicHealthCheck(accountId) {
    const interval = setInterval(async () => {
      await this.performHealthCheck(accountId);
    }, 30000); // Kiểm tra mỗi 30 giây

    // Lưu interval để có thể clear sau
    const healthCheck = this.healthChecks.get(accountId);
    if (healthCheck) {
      healthCheck.interval = interval;
    }
  }

  /**
   * Thực hiện health check
   */
  async performHealthCheck(accountId) {
    const healthCheck = this.healthChecks.get(accountId);
    if (!healthCheck) return;

    try {
      const startTime = Date.now();
      
      // Kiểm tra kết nối Redis
      await redis.ping();
      
      // Kiểm tra listener status
      const listenerStatus = await this.checkListenerStatus(accountId);
      
      const responseTime = Date.now() - startTime;
      
      // Cập nhật metrics
      this.updatePerformanceMetrics(accountId, responseTime, true);
      
      // Cập nhật health status
      healthCheck.isHealthy = listenerStatus === "running";
      healthCheck.lastCheck = Date.now();
      healthCheck.consecutiveFailures = 0;
      
      if (healthCheck.isHealthy) {
        this.emit("healthCheck:success", { accountId, responseTime });
      } else {
        this.emit("healthCheck:failure", { accountId, reason: "listener_not_running" });
      }

    } catch (error) {
      this.handleHealthCheckFailure(accountId, error);
    }
  }

  /**
   * Kiểm tra trạng thái listener
   */
  async checkListenerStatus(accountId) {
    try {
      const status = await redis.get(`listener:${accountId}:status`);
      return status || "stopped";
    } catch (error) {
      return "error";
    }
  }

  /**
   * Xử lý khi health check thất bại
   */
  handleHealthCheckFailure(accountId, error) {
    const healthCheck = this.healthChecks.get(accountId);
    if (!healthCheck) return;

    healthCheck.consecutiveFailures++;
    healthCheck.isHealthy = false;
    healthCheck.lastCheck = Date.now();
    
    this.updatePerformanceMetrics(accountId, 0, false);
    
    this.emit("healthCheck:failure", { 
      accountId, 
      error: error.message,
      consecutiveFailures: healthCheck.consecutiveFailures
    });

    // Nếu thất bại liên tiếp, thử khôi phục
    if (healthCheck.consecutiveFailures >= 3) {
      this.attemptRecovery(accountId);
    }
  }

  /**
   * Thử khôi phục bot
   */
  async attemptRecovery(accountId) {
    const retryCount = this.retryAttempts.get(accountId) || 0;
    
    if (retryCount >= this.maxRetries) {
      this.emit("recovery:failed", { 
        accountId, 
        reason: "max_retries_exceeded",
        retryCount 
      });
      return;
    }

    this.retryAttempts.set(accountId, retryCount + 1);
    
    this.emit("recovery:attempting", { 
      accountId, 
      attempt: retryCount + 1,
      maxRetries: this.maxRetries
    });

    // Đợi một chút trước khi thử lại
    setTimeout(async () => {
      try {
        // Thử khởi động lại listener
        await this.restartListener(accountId);
        
        // Reset retry count nếu thành công
        this.retryAttempts.delete(accountId);
        
        this.emit("recovery:success", { accountId });
      } catch (error) {
        this.emit("recovery:failure", { 
          accountId, 
          error: error.message,
          attempt: retryCount + 1
        });
      }
    }, this.retryDelay * (retryCount + 1)); // Tăng delay theo số lần retry
  }

  /**
   * Khởi động lại listener
   */
  async restartListener(accountId) {
    // Import động để tránh circular dependency
    const { workerManager } = await import("../workerManager.js");
    
    // Lấy thông tin account từ Redis
    const accountData = await redis.hgetall(`account:${accountId}`);
    if (!accountData || !accountData.id) {
      throw new Error("Account data not found");
    }

    // Dừng worker hiện tại
    await workerManager.stop(accountData);
    
    // Khởi động lại
    await workerManager.start(accountData);
  }

  /**
   * Cập nhật performance metrics
   */
  updatePerformanceMetrics(accountId, responseTime, success) {
    const metrics = this.performanceMetrics.get(accountId);
    if (!metrics) return;

    const healthCheck = this.healthChecks.get(accountId);
    if (!healthCheck) return;

    // Cập nhật counters
    healthCheck.totalRequests++;
    if (success) {
      healthCheck.successfulRequests++;
    } else {
      healthCheck.failedRequests++;
    }

    // Cập nhật response times
    if (responseTime > 0) {
      metrics.responseTimes.push(responseTime);
      if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift(); // Giữ tối đa 100 giá trị
      }
      
      // Tính average response time
      const sum = metrics.responseTimes.reduce((a, b) => a + b, 0);
      healthCheck.averageResponseTime = sum / metrics.responseTimes.length;
    }

    // Cập nhật error rate
    const errorRate = healthCheck.failedRequests / healthCheck.totalRequests;
    metrics.errorRates.push(errorRate);
    if (metrics.errorRates.length > 100) {
      metrics.errorRates.shift();
    }

    // Cập nhật throughput (requests per minute)
    const now = Date.now();
    const uptimeMinutes = (now - healthCheck.uptime) / 60000;
    const throughput = healthCheck.totalRequests / uptimeMinutes;
    metrics.throughput.push(throughput);
    if (metrics.throughput.length > 100) {
      metrics.throughput.shift();
    }
  }

  /**
   * Lấy health status của account
   */
  getHealthStatus(accountId) {
    const healthCheck = this.healthChecks.get(accountId);
    if (!healthCheck) return null;

    const metrics = this.performanceMetrics.get(accountId);
    
    return {
      ...healthCheck,
      performanceMetrics: metrics ? {
        averageResponseTime: healthCheck.averageResponseTime,
        errorRate: healthCheck.failedRequests / healthCheck.totalRequests,
        throughput: metrics.throughput[metrics.throughput.length - 1] || 0,
        uptime: Date.now() - healthCheck.uptime
      } : null
    };
  }

  /**
   * Lấy tất cả health status
   */
  getAllHealthStatus() {
    const statuses = {};
    for (const [accountId] of this.healthChecks) {
      statuses[accountId] = this.getHealthStatus(accountId);
    }
    return statuses;
  }

  /**
   * Dừng health check cho account
   */
  stopHealthCheck(accountId) {
    const healthCheck = this.healthChecks.get(accountId);
    if (healthCheck && healthCheck.interval) {
      clearInterval(healthCheck.interval);
    }
    
    this.healthChecks.delete(accountId);
    this.performanceMetrics.delete(accountId);
    this.retryAttempts.delete(accountId);
  }

  /**
   * Dừng tất cả health checks
   */
  stopAllHealthChecks() {
    for (const [accountId] of this.healthChecks) {
      this.stopHealthCheck(accountId);
    }
  }
}

export const botHealthService = new BotHealthService();
