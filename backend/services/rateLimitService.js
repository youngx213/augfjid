import { redis } from "../redis.js";

/**
 * Service quản lý rate limiting để tránh spam và bảo vệ API
 */
class RateLimitService {
  constructor() {
    this.defaultLimits = {
      // API endpoints
      'api:auth:login': { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
      'api:auth:register': { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
      'api:accounts:create': { requests: 10, window: 60 * 60 * 1000 }, // 10 requests per hour
      'api:accounts:start': { requests: 20, window: 60 * 60 * 1000 }, // 20 requests per hour
      'api:presets:create': { requests: 50, window: 60 * 60 * 1000 }, // 50 requests per hour
      
      // Bot operations
      'bot:gift:process': { requests: 100, window: 60 * 1000 }, // 100 gifts per minute
      'bot:command:execute': { requests: 200, window: 60 * 1000 }, // 200 commands per minute
      'bot:queue:add': { requests: 50, window: 60 * 1000 }, // 50 queue items per minute
      
      // WebSocket events
      'ws:join': { requests: 10, window: 60 * 1000 }, // 10 joins per minute
      'ws:message': { requests: 100, window: 60 * 1000 }, // 100 messages per minute
    };
  }

  /**
   * Kiểm tra rate limit cho một key
   */
  async checkRateLimit(key, customLimit = null) {
    const limit = customLimit || this.defaultLimits[key];
    if (!limit) {
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    const now = Date.now();
    const windowStart = now - limit.window;
    const redisKey = `rate_limit:${key}`;

    try {
      // Lấy tất cả timestamps trong window
      const timestamps = await redis.zrangebyscore(redisKey, windowStart, '+inf');
      
      // Nếu chưa đạt limit
      if (timestamps.length < limit.requests) {
        // Thêm timestamp hiện tại
        await redis.zadd(redisKey, now, now);
        await redis.expire(redisKey, Math.ceil(limit.window / 1000));
        
        return {
          allowed: true,
          remaining: limit.requests - timestamps.length - 1,
          resetTime: now + limit.window,
          limit: limit.requests
        };
      } else {
        // Đã đạt limit
        const oldestTimestamp = timestamps[0];
        const resetTime = parseInt(oldestTimestamp) + limit.window;
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: resetTime,
          limit: limit.requests,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Nếu có lỗi, cho phép request để tránh block user
      return { allowed: true, remaining: Infinity, resetTime: null, error: error.message };
    }
  }

  /**
   * Kiểm tra rate limit cho user
   */
  async checkUserRateLimit(userId, action, customLimit = null) {
    const key = `user:${userId}:${action}`;
    return await this.checkRateLimit(key, customLimit);
  }

  /**
   * Kiểm tra rate limit cho IP
   */
  async checkIPRateLimit(ip, action, customLimit = null) {
    const key = `ip:${ip}:${action}`;
    return await this.checkRateLimit(key, customLimit);
  }

  /**
   * Kiểm tra rate limit cho account
   */
  async checkAccountRateLimit(accountId, action, customLimit = null) {
    const key = `account:${accountId}:${action}`;
    return await this.checkRateLimit(key, customLimit);
  }

  /**
   * Middleware cho Express
   */
  createMiddleware(action, customLimit = null) {
    return async (req, res, next) => {
      const userId = req.user?.id;
      const accountId = req.params?.accountId;
      const ip = req.ip || req.connection.remoteAddress;
      
      let rateLimitResult;
      
      // Ưu tiên check theo user, sau đó account, cuối cùng IP
      if (userId) {
        rateLimitResult = await this.checkUserRateLimit(userId, action, customLimit);
      } else if (accountId) {
        rateLimitResult = await this.checkAccountRateLimit(accountId, action, customLimit);
      } else {
        rateLimitResult = await this.checkIPRateLimit(ip, action, customLimit);
      }

      // Thêm rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimitResult.limit || 'N/A',
        'X-RateLimit-Remaining': rateLimitResult.remaining || 'N/A',
        'X-RateLimit-Reset': rateLimitResult.resetTime || 'N/A'
      });

      if (!rateLimitResult.allowed) {
        res.set('Retry-After', rateLimitResult.retryAfter || 60);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        });
      }

      next();
    };
  }

  /**
   * Middleware cho WebSocket
   */
  createWebSocketMiddleware(action, customLimit = null) {
    return async (socket, next) => {
      const userId = socket.userId;
      const ip = socket.handshake.address;
      
      let rateLimitResult;
      
      if (userId) {
        rateLimitResult = await this.checkUserRateLimit(userId, action, customLimit);
      } else {
        rateLimitResult = await this.checkIPRateLimit(ip, action, customLimit);
      }

      if (!rateLimitResult.allowed) {
        const error = new Error('Rate limit exceeded');
        error.data = {
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit
        };
        return next(error);
      }

      next();
    };
  }

  /**
   * Reset rate limit cho một key
   */
  async resetRateLimit(key) {
    const redisKey = `rate_limit:${key}`;
    await redis.del(redisKey);
  }

  /**
   * Reset rate limit cho user
   */
  async resetUserRateLimit(userId, action = null) {
    if (action) {
      await this.resetRateLimit(`user:${userId}:${action}`);
    } else {
      // Reset tất cả actions của user
      const pattern = `rate_limit:user:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  /**
   * Lấy thống kê rate limit
   */
  async getRateLimitStats(key) {
    const redisKey = `rate_limit:${key}`;
    const now = Date.now();
    
    try {
      const timestamps = await redis.zrangebyscore(redisKey, 0, '+inf');
      const limit = this.defaultLimits[key];
      
      if (!limit) {
        return { key, current: timestamps.length, limit: 'unlimited' };
      }

      const windowStart = now - limit.window;
      const recentTimestamps = timestamps.filter(ts => parseInt(ts) >= windowStart);
      
      return {
        key,
        current: recentTimestamps.length,
        limit: limit.requests,
        window: limit.window,
        remaining: Math.max(0, limit.requests - recentTimestamps.length),
        resetTime: recentTimestamps.length > 0 ? 
          parseInt(recentTimestamps[0]) + limit.window : null
      };
    } catch (error) {
      return { key, error: error.message };
    }
  }

  /**
   * Lấy tất cả rate limit stats
   */
  async getAllRateLimitStats() {
    const stats = {};
    for (const key of Object.keys(this.defaultLimits)) {
      stats[key] = await this.getRateLimitStats(key);
    }
    return stats;
  }

  /**
   * Tạo custom rate limit
   */
  createCustomLimit(requests, windowMs) {
    return { requests, window: windowMs };
  }

  /**
   * Kiểm tra và xử lý gift processing rate limit
   */
  async checkGiftProcessingLimit(accountId, giftValue = 1) {
    // Gift có giá trị cao hơn thì được ưu tiên
    const multiplier = Math.min(giftValue / 10, 5); // Tối đa 5x
    const customLimit = this.createCustomLimit(
      Math.floor(100 * multiplier), // 100-500 requests per minute
      60 * 1000 // 1 minute
    );
    
    return await this.checkAccountRateLimit(accountId, 'bot:gift:process', customLimit);
  }

  /**
   * Kiểm tra queue rate limit
   */
  async checkQueueLimit(accountId, queueSize = 1) {
    // Queue size lớn hơn thì cần rate limit chặt hơn
    const multiplier = Math.max(1, queueSize / 10);
    const customLimit = this.createCustomLimit(
      Math.floor(50 / multiplier), // 5-50 requests per minute
      60 * 1000 // 1 minute
    );
    
    return await this.checkAccountRateLimit(accountId, 'bot:queue:add', customLimit);
  }
}

export const rateLimitService = new RateLimitService();
