import { redis } from "../redis.js";
import EventEmitter from "events";
import { spawn, exec } from "child_process";
import os from "os";

/**
 * Service Auto-scaling cho hệ thống
 */
class AutoScalingService extends EventEmitter {
  constructor() {
    super();
    this.scalingRules = new Map();
    this.currentInstances = new Map();
    this.metrics = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.initializeScalingRules();
  }

  /**
   * Khởi tạo scaling rules
   */
  initializeScalingRules() {
    // CPU-based scaling
    this.scalingRules.set('cpu', {
      name: 'CPU Usage',
      metric: 'cpu_usage',
      scaleUpThreshold: 80, // 80% CPU usage
      scaleDownThreshold: 30, // 30% CPU usage
      minInstances: 1,
      maxInstances: 10,
      cooldownPeriod: 300000, // 5 minutes
      lastAction: null
    });

    // Memory-based scaling
    this.scalingRules.set('memory', {
      name: 'Memory Usage',
      metric: 'memory_usage',
      scaleUpThreshold: 85, // 85% memory usage
      scaleDownThreshold: 40, // 40% memory usage
      minInstances: 1,
      maxInstances: 8,
      cooldownPeriod: 300000, // 5 minutes
      lastAction: null
    });

    // Request-based scaling
    this.scalingRules.set('requests', {
      name: 'Request Rate',
      metric: 'request_rate',
      scaleUpThreshold: 1000, // 1000 requests per minute
      scaleDownThreshold: 200, // 200 requests per minute
      minInstances: 1,
      maxInstances: 15,
      cooldownPeriod: 180000, // 3 minutes
      lastAction: null
    });

    // Response time scaling
    this.scalingRules.set('response_time', {
      name: 'Response Time',
      metric: 'response_time',
      scaleUpThreshold: 2000, // 2 seconds
      scaleDownThreshold: 500, // 500ms
      minInstances: 1,
      maxInstances: 12,
      cooldownPeriod: 240000, // 4 minutes
      lastAction: null
    });
  }

  /**
   * Bắt đầu monitoring
   */
  startMonitoring(interval = 30000) {
    if (this.isMonitoring) {
      console.log("Auto-scaling monitoring is already running");
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.evaluateScalingRules();
      } catch (error) {
        console.error("Error in auto-scaling monitoring:", error.message);
      }
    }, interval);

    console.log(`✅ Auto-scaling monitoring started (interval: ${interval}ms)`);
    this.emit('monitoring:started', { interval });
  }

  /**
   * Dừng monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("🛑 Auto-scaling monitoring stopped");
    this.emit('monitoring:stopped');
  }

  /**
   * Thu thập metrics
   */
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu_usage: await this.getCPUUsage(),
        memory_usage: await this.getMemoryUsage(),
        request_rate: await this.getRequestRate(),
        response_time: await this.getResponseTime(),
        active_connections: await this.getActiveConnections(),
        queue_size: await this.getQueueSize()
      };

      // Store metrics
      await redis.hset(`scaling:metrics:${Date.now()}`, metrics);
      
      // Keep only last 100 metrics
      const metricKeys = await redis.keys('scaling:metrics:*');
      if (metricKeys.length > 100) {
        const sortedKeys = metricKeys.sort();
        const keysToDelete = sortedKeys.slice(0, metricKeys.length - 100);
        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete);
        }
      }

      this.emit('metrics:collected', metrics);
      return metrics;
    } catch (error) {
      console.error("Failed to collect metrics:", error.message);
      throw error;
    }
  }

  /**
   * Đánh giá scaling rules
   */
  async evaluateScalingRules() {
    try {
      const currentMetrics = await this.getCurrentMetrics();
      if (!currentMetrics) return;

      for (const [ruleName, rule] of this.scalingRules) {
        const metricValue = currentMetrics[rule.metric];
        if (metricValue === undefined) continue;

        const shouldScaleUp = metricValue >= rule.scaleUpThreshold;
        const shouldScaleDown = metricValue <= rule.scaleDownThreshold;
        const canScale = this.canScale(rule);

        if (shouldScaleUp && canScale && this.getCurrentInstanceCount() < rule.maxInstances) {
          await this.scaleUp(ruleName, metricValue, rule);
        } else if (shouldScaleDown && canScale && this.getCurrentInstanceCount() > rule.minInstances) {
          await this.scaleDown(ruleName, metricValue, rule);
        }
      }
    } catch (error) {
      console.error("Failed to evaluate scaling rules:", error.message);
    }
  }

  /**
   * Scale up
   */
  async scaleUp(ruleName, metricValue, rule) {
    try {
      console.log(`📈 Scaling UP due to ${ruleName}: ${metricValue} (threshold: ${rule.scaleUpThreshold})`);
      
      const newInstance = await this.createNewInstance();
      if (newInstance) {
        rule.lastAction = Date.now();
        this.emit('scaling:up', {
          rule: ruleName,
          metric: metricValue,
          newInstance: newInstance,
          totalInstances: this.getCurrentInstanceCount()
        });

        // Update scaling history
        await this.recordScalingAction('scale_up', ruleName, metricValue, newInstance);
      }
    } catch (error) {
      console.error(`Failed to scale up for ${ruleName}:`, error.message);
    }
  }

  /**
   * Scale down
   */
  async scaleDown(ruleName, metricValue, rule) {
    try {
      console.log(`📉 Scaling DOWN due to ${ruleName}: ${metricValue} (threshold: ${rule.scaleDownThreshold})`);
      
      const removedInstance = await this.removeInstance();
      if (removedInstance) {
        rule.lastAction = Date.now();
        this.emit('scaling:down', {
          rule: ruleName,
          metric: metricValue,
          removedInstance: removedInstance,
          totalInstances: this.getCurrentInstanceCount()
        });

        // Update scaling history
        await this.recordScalingAction('scale_down', ruleName, metricValue, removedInstance);
      }
    } catch (error) {
      console.error(`Failed to scale down for ${ruleName}:`, error.message);
    }
  }

  /**
   * Tạo instance mới
   */
  async createNewInstance() {
    try {
      const instanceId = `instance_${Date.now()}`;
      const port = await this.getAvailablePort();
      
      // Start new backend instance
      const child = spawn('node', ['server.js'], {
        env: {
          ...process.env,
          PORT: port,
          INSTANCE_ID: instanceId,
          CLUSTER_MODE: 'true'
        },
        detached: true,
        stdio: 'inherit'
      });

      const instance = {
        id: instanceId,
        pid: child.pid,
        port: port,
        status: 'starting',
        createdAt: new Date().toISOString(),
        metrics: {
          cpu: 0,
          memory: 0,
          requests: 0
        }
      };

      this.currentInstances.set(instanceId, instance);
      
      // Store instance info in Redis
      await redis.hset(`scaling:instances:${instanceId}`, instance);

      console.log(`✅ Created new instance: ${instanceId} on port ${port}`);
      return instance;
    } catch (error) {
      console.error("Failed to create new instance:", error.message);
      return null;
    }
  }

  /**
   * Xóa instance
   */
  async removeInstance() {
    try {
      if (this.currentInstances.size <= 1) {
        console.log("Cannot remove instance: minimum instances reached");
        return null;
      }

      // Find least loaded instance
      const instances = Array.from(this.currentInstances.values());
      const leastLoaded = instances.reduce((min, instance) => 
        instance.metrics.requests < min.metrics.requests ? instance : min
      );

      // Kill the process
      try {
        process.kill(leastLoaded.pid, 'SIGTERM');
      } catch (error) {
        console.log(`Process ${leastLoaded.pid} already terminated`);
      }

      // Remove from tracking
      this.currentInstances.delete(leastLoaded.id);
      await redis.del(`scaling:instances:${leastLoaded.id}`);

      console.log(`✅ Removed instance: ${leastLoaded.id}`);
      return leastLoaded;
    } catch (error) {
      console.error("Failed to remove instance:", error.message);
      return null;
    }
  }

  /**
   * Kiểm tra có thể scale không
   */
  canScale(rule) {
    if (!rule.lastAction) return true;
    return Date.now() - rule.lastAction > rule.cooldownPeriod;
  }

  /**
   * Lấy số lượng instances hiện tại
   */
  getCurrentInstanceCount() {
    return this.currentInstances.size;
  }

  /**
   * Lấy port khả dụng
   */
  async getAvailablePort() {
    const startPort = 3001;
    const maxPort = 3100;
    
    for (let port = startPort; port <= maxPort; port++) {
      try {
        const isAvailable = await this.isPortAvailable(port);
        if (isAvailable) return port;
      } catch (error) {
        continue;
      }
    }
    
    throw new Error("No available ports found");
  }

  /**
   * Kiểm tra port có khả dụng không
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Lưu scaling action
   */
  async recordScalingAction(action, rule, metricValue, instance) {
    try {
      const record = {
        action: action,
        rule: rule,
        metricValue: metricValue,
        instance: instance,
        timestamp: new Date().toISOString(),
        totalInstances: this.getCurrentInstanceCount()
      };

      await redis.hset(`scaling:history:${Date.now()}`, record);
      
      // Keep only last 1000 records
      const historyKeys = await redis.keys('scaling:history:*');
      if (historyKeys.length > 1000) {
        const sortedKeys = historyKeys.sort();
        const keysToDelete = sortedKeys.slice(0, historyKeys.length - 1000);
        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete);
        }
      }
    } catch (error) {
      console.error("Failed to record scaling action:", error.message);
    }
  }

  /**
   * Metrics collection methods
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        resolve(Math.min(cpuPercent * 100, 100));
      }, 100);
    });
  }

  async getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    return (memUsage.heapUsed / totalMem) * 100;
  }

  async getRequestRate() {
    try {
      // Get request count from last minute
      const oneMinuteAgo = Date.now() - 60000;
      const requestKeys = await redis.keys('requests:*');
      let requestCount = 0;
      
      for (const key of requestKeys) {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp > oneMinuteAgo) {
          requestCount++;
        }
      }
      
      return requestCount;
    } catch (error) {
      return 0;
    }
  }

  async getResponseTime() {
    try {
      // Get average response time from last 100 requests
      const responseTimes = await redis.lrange('response_times', 0, 99);
      if (responseTimes.length === 0) return 0;
      
      const total = responseTimes.reduce((sum, time) => sum + parseFloat(time), 0);
      return total / responseTimes.length;
    } catch (error) {
      return 0;
    }
  }

  async getActiveConnections() {
    try {
      const connections = await redis.get('active_connections');
      return parseInt(connections) || 0;
    } catch (error) {
      return 0;
    }
  }

  async getQueueSize() {
    try {
      const queueSize = await redis.llen('job_queue');
      return queueSize;
    } catch (error) {
      return 0;
    }
  }

  async getCurrentMetrics() {
    try {
      const metricKeys = await redis.keys('scaling:metrics:*');
      if (metricKeys.length === 0) return null;
      
      const latestKey = metricKeys.sort().pop();
      const metrics = await redis.hgetall(latestKey);
      
      return {
        cpu_usage: parseFloat(metrics.cpu_usage) || 0,
        memory_usage: parseFloat(metrics.memory_usage) || 0,
        request_rate: parseInt(metrics.request_rate) || 0,
        response_time: parseFloat(metrics.response_time) || 0,
        active_connections: parseInt(metrics.active_connections) || 0,
        queue_size: parseInt(metrics.queue_size) || 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Cập nhật scaling rules
   */
  async updateScalingRule(ruleName, updates) {
    try {
      const rule = this.scalingRules.get(ruleName);
      if (!rule) {
        throw new Error(`Scaling rule not found: ${ruleName}`);
      }

      Object.assign(rule, updates);
      
      // Save to Redis
      await redis.hset(`scaling:rules:${ruleName}`, rule);
      
      this.emit('rule:updated', { ruleName, rule });
      return { success: true, rule };
    } catch (error) {
      throw new Error(`Failed to update scaling rule: ${error.message}`);
    }
  }

  /**
   * Lấy trạng thái auto-scaling
   */
  getScalingStatus() {
    return {
      isMonitoring: this.isMonitoring,
      currentInstances: this.getCurrentInstanceCount(),
      scalingRules: Array.from(this.scalingRules.entries()).map(([name, rule]) => ({
        name,
        ...rule,
        lastAction: rule.lastAction ? new Date(rule.lastAction).toISOString() : null
      })),
      instances: Array.from(this.currentInstances.values())
    };
  }

  /**
   * Lấy scaling history
   */
  async getScalingHistory(limit = 100) {
    try {
      const historyKeys = await redis.keys('scaling:history:*');
      const sortedKeys = historyKeys.sort().slice(-limit);
      
      const history = [];
      for (const key of sortedKeys) {
        const record = await redis.hgetall(key);
        if (record) {
          history.push({
            ...record,
            timestamp: record.timestamp
          });
        }
      }
      
      return history;
    } catch (error) {
      return [];
    }
  }

  /**
   * Lấy metrics history
   */
  async getMetricsHistory(limit = 100) {
    try {
      const metricKeys = await redis.keys('scaling:metrics:*');
      const sortedKeys = metricKeys.sort().slice(-limit);
      
      const metrics = [];
      for (const key of sortedKeys) {
        const metric = await redis.hgetall(key);
        if (metric) {
          metrics.push({
            timestamp: metric.timestamp,
            cpu_usage: parseFloat(metric.cpu_usage) || 0,
            memory_usage: parseFloat(metric.memory_usage) || 0,
            request_rate: parseInt(metric.request_rate) || 0,
            response_time: parseFloat(metric.response_time) || 0,
            active_connections: parseInt(metric.active_connections) || 0,
            queue_size: parseInt(metric.queue_size) || 0
          });
        }
      }
      
      return metrics;
    } catch (error) {
      return [];
    }
  }

  /**
   * Dừng tất cả instances
   */
  async stopAllInstances() {
    try {
      const instances = Array.from(this.currentInstances.values());
      
      for (const instance of instances) {
        try {
          process.kill(instance.pid, 'SIGTERM');
          await redis.del(`scaling:instances:${instance.id}`);
        } catch (error) {
          console.log(`Instance ${instance.id} already stopped`);
        }
      }
      
      this.currentInstances.clear();
      console.log("✅ All instances stopped");
    } catch (error) {
      console.error("Failed to stop all instances:", error.message);
    }
  }
}

export const autoScalingService = new AutoScalingService();
