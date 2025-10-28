import { redis } from "../redis.js";
import fs from "fs/promises";
import path from "path";

/**
 * Service quản lý môi trường và cấu hình
 */
class EnvironmentService {
  constructor() {
    this.environments = ['development', 'staging', 'production'];
    this.currentEnv = process.env.NODE_ENV || 'development';
    this.configCache = new Map();
  }

  /**
   * Khởi tạo environment
   */
  async initializeEnvironment() {
    try {
      // Load environment variables
      await this.loadEnvironmentVariables();
      
      // Validate required variables
      this.validateRequiredVariables();
      
      // Setup environment-specific configurations
      await this.setupEnvironmentConfig();
      
      console.log(`✅ Environment initialized: ${this.currentEnv}`);
      return true;
    } catch (error) {
      console.error(`❌ Environment initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Load environment variables từ file .env
   */
  async loadEnvironmentVariables() {
    const envFile = `.env.${this.currentEnv}`;
    const defaultEnvFile = '.env';
    
    try {
      // Try to load environment-specific file first
      if (await this.fileExists(envFile)) {
        await this.loadEnvFile(envFile);
      } else if (await this.fileExists(defaultEnvFile)) {
        await this.loadEnvFile(defaultEnvFile);
      }
    } catch (error) {
      console.warn(`Warning: Could not load environment file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load .env file
   */
  async loadEnvFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }

  /**
   * Validate required environment variables
   */
  validateRequiredVariables() {
    const requiredVars = [
      'JWT_SECRET',
      'REDIS_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Setup environment-specific configuration
   */
  async setupEnvironmentConfig() {
    const config = {
      development: {
        logLevel: 'debug',
        corsOrigin: ['http://localhost:3000', 'http://localhost:5173'],
        rateLimit: { windowMs: 15 * 60 * 1000, max: 1000 },
        redis: { retryDelayOnFailover: 100, maxRetriesPerRequest: 3 }
      },
      staging: {
        logLevel: 'info',
        corsOrigin: ['https://staging.yourdomain.com'],
        rateLimit: { windowMs: 15 * 60 * 1000, max: 500 },
        redis: { retryDelayOnFailover: 200, maxRetriesPerRequest: 5 }
      },
      production: {
        logLevel: 'warn',
        corsOrigin: ['https://yourdomain.com'],
        rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
        redis: { retryDelayOnFailover: 500, maxRetriesPerRequest: 10 }
      }
    };

    const envConfig = config[this.currentEnv] || config.development;
    
    // Store config in cache
    this.configCache.set('environment', envConfig);
    
    // Store in Redis for other services
    await redis.hset('config:environment', {
      current: this.currentEnv,
      config: JSON.stringify(envConfig),
      lastUpdate: Date.now()
    });
  }

  /**
   * Get environment configuration
   */
  getEnvironmentConfig() {
    return this.configCache.get('environment') || {};
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment() {
    return this.currentEnv;
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.currentEnv === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.currentEnv === 'development';
  }

  /**
   * Get environment-specific database configuration
   */
  getDatabaseConfig() {
    const baseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tiktok_bot',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    if (this.isProduction()) {
      return {
        ...baseConfig,
        ssl: { rejectUnauthorized: false },
        pool: { min: 2, max: 10 }
      };
    }

    return baseConfig;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    const baseConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0
    };

    const envConfig = this.getEnvironmentConfig();
    
    return {
      ...baseConfig,
      ...envConfig.redis
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    const envConfig = this.getEnvironmentConfig();
    
    return {
      level: envConfig.logLevel || 'info',
      format: this.isProduction() ? 'json' : 'pretty',
      file: this.isProduction() ? './logs/app.log' : null,
      maxFiles: this.isProduction() ? 5 : 1,
      maxSize: this.isProduction() ? '10m' : '5m'
    };
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    const envConfig = this.getEnvironmentConfig();
    
    return {
      origin: envConfig.corsOrigin || ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    const envConfig = this.getEnvironmentConfig();
    
    return envConfig.rateLimit || {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    };
  }

  /**
   * Update environment configuration
   */
  async updateEnvironmentConfig(updates) {
    try {
      const currentConfig = this.getEnvironmentConfig();
      const newConfig = { ...currentConfig, ...updates };
      
      // Update cache
      this.configCache.set('environment', newConfig);
      
      // Update Redis
      await redis.hset('config:environment', {
        current: this.currentEnv,
        config: JSON.stringify(newConfig),
        lastUpdate: Date.now()
      });
      
      return { success: true, config: newConfig };
    } catch (error) {
      throw new Error(`Failed to update environment config: ${error.message}`);
    }
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      environment: this.currentEnv,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for environment
   */
  async healthCheck() {
    try {
      const systemInfo = this.getSystemInfo();
      const redisConfig = this.getRedisConfig();
      
      // Test Redis connection
      await redis.ping();
      
      return {
        status: 'healthy',
        environment: this.currentEnv,
        system: systemInfo,
        redis: { status: 'connected', config: redisConfig },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        environment: this.currentEnv,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Switch environment (for testing)
   */
  async switchEnvironment(newEnv) {
    if (!this.environments.includes(newEnv)) {
      throw new Error(`Invalid environment: ${newEnv}`);
    }
    
    this.currentEnv = newEnv;
    await this.initializeEnvironment();
    
    return { success: true, environment: newEnv };
  }

  /**
   * Get environment variables (sanitized)
   */
  getEnvironmentVariables() {
    const sanitized = {};
    const allowedVars = [
      'NODE_ENV',
      'PORT',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'REDIS_URL',
      'JWT_SECRET' // Only show if not production
    ];
    
    for (const varName of allowedVars) {
      if (process.env[varName]) {
        if (varName === 'JWT_SECRET' && this.isProduction()) {
          sanitized[varName] = '***hidden***';
        } else {
          sanitized[varName] = process.env[varName];
        }
      }
    }
    
    return sanitized;
  }
}

export const environmentService = new EnvironmentService();
