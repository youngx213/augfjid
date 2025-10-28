import { redis } from "../redis.js";
import EventEmitter from "events";
import { spawn } from "child_process";

/**
 * Service tự động khởi động lại khi có lỗi
 */
class AutoRestartService extends EventEmitter {
  constructor() {
    super();
    this.restartAttempts = new Map();
    this.maxRestartAttempts = 5;
    this.restartDelay = 5000; // 5 seconds
    this.maxRestartDelay = 60000; // 1 minute
    this.healthCheckInterval = 30000; // 30 seconds
    this.isMonitoring = false;
    this.processes = new Map();
  }

  /**
   * Bắt đầu monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log("Auto-restart service is already monitoring");
      return;
    }

    this.isMonitoring = true;
    console.log("🔄 Auto-restart service started monitoring");

    // Health check định kỳ
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    // Monitor process events
    this.setupProcessMonitoring();
  }

  /**
   * Dừng monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log("🛑 Auto-restart service stopped monitoring");

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Stop all monitored processes
    for (const [name, process] of this.processes) {
      this.stopProcess(name);
    }
  }

  /**
   * Thêm process để monitor
   */
  addProcess(name, command, args = [], options = {}) {
    const processInfo = {
      name,
      command,
      args,
      options: {
        cwd: process.cwd(),
        stdio: 'inherit',
        ...options
      },
      restartCount: 0,
      lastRestart: null,
      isRunning: false
    };

    this.processes.set(name, processInfo);
    console.log(`📝 Added process to monitor: ${name}`);
  }

  /**
   * Khởi động process
   */
  startProcess(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      throw new Error(`Process not found: ${name}`);
    }

    if (processInfo.isRunning) {
      console.log(`Process ${name} is already running`);
      return;
    }

    try {
      console.log(`🚀 Starting process: ${name}`);
      
      const childProcess = spawn(processInfo.command, processInfo.args, processInfo.options);
      
      processInfo.childProcess = childProcess;
      processInfo.isRunning = true;
      processInfo.startTime = Date.now();

      // Handle process events
      childProcess.on('exit', (code, signal) => {
        this.handleProcessExit(name, code, signal);
      });

      childProcess.on('error', (error) => {
        this.handleProcessError(name, error);
      });

      this.emit('process:started', { name, pid: childProcess.pid });
      console.log(`✅ Process ${name} started with PID: ${childProcess.pid}`);

    } catch (error) {
      console.error(`❌ Failed to start process ${name}:`, error.message);
      this.handleProcessError(name, error);
    }
  }

  /**
   * Dừng process
   */
  stopProcess(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo || !processInfo.isRunning) {
      return;
    }

    try {
      console.log(`🛑 Stopping process: ${name}`);
      
      if (processInfo.childProcess) {
        processInfo.childProcess.kill('SIGTERM');
        
        // Force kill after 10 seconds
        setTimeout(() => {
          if (processInfo.isRunning) {
            processInfo.childProcess.kill('SIGKILL');
          }
        }, 10000);
      }

      processInfo.isRunning = false;
      this.emit('process:stopped', { name });

    } catch (error) {
      console.error(`❌ Failed to stop process ${name}:`, error.message);
    }
  }

  /**
   * Restart process
   */
  restartProcess(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      throw new Error(`Process not found: ${name}`);
    }

    console.log(`🔄 Restarting process: ${name}`);
    
    // Stop first
    this.stopProcess(name);
    
    // Wait a bit then start
    setTimeout(() => {
      this.startProcess(name);
    }, 2000);
  }

  /**
   * Handle process exit
   */
  handleProcessExit(name, code, signal) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      return;
    }

    processInfo.isRunning = false;
    processInfo.exitCode = code;
    processInfo.exitSignal = signal;

    console.log(`📤 Process ${name} exited with code: ${code}, signal: ${signal}`);

    this.emit('process:exited', { name, code, signal });

    // Auto-restart if not intentional
    if (code !== 0 && signal !== 'SIGTERM') {
      this.scheduleRestart(name);
    }
  }

  /**
   * Handle process error
   */
  handleProcessError(name, error) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      return;
    }

    processInfo.isRunning = false;
    processInfo.lastError = error.message;

    console.error(`❌ Process ${name} error:`, error.message);

    this.emit('process:error', { name, error: error.message });

    // Schedule restart
    this.scheduleRestart(name);
  }

  /**
   * Schedule restart for process
   */
  scheduleRestart(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      return;
    }

    // Check restart limit
    if (processInfo.restartCount >= this.maxRestartAttempts) {
      console.error(`❌ Process ${name} has exceeded maximum restart attempts (${this.maxRestartAttempts})`);
      this.emit('process:maxRestartsReached', { name, restartCount: processInfo.restartCount });
      return;
    }

    // Calculate delay (exponential backoff)
    const delay = Math.min(
      this.restartDelay * Math.pow(2, processInfo.restartCount),
      this.maxRestartDelay
    );

    console.log(`⏰ Scheduling restart for ${name} in ${delay}ms (attempt ${processInfo.restartCount + 1})`);

    setTimeout(() => {
      this.performRestart(name);
    }, delay);
  }

  /**
   * Perform restart
   */
  performRestart(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      return;
    }

    processInfo.restartCount++;
    processInfo.lastRestart = Date.now();

    console.log(`🔄 Restarting process ${name} (attempt ${processInfo.restartCount})`);

    this.emit('process:restarting', { 
      name, 
      attempt: processInfo.restartCount,
      maxAttempts: this.maxRestartAttempts
    });

    this.startProcess(name);
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    for (const [name, processInfo] of this.processes) {
      if (!processInfo.isRunning) {
        continue;
      }

      try {
        // Check if process is still alive
        if (processInfo.childProcess && processInfo.childProcess.killed) {
          console.log(`⚠️ Process ${name} appears to be dead, scheduling restart`);
          this.scheduleRestart(name);
          continue;
        }

        // Check uptime
        const uptime = Date.now() - processInfo.startTime;
        if (uptime > 24 * 60 * 60 * 1000) { // 24 hours
          console.log(`🔄 Process ${name} has been running for 24+ hours, restarting for stability`);
          this.restartProcess(name);
        }

        // Reset restart count if process has been stable
        if (processInfo.restartCount > 0 && uptime > 60 * 60 * 1000) { // 1 hour
          processInfo.restartCount = 0;
          console.log(`✅ Process ${name} has been stable, resetting restart count`);
        }

      } catch (error) {
        console.error(`❌ Health check failed for ${name}:`, error.message);
      }
    }
  }

  /**
   * Setup process monitoring
   */
  setupProcessMonitoring() {
    // Monitor main process
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.emit('system:uncaughtException', { error: error.message });
      
      // Schedule restart
      setTimeout(() => {
        process.exit(1);
      }, 5000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', reason);
      this.emit('system:unhandledRejection', { reason: reason.toString() });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully');
      this.stopMonitoring();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully');
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * Get process status
   */
  getProcessStatus(name) {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      return null;
    }

    return {
      name: processInfo.name,
      isRunning: processInfo.isRunning,
      restartCount: processInfo.restartCount,
      lastRestart: processInfo.lastRestart,
      startTime: processInfo.startTime,
      uptime: processInfo.startTime ? Date.now() - processInfo.startTime : 0,
      exitCode: processInfo.exitCode,
      exitSignal: processInfo.exitSignal,
      lastError: processInfo.lastError
    };
  }

  /**
   * Get all processes status
   */
  getAllProcessesStatus() {
    const status = {};
    for (const [name] of this.processes) {
      status[name] = this.getProcessStatus(name);
    }
    return status;
  }

  /**
   * Reset restart count for process
   */
  resetRestartCount(name) {
    const processInfo = this.processes.get(name);
    if (processInfo) {
      processInfo.restartCount = 0;
      console.log(`✅ Reset restart count for process: ${name}`);
    }
  }

  /**
   * Update restart configuration
   */
  updateRestartConfig(config) {
    if (config.maxRestartAttempts) {
      this.maxRestartAttempts = config.maxRestartAttempts;
    }
    if (config.restartDelay) {
      this.restartDelay = config.restartDelay;
    }
    if (config.maxRestartDelay) {
      this.maxRestartDelay = config.maxRestartDelay;
    }
    if (config.healthCheckInterval) {
      this.healthCheckInterval = config.healthCheckInterval;
    }

    console.log('✅ Restart configuration updated');
  }
}

export const autoRestartService = new AutoRestartService();
