import { redis } from "../redis.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Service quản lý API Keys
 */
class APIKeyService {
  constructor() {
    this.keyPrefix = "api_key:";
    this.userKeysPrefix = "user_api_keys:";
    this.rateLimitPrefix = "api_rate_limit:";
  }

  /**
   * Tạo API key mới
   */
  generateAPIKey() {
    // Tạo key với format: tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const randomBytes = crypto.randomBytes(32);
    const key = `tk_${randomBytes.toString('hex')}`;
    return key;
  }

  /**
   * Tạo API key cho user
   */
  async createAPIKey(username, keyData = {}) {
    try {
      const {
        name = "Default API Key",
        description = "",
        permissions = ["read"],
        rateLimit = 1000, // requests per hour
        expiresAt = null,
        ipWhitelist = []
      } = keyData;

      const apiKey = this.generateAPIKey();
      const keyId = crypto.randomUUID();
      const createdAt = Date.now();

      const keyInfo = {
        id: keyId,
        key: apiKey,
        username,
        name,
        description,
        permissions: JSON.stringify(permissions),
        rateLimit,
        expiresAt,
        ipWhitelist: JSON.stringify(ipWhitelist),
        createdAt,
        lastUsed: null,
        usageCount: 0,
        isActive: true
      };

      // Lưu key info
      await redis.hset(`${this.keyPrefix}${apiKey}`, keyInfo);
      
      // Lưu danh sách keys của user
      await redis.sadd(`${this.userKeysPrefix}${username}`, keyId);
      await redis.hset(`${this.userKeysPrefix}${username}:${keyId}`, keyInfo);

      // Lưu rate limit info
      await redis.hset(`${this.rateLimitPrefix}${apiKey}`, {
        limit: rateLimit,
        window: 3600, // 1 hour
        current: 0,
        resetAt: Date.now() + 3600000
      });

      return {
        success: true,
        apiKey,
        keyInfo: {
          id: keyId,
          name,
          description,
          permissions,
          rateLimit,
          expiresAt,
          createdAt
        }
      };
    } catch (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Xác thực API key
   */
  async validateAPIKey(apiKey, requiredPermissions = []) {
    try {
      // Lấy thông tin key
      const keyInfo = await redis.hgetall(`${this.keyPrefix}${apiKey}`);
      if (!keyInfo || !keyInfo.id) {
        return { valid: false, error: "Invalid API key" };
      }

      // Kiểm tra trạng thái active
      if (keyInfo.isActive !== 'true') {
        return { valid: false, error: "API key is disabled" };
      }

      // Kiểm tra expiration
      if (keyInfo.expiresAt && parseInt(keyInfo.expiresAt) < Date.now()) {
        return { valid: false, error: "API key has expired" };
      }

      // Kiểm tra permissions
      const permissions = JSON.parse(keyInfo.permissions || '[]');
      const hasPermission = requiredPermissions.every(permission => 
        permissions.includes(permission) || permissions.includes('admin')
      );

      if (!hasPermission) {
        return { valid: false, error: "Insufficient permissions" };
      }

      // Cập nhật usage
      await this.updateKeyUsage(apiKey);

      return {
        valid: true,
        keyInfo: {
          id: keyInfo.id,
          username: keyInfo.username,
          name: keyInfo.name,
          permissions: permissions,
          rateLimit: parseInt(keyInfo.rateLimit)
        }
      };
    } catch (error) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * Cập nhật usage của API key
   */
  async updateKeyUsage(apiKey) {
    const now = Date.now();
    
    // Cập nhật lastUsed và usageCount
    await redis.hset(`${this.keyPrefix}${apiKey}`, {
      lastUsed: now,
      usageCount: await redis.hincrby(`${this.keyPrefix}${apiKey}`, 'usageCount', 1)
    });
  }

  /**
   * Kiểm tra rate limit
   */
  async checkRateLimit(apiKey) {
    try {
      const rateLimitInfo = await redis.hgetall(`${this.rateLimitPrefix}${apiKey}`);
      if (!rateLimitInfo || !rateLimitInfo.limit) {
        return { allowed: true, remaining: Infinity };
      }

      const limit = parseInt(rateLimitInfo.limit);
      const window = parseInt(rateLimitInfo.window);
      const resetAt = parseInt(rateLimitInfo.resetAt);
      const current = parseInt(rateLimitInfo.current) || 0;

      // Reset counter nếu đã hết window
      if (now > resetAt) {
        await redis.hset(`${this.rateLimitPrefix}${apiKey}`, {
          current: 1,
          resetAt: now + window
        });
        return { allowed: true, remaining: limit - 1, resetAt: now + window };
      }

      // Kiểm tra limit
      if (current >= limit) {
        return { 
          allowed: false, 
          remaining: 0, 
          resetAt,
          retryAfter: Math.ceil((resetAt - now) / 1000)
        };
      }

      // Tăng counter
      await redis.hincrby(`${this.rateLimitPrefix}${apiKey}`, 'current', 1);

      return { 
        allowed: true, 
        remaining: limit - current - 1, 
        resetAt 
      };
    } catch (error) {
      // Nếu có lỗi, cho phép request
      return { allowed: true, remaining: Infinity, error: error.message };
    }
  }

  /**
   * Lấy danh sách API keys của user
   */
  async getUserAPIKeys(username) {
    try {
      const keyIds = await redis.smembers(`${this.userKeysPrefix}${username}`);
      const keys = [];

      for (const keyId of keyIds) {
        const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
        if (keyInfo && keyInfo.id) {
          keys.push({
            id: keyInfo.id,
            name: keyInfo.name,
            description: keyInfo.description,
            permissions: JSON.parse(keyInfo.permissions || '[]'),
            rateLimit: parseInt(keyInfo.rateLimit),
            expiresAt: keyInfo.expiresAt,
            createdAt: keyInfo.createdAt,
            lastUsed: keyInfo.lastUsed,
            usageCount: parseInt(keyInfo.usageCount || 0),
            isActive: keyInfo.isActive === 'true'
          });
        }
      }

      return keys.sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
    } catch (error) {
      throw new Error(`Failed to get user API keys: ${error.message}`);
    }
  }

  /**
   * Cập nhật API key
   */
  async updateAPIKey(username, keyId, updates) {
    try {
      // Kiểm tra ownership
      const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
      if (!keyInfo || !keyInfo.id) {
        throw new Error("API key not found or access denied");
      }

      const allowedUpdates = ['name', 'description', 'permissions', 'rateLimit', 'expiresAt', 'ipWhitelist'];
      const updateData = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          if (key === 'permissions' || key === 'ipWhitelist') {
            updateData[key] = JSON.stringify(value);
          } else {
            updateData[key] = value;
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("No valid updates provided");
      }

      // Cập nhật key info
      await redis.hset(`${this.userKeysPrefix}${username}:${keyId}`, updateData);
      await redis.hset(`${this.keyPrefix}${keyInfo.key}`, updateData);

      // Cập nhật rate limit nếu có
      if (updates.rateLimit) {
        await redis.hset(`${this.rateLimitPrefix}${keyInfo.key}`, {
          limit: updates.rateLimit,
          window: 3600,
          current: 0,
          resetAt: Date.now() + 3600000
        });
      }

      return { success: true, message: "API key updated successfully" };
    } catch (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }
  }

  /**
   * Vô hiệu hóa API key
   */
  async disableAPIKey(username, keyId) {
    try {
      // Kiểm tra ownership
      const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
      if (!keyInfo || !keyInfo.id) {
        throw new Error("API key not found or access denied");
      }

      // Vô hiệu hóa key
      await redis.hset(`${this.userKeysPrefix}${username}:${keyId}`, 'isActive', 'false');
      await redis.hset(`${this.keyPrefix}${keyInfo.key}`, 'isActive', 'false');

      return { success: true, message: "API key disabled successfully" };
    } catch (error) {
      throw new Error(`Failed to disable API key: ${error.message}`);
    }
  }

  /**
   * Kích hoạt API key
   */
  async enableAPIKey(username, keyId) {
    try {
      // Kiểm tra ownership
      const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
      if (!keyInfo || !keyInfo.id) {
        throw new Error("API key not found or access denied");
      }

      // Kích hoạt key
      await redis.hset(`${this.userKeysPrefix}${username}:${keyId}`, 'isActive', 'true');
      await redis.hset(`${this.keyPrefix}${keyInfo.key}`, 'isActive', 'true');

      return { success: true, message: "API key enabled successfully" };
    } catch (error) {
      throw new Error(`Failed to enable API key: ${error.message}`);
    }
  }

  /**
   * Xóa API key
   */
  async deleteAPIKey(username, keyId) {
    try {
      // Kiểm tra ownership
      const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
      if (!keyInfo || !keyInfo.id) {
        throw new Error("API key not found or access denied");
      }

      // Xóa key
      await redis.del(`${this.userKeysPrefix}${username}:${keyId}`);
      await redis.del(`${this.keyPrefix}${keyInfo.key}`);
      await redis.del(`${this.rateLimitPrefix}${keyInfo.key}`);
      await redis.srem(`${this.userKeysPrefix}${username}`, keyId);

      return { success: true, message: "API key deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê usage của API key
   */
  async getAPIKeyStats(username, keyId) {
    try {
      // Kiểm tra ownership
      const keyInfo = await redis.hgetall(`${this.userKeysPrefix}${username}:${keyId}`);
      if (!keyInfo || !keyInfo.id) {
        throw new Error("API key not found or access denied");
      }

      const rateLimitInfo = await redis.hgetall(`${this.rateLimitPrefix}${keyInfo.key}`);
      
      return {
        id: keyInfo.id,
        name: keyInfo.name,
        usageCount: parseInt(keyInfo.usageCount || 0),
        lastUsed: keyInfo.lastUsed,
        rateLimit: parseInt(keyInfo.rateLimit),
        currentUsage: parseInt(rateLimitInfo.current || 0),
        resetAt: rateLimitInfo.resetAt,
        isActive: keyInfo.isActive === 'true'
      };
    } catch (error) {
      throw new Error(`Failed to get API key stats: ${error.message}`);
    }
  }

  /**
   * Middleware để xác thực API key
   */
  createAPIKeyMiddleware(requiredPermissions = []) {
    return async (req, res, next) => {
      try {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
          return res.status(401).json({ error: "API key required" });
        }

        // Xác thực API key
        const validation = await this.validateAPIKey(apiKey, requiredPermissions);
        if (!validation.valid) {
          return res.status(401).json({ error: validation.error });
        }

        // Kiểm tra rate limit
        const rateLimit = await this.checkRateLimit(apiKey);
        if (!rateLimit.allowed) {
          res.set('Retry-After', rateLimit.retryAfter);
          return res.status(429).json({ 
            error: "Rate limit exceeded",
            retryAfter: rateLimit.retryAfter
          });
        }

        // Thêm thông tin vào request
        req.apiKey = validation.keyInfo;
        req.rateLimit = rateLimit;

        // Thêm rate limit headers
        res.set({
          'X-RateLimit-Limit': validation.keyInfo.rateLimit,
          'X-RateLimit-Remaining': rateLimit.remaining,
          'X-RateLimit-Reset': rateLimit.resetAt
        });

        next();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }
}

export const apiKeyService = new APIKeyService();
