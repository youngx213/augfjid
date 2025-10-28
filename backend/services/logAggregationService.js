import { redis } from "../redis.js";
import fs from "fs/promises";
import path from "path";
import EventEmitter from "events";

/**
 * Service tập trung và quản lý logs
 */
class LogAggregationService extends EventEmitter {
  constructor() {
    super();
    this.logs = new Map();
    this.logBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.maxLogFiles = 10;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.logLevels = ['error', 'warn', 'info', 'debug'];
    this.isRunning = false;
  }

  /**
   * Khởi động log aggregation
   */
  start() {
    if (this.isRunning) {
      console.log("Log aggregation service is already running");
      return;
    }

    this.isRunning = true;
    console.log("📝 Log aggregation service started");

    // Flush buffer định kỳ
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);

    // Cleanup old logs định kỳ
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000); // 1 hour

    // Setup log directory
    this.setupLogDirectory();
  }

  /**
   * Dừng log aggregation
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("🛑 Log aggregation service stopped");

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Flush remaining logs
    this.flushBuffer();
  }

  /**
   * Setup log directory
   */
  async setupLogDirectory() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });
      console.log(`📁 Log directory created: ${logDir}`);
    } catch (error) {
      console.error("Failed to create log directory:", error.message);
    }
  }

  /**
   * Ghi log
   */
  log(level, message, metadata = {}) {
    if (!this.logLevels.includes(level)) {
      level = 'info';
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
        ...metadata
      }
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Emit event
    this.emit('log', logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Ghi error log
   */
  error(message, error = null, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    };
    this.log('error', message, errorMetadata);
  }

  /**
   * Ghi warn log
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Ghi info log
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Ghi debug log
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  /**
   * Flush buffer to storage
   */
  async flushBuffer() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Save to Redis
      await this.saveToRedis(logsToFlush);

      // Save to file
      await this.saveToFile(logsToFlush);

      console.log(`📝 Flushed ${logsToFlush.length} log entries`);
    } catch (error) {
      console.error("Failed to flush logs:", error.message);
      // Put logs back in buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Save logs to Redis
   */
  async saveToRedis(logs) {
    const pipeline = redis.pipeline();

    for (const log of logs) {
      const key = `logs:${log.level}:${new Date().toISOString().split('T')[0]}`;
      pipeline.lpush(key, JSON.stringify(log));
      pipeline.expire(key, 7 * 24 * 60 * 60); // 7 days
    }

    await pipeline.exec();
  }

  /**
   * Save logs to file
   */
  async saveToFile(logs) {
    const logDir = path.join(process.cwd(), 'logs');
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `app-${today}.log`);

    try {
      const logContent = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.appendFile(logFile, logContent);
    } catch (error) {
      console.error("Failed to write to log file:", error.message);
    }
  }

  /**
   * Get logs from Redis
   */
  async getLogs(level = null, date = null, limit = 100) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const levels = level ? [level] : this.logLevels;
      const allLogs = [];

      for (const logLevel of levels) {
        const key = `logs:${logLevel}:${targetDate}`;
        const logs = await redis.lrange(key, 0, limit - 1);
        allLogs.push(...logs.map(log => JSON.parse(log)));
      }

      // Sort by timestamp
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allLogs.slice(0, limit);
    } catch (error) {
      console.error("Failed to get logs:", error.message);
      return [];
    }
  }

  /**
   * Search logs
   */
  async searchLogs(query, level = null, date = null, limit = 100) {
    try {
      const logs = await this.getLogs(level, date, limit * 2); // Get more to filter
      const filteredLogs = logs.filter(log => {
        const searchText = `${log.message} ${JSON.stringify(log.metadata)}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      return filteredLogs.slice(0, limit);
    } catch (error) {
      console.error("Failed to search logs:", error.message);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const stats = {
        date: targetDate,
        total: 0,
        byLevel: {},
        byHour: {},
        errors: 0,
        warnings: 0
      };

      for (const level of this.logLevels) {
        const key = `logs:${level}:${targetDate}`;
        const count = await redis.llen(key);
        stats.byLevel[level] = count;
        stats.total += count;

        if (level === 'error') stats.errors = count;
        if (level === 'warn') stats.warnings = count;
      }

      // Get hourly distribution
      const allLogs = await this.getLogs(null, targetDate, 1000);
      for (const log of allLogs) {
        const hour = new Date(log.timestamp).getHours();
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error("Failed to get log stats:", error.message);
      return null;
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(file => file.startsWith('app-') && file.endsWith('.log'));

      // Sort by date
      logFiles.sort();

      // Keep only recent files
      if (logFiles.length > this.maxLogFiles) {
        const filesToDelete = logFiles.slice(0, logFiles.length - this.maxLogFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(logDir, file));
          console.log(`🗑️ Deleted old log file: ${file}`);
        }
      }

      // Cleanup Redis logs older than 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(cutoffDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        for (const level of this.logLevels) {
          const key = `logs:${level}:${dateStr}`;
          await redis.del(key);
        }
      }

      console.log("🧹 Log cleanup completed");
    } catch (error) {
      console.error("Failed to cleanup logs:", error.message);
    }
  }

  /**
   * Get real-time logs
   */
  getRealTimeLogs(callback) {
    this.on('log', callback);
    
    return () => {
      this.off('log', callback);
    };
  }

  /**
   * Create log stream
   */
  createLogStream(level = null, date = null) {
    const logs = [];
    let isActive = true;

    const unsubscribe = this.getRealTimeLogs((log) => {
      if (!isActive) return;
      
      if (!level || log.level === level) {
        logs.push(log);
      }
    });

    return {
      logs,
      unsubscribe: () => {
        isActive = false;
        unsubscribe();
      }
    };
  }

  /**
   * Export logs
   */
  async exportLogs(level = null, date = null, format = 'json') {
    try {
      const logs = await this.getLogs(level, date, 10000);
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        const headers = ['timestamp', 'level', 'message', 'metadata'];
        const csvContent = [
          headers.join(','),
          ...logs.map(log => [
            log.timestamp,
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
            `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"`
          ].join(','))
        ].join('\n');
        return csvContent;
      }

      return logs;
    } catch (error) {
      console.error("Failed to export logs:", error.message);
      return null;
    }
  }

  /**
   * Get system health from logs
   */
  async getSystemHealth() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await this.getLogStats(today);
      
      if (!stats) {
        return { status: 'unknown', message: 'Unable to get log statistics' };
      }

      const errorRate = stats.total > 0 ? (stats.errors / stats.total) * 100 : 0;
      const warningRate = stats.total > 0 ? (stats.warnings / stats.total) * 100 : 0;

      let status = 'healthy';
      let message = 'System is running normally';

      if (errorRate > 10) {
        status = 'critical';
        message = `High error rate: ${errorRate.toFixed(1)}%`;
      } else if (errorRate > 5) {
        status = 'warning';
        message = `Elevated error rate: ${errorRate.toFixed(1)}%`;
      } else if (warningRate > 20) {
        status = 'warning';
        message = `High warning rate: ${warningRate.toFixed(1)}%`;
      }

      return {
        status,
        message,
        stats: {
          totalLogs: stats.total,
          errorRate: errorRate.toFixed(1),
          warningRate: warningRate.toFixed(1),
          errors: stats.errors,
          warnings: stats.warnings
        }
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

export const logAggregationService = new LogAggregationService();
