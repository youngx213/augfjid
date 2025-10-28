import { redis } from "../redis.js";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import EventEmitter from "events";

/**
 * Service Backup Automation cho hệ thống
 */
class BackupService extends EventEmitter {
  constructor() {
    super();
    this.backupJobs = new Map();
    this.backupHistory = [];
    this.isRunning = false;
    this.schedules = new Map();
    this.initializeBackupTypes();
  }

  /**
   * Khởi tạo các loại backup
   */
  initializeBackupTypes() {
    this.backupTypes = {
      redis: {
        name: 'Redis Database',
        description: 'Backup Redis data to JSON files',
        enabled: true,
        schedule: '0 2 * * *', // Daily at 2 AM
        retention: 30, // Keep 30 days
        compression: true
      },
      files: {
        name: 'Application Files',
        description: 'Backup application source code and configs',
        enabled: true,
        schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
        retention: 12, // Keep 12 weeks
        compression: true
      },
      database: {
        name: 'Database',
        description: 'Backup database (if using external DB)',
        enabled: false,
        schedule: '0 1 * * *', // Daily at 1 AM
        retention: 30,
        compression: true
      },
      logs: {
        name: 'Log Files',
        description: 'Backup application logs',
        enabled: true,
        schedule: '0 4 * * *', // Daily at 4 AM
        retention: 7, // Keep 7 days
        compression: true
      }
    };
  }

  /**
   * Tạo backup job
   */
  async createBackupJob(backupType, options = {}) {
    try {
      const jobId = `backup_${backupType}_${Date.now()}`;
      const backupConfig = this.backupTypes[backupType];
      
      if (!backupConfig) {
        throw new Error(`Invalid backup type: ${backupType}`);
      }

      const job = {
        id: jobId,
        type: backupType,
        status: 'pending',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        options: {
          ...backupConfig,
          ...options
        },
        progress: 0,
        error: null,
        filePath: null,
        fileSize: 0,
        duration: 0
      };

      this.backupJobs.set(jobId, job);
      
      // Store in Redis
      await redis.hset(`backup:job:${jobId}`, job);
      
      this.emit('backup:created', job);
      return job;
    } catch (error) {
      console.error("Failed to create backup job:", error.message);
      throw error;
    }
  }

  /**
   * Thực hiện backup
   */
  async executeBackup(jobId) {
    try {
      const job = this.backupJobs.get(jobId);
      if (!job) {
        throw new Error(`Backup job not found: ${jobId}`);
      }

      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.progress = 0;
      
      await redis.hset(`backup:job:${jobId}`, job);
      this.emit('backup:started', job);

      const startTime = Date.now();
      let result;

      switch (job.type) {
        case 'redis':
          result = await this.backupRedis(job);
          break;
        case 'files':
          result = await this.backupFiles(job);
          break;
        case 'database':
          result = await this.backupDatabase(job);
          break;
        case 'logs':
          result = await this.backupLogs(job);
          break;
        default:
          throw new Error(`Unsupported backup type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress = 100;
      job.filePath = result.filePath;
      job.fileSize = result.fileSize;
      job.duration = Date.now() - startTime;

      await redis.hset(`backup:job:${jobId}`, job);
      
      // Add to history
      this.backupHistory.push({
        ...job,
        timestamp: new Date().toISOString()
      });

      this.emit('backup:completed', job);
      return job;
    } catch (error) {
      const job = this.backupJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
        await redis.hset(`backup:job:${jobId}`, job);
        this.emit('backup:failed', job);
      }
      throw error;
    }
  }

  /**
   * Backup Redis data
   */
  async backupRedis(job) {
    try {
      job.progress = 10;
      await this.updateJobProgress(job);

      const backupDir = path.join(process.cwd(), 'backups', 'redis');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `redis_backup_${timestamp}.json`;
      const filePath = path.join(backupDir, fileName);

      job.progress = 30;
      await this.updateJobProgress(job);

      // Get all Redis keys
      const keys = await redis.keys('*');
      const backupData = {};

      job.progress = 50;
      await this.updateJobProgress(job);

      // Export data
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const type = await redis.type(key);
        
        switch (type) {
          case 'string':
            backupData[key] = await redis.get(key);
            break;
          case 'hash':
            backupData[key] = await redis.hgetall(key);
            break;
          case 'list':
            backupData[key] = await redis.lrange(key, 0, -1);
            break;
          case 'set':
            backupData[key] = await redis.smembers(key);
            break;
          case 'zset':
            backupData[key] = await redis.zrange(key, 0, -1, 'WITHSCORES');
            break;
        }

        // Update progress
        if (i % 100 === 0) {
          job.progress = 50 + (i / keys.length) * 30;
          await this.updateJobProgress(job);
        }
      }

      job.progress = 80;
      await this.updateJobProgress(job);

      // Write to file
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

      // Compress if enabled
      let finalPath = filePath;
      if (job.options.compression) {
        finalPath = await this.compressFile(filePath);
        await fs.unlink(filePath); // Remove uncompressed file
      }

      job.progress = 100;
      await this.updateJobProgress(job);

      const stats = await fs.stat(finalPath);
      return {
        filePath: finalPath,
        fileSize: stats.size
      };
    } catch (error) {
      console.error("Redis backup failed:", error.message);
      throw error;
    }
  }

  /**
   * Backup application files
   */
  async backupFiles(job) {
    try {
      job.progress = 10;
      await this.updateJobProgress(job);

      const backupDir = path.join(process.cwd(), 'backups', 'files');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `files_backup_${timestamp}.tar.gz`;
      const filePath = path.join(backupDir, fileName);

      job.progress = 30;
      await this.updateJobProgress(job);

      // Create tar.gz archive
      await this.createTarArchive(process.cwd(), filePath, [
        '--exclude=node_modules',
        '--exclude=.git',
        '--exclude=backups',
        '--exclude=logs',
        '--exclude=*.log'
      ]);

      job.progress = 100;
      await this.updateJobProgress(job);

      const stats = await fs.stat(filePath);
      return {
        filePath: filePath,
        fileSize: stats.size
      };
    } catch (error) {
      console.error("Files backup failed:", error.message);
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backupDatabase(job) {
    try {
      job.progress = 10;
      await this.updateJobProgress(job);

      const backupDir = path.join(process.cwd(), 'backups', 'database');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `database_backup_${timestamp}.sql`;
      const filePath = path.join(backupDir, fileName);

      job.progress = 30;
      await this.updateJobProgress(job);

      // This would be implemented based on your database type
      // For now, we'll create a placeholder
      await fs.writeFile(filePath, '-- Database backup placeholder\n-- Implement based on your database type');

      job.progress = 100;
      await this.updateJobProgress(job);

      const stats = await fs.stat(filePath);
      return {
        filePath: filePath,
        fileSize: stats.size
      };
    } catch (error) {
      console.error("Database backup failed:", error.message);
      throw error;
    }
  }

  /**
   * Backup log files
   */
  async backupLogs(job) {
    try {
      job.progress = 10;
      await this.updateJobProgress(job);

      const backupDir = path.join(process.cwd(), 'backups', 'logs');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `logs_backup_${timestamp}.tar.gz`;
      const filePath = path.join(backupDir, fileName);

      job.progress = 30;
      await this.updateJobProgress(job);

      const logsDir = path.join(process.cwd(), 'logs');
      
      // Check if logs directory exists
      try {
        await fs.access(logsDir);
      } catch {
        // Create empty logs directory if it doesn't exist
        await fs.mkdir(logsDir, { recursive: true });
        await fs.writeFile(path.join(logsDir, 'empty.txt'), 'No logs available');
      }

      // Create tar.gz archive of logs
      await this.createTarArchive(logsDir, filePath);

      job.progress = 100;
      await this.updateJobProgress(job);

      const stats = await fs.stat(filePath);
      return {
        filePath: filePath,
        fileSize: stats.size
      };
    } catch (error) {
      console.error("Logs backup failed:", error.message);
      throw error;
    }
  }

  /**
   * Tạo tar archive
   */
  async createTarArchive(sourceDir, outputPath, excludeArgs = []) {
    return new Promise((resolve, reject) => {
      const args = ['-czf', outputPath, ...excludeArgs, '-C', sourceDir, '.'];
      const tar = spawn('tar', args);

      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tar command failed with code ${code}`));
        }
      });

      tar.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Nén file
   */
  async compressFile(filePath) {
    const compressedPath = filePath + '.gz';
    
    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-c', filePath]);
      const writeStream = require('fs').createWriteStream(compressedPath);

      gzip.stdout.pipe(writeStream);

      gzip.on('close', (code) => {
        if (code === 0) {
          resolve(compressedPath);
        } else {
          reject(new Error(`Gzip command failed with code ${code}`));
        }
      });

      gzip.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Cập nhật tiến trình job
   */
  async updateJobProgress(job) {
    await redis.hset(`backup:job:${job.id}`, job);
    this.emit('backup:progress', job);
  }

  /**
   * Lên lịch backup tự động
   */
  async scheduleBackup(backupType, cronExpression) {
    try {
      const schedule = {
        type: backupType,
        cron: cronExpression,
        enabled: true,
        lastRun: null,
        nextRun: this.calculateNextRun(cronExpression),
        createdAt: new Date().toISOString()
      };

      this.schedules.set(backupType, schedule);
      await redis.hset(`backup:schedule:${backupType}`, schedule);
      
      this.emit('backup:scheduled', schedule);
      return schedule;
    } catch (error) {
      console.error("Failed to schedule backup:", error.message);
      throw error;
    }
  }

  /**
   * Tính toán lần chạy tiếp theo
   */
  calculateNextRun(cronExpression) {
    // Simplified cron calculation - in production, use a proper cron library
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to next day
    return nextRun.toISOString();
  }

  /**
   * Chạy backup theo lịch
   */
  async runScheduledBackups() {
    try {
      const now = new Date();
      
      for (const [type, schedule] of this.schedules) {
        if (!schedule.enabled) continue;
        
        const nextRun = new Date(schedule.nextRun);
        if (now >= nextRun) {
          console.log(`Running scheduled backup for ${type}`);
          
          const job = await this.createBackupJob(type);
          await this.executeBackup(job.id);
          
          // Update schedule
          schedule.lastRun = now.toISOString();
          schedule.nextRun = this.calculateNextRun(schedule.cron);
          await redis.hset(`backup:schedule:${type}`, schedule);
        }
      }
    } catch (error) {
      console.error("Failed to run scheduled backups:", error.message);
    }
  }

  /**
   * Dọn dẹp backup cũ
   */
  async cleanupOldBackups() {
    try {
      for (const [type, config] of Object.entries(this.backupTypes)) {
        if (!config.enabled) continue;
        
        const backupDir = path.join(process.cwd(), 'backups', type);
        
        try {
          const files = await fs.readdir(backupDir);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - config.retention);
          
          for (const file of files) {
            const filePath = path.join(backupDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              console.log(`Deleted old backup: ${file}`);
            }
          }
        } catch (error) {
          // Directory might not exist
          console.log(`Backup directory not found: ${backupDir}`);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old backups:", error.message);
    }
  }

  /**
   * Khôi phục từ backup
   */
  async restoreFromBackup(backupPath, backupType) {
    try {
      console.log(`Restoring from backup: ${backupPath}`);
      
      switch (backupType) {
        case 'redis':
          await this.restoreRedis(backupPath);
          break;
        case 'files':
          await this.restoreFiles(backupPath);
          break;
        case 'database':
          await this.restoreDatabase(backupPath);
          break;
        case 'logs':
          await this.restoreLogs(backupPath);
          break;
        default:
          throw new Error(`Unsupported restore type: ${backupType}`);
      }
      
      this.emit('backup:restored', { backupPath, backupType });
      return { success: true, message: 'Backup restored successfully' };
    } catch (error) {
      console.error("Failed to restore backup:", error.message);
      throw error;
    }
  }

  /**
   * Khôi phục Redis
   */
  async restoreRedis(backupPath) {
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    
    // Clear existing data
    await redis.flushall();
    
    // Restore data
    for (const [key, value] of Object.entries(backupData)) {
      if (typeof value === 'string') {
        await redis.set(key, value);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        await redis.hset(key, value);
      } else if (Array.isArray(value)) {
        await redis.lpush(key, ...value);
      }
    }
  }

  /**
   * Khôi phục files
   */
  async restoreFiles(backupPath) {
    const extractDir = path.join(process.cwd(), 'restored_files');
    await fs.mkdir(extractDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', backupPath, '-C', extractDir]);
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tar extract failed with code ${code}`));
        }
      });
      
      tar.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Khôi phục database
   */
  async restoreDatabase(backupPath) {
    // Implement based on your database type
    console.log(`Database restore from ${backupPath} - implement based on your database`);
  }

  /**
   * Khôi phục logs
   */
  async restoreLogs(backupPath) {
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', backupPath, '-C', logsDir]);
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tar extract failed with code ${code}`));
        }
      });
      
      tar.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Lấy danh sách backup jobs
   */
  getBackupJobs() {
    return Array.from(this.backupJobs.values());
  }

  /**
   * Lấy backup history
   */
  getBackupHistory() {
    return this.backupHistory;
  }

  /**
   * Lấy backup schedules
   */
  getBackupSchedules() {
    return Array.from(this.schedules.values());
  }

  /**
   * Lấy backup statistics
   */
  getBackupStats() {
    const jobs = this.getBackupJobs();
    const history = this.getBackupHistory();
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      totalBackups: history.length,
      totalSize: history.reduce((sum, backup) => sum + (backup.fileSize || 0), 0),
      lastBackup: history.length > 0 ? history[history.length - 1].timestamp : null
    };
  }

  /**
   * Bắt đầu monitoring
   */
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Run scheduled backups every hour
    this.scheduleInterval = setInterval(() => {
      this.runScheduledBackups();
    }, 60 * 60 * 1000);
    
    // Cleanup old backups daily
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldBackups();
    }, 24 * 60 * 60 * 1000);
    
    console.log("✅ Backup service monitoring started");
  }

  /**
   * Dừng monitoring
   */
  stopMonitoring() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.isRunning = false;
    console.log("🛑 Backup service monitoring stopped");
  }
}

export const backupService = new BackupService();
