import { redis } from "../redis.js";
import crypto from "crypto";
import QRCode from "qrcode";

/**
 * Service quản lý Two-Factor Authentication (2FA)
 */
class TwoFactorService {
  constructor() {
    this.issuer = "TikTok Bot";
    this.algorithm = "sha1";
    this.digits = 6;
    this.period = 30; // 30 giây
  }

  /**
   * Tạo secret key cho user
   */
  generateSecret(username) {
    const secret = crypto.randomBytes(20).toString('base32');
    const key = `2fa:secret:${username}`;
    
    // Lưu secret vào Redis với TTL 10 phút
    redis.setex(key, 600, secret);
    
    return secret;
  }

  /**
   * Tạo QR code cho Google Authenticator
   */
  async generateQRCode(username, secret) {
    const otpauth = `otpauth://totp/${this.issuer}:${username}?secret=${secret}&issuer=${this.issuer}&algorithm=${this.algorithm}&digits=${this.digits}&period=${this.period}`;
    
    try {
      const qrCodeUrl = await QRCode.toDataURL(otpauth);
      return qrCodeUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Tạo TOTP code
   */
  generateTOTP(secret) {
    const key = Buffer.from(secret, 'base32');
    const epoch = Math.round(Date.now() / 1000.0);
    const time = Math.floor(epoch / this.period);
    
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);
    
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    
    return (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
  }

  /**
   * Xác thực TOTP code
   */
  verifyTOTP(secret, token) {
    const expectedToken = this.generateTOTP(secret);
    return token === expectedToken;
  }

  /**
   * Thiết lập 2FA cho user
   */
  async setup2FA(username) {
    try {
      // Kiểm tra xem user đã có 2FA chưa
      const existingSecret = await redis.get(`2fa:enabled:${username}`);
      if (existingSecret) {
        throw new Error("2FA already enabled for this user");
      }

      // Tạo secret mới
      const secret = this.generateSecret(username);
      
      // Tạo QR code
      const qrCodeUrl = await this.generateQRCode(username, secret);
      
      return {
        secret,
        qrCodeUrl,
        manualEntryKey: secret
      };
    } catch (error) {
      throw new Error(`Failed to setup 2FA: ${error.message}`);
    }
  }

  /**
   * Xác nhận và kích hoạt 2FA
   */
  async confirm2FA(username, token) {
    try {
      // Lấy secret từ Redis
      const secret = await redis.get(`2fa:secret:${username}`);
      if (!secret) {
        throw new Error("No 2FA setup found. Please setup 2FA first.");
      }

      // Xác thực token
      if (!this.verifyTOTP(secret, token)) {
        throw new Error("Invalid 2FA token");
      }

      // Lưu secret đã xác nhận
      await redis.set(`2fa:enabled:${username}`, secret);
      
      // Xóa secret tạm thời
      await redis.del(`2fa:secret:${username}`);
      
      // Lưu backup codes
      const backupCodes = this.generateBackupCodes();
      await redis.set(`2fa:backup:${username}`, JSON.stringify(backupCodes));
      
      return {
        success: true,
        backupCodes
      };
    } catch (error) {
      throw new Error(`Failed to confirm 2FA: ${error.message}`);
    }
  }

  /**
   * Tạo backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Xác thực 2FA cho login
   */
  async verify2FA(username, token) {
    try {
      // Kiểm tra xem user có bật 2FA không
      const secret = await redis.get(`2fa:enabled:${username}`);
      if (!secret) {
        return { success: true, message: "2FA not enabled" };
      }

      // Kiểm tra backup codes trước
      const backupCodes = await redis.get(`2fa:backup:${username}`);
      if (backupCodes) {
        const codes = JSON.parse(backupCodes);
        const backupIndex = codes.indexOf(token);
        if (backupIndex !== -1) {
          // Xóa backup code đã sử dụng
          codes.splice(backupIndex, 1);
          await redis.set(`2fa:backup:${username}`, JSON.stringify(codes));
          return { success: true, message: "Backup code used" };
        }
      }

      // Xác thực TOTP
      if (this.verifyTOTP(secret, token)) {
        return { success: true, message: "2FA verified" };
      } else {
        return { success: false, message: "Invalid 2FA token" };
      }
    } catch (error) {
      throw new Error(`Failed to verify 2FA: ${error.message}`);
    }
  }

  /**
   * Tắt 2FA
   */
  async disable2FA(username, token) {
    try {
      // Xác thực token trước khi tắt
      const verification = await this.verify2FA(username, token);
      if (!verification.success) {
        throw new Error("Invalid 2FA token");
      }

      // Xóa tất cả dữ liệu 2FA
      await redis.del(`2fa:enabled:${username}`);
      await redis.del(`2fa:backup:${username}`);
      await redis.del(`2fa:secret:${username}`);
      
      return { success: true, message: "2FA disabled successfully" };
    } catch (error) {
      throw new Error(`Failed to disable 2FA: ${error.message}`);
    }
  }

  /**
   * Kiểm tra trạng thái 2FA
   */
  async get2FAStatus(username) {
    try {
      const isEnabled = await redis.exists(`2fa:enabled:${username}`);
      const backupCodes = await redis.get(`2fa:backup:${username}`);
      
      return {
        enabled: isEnabled === 1,
        hasBackupCodes: !!backupCodes,
        backupCodesCount: backupCodes ? JSON.parse(backupCodes).length : 0
      };
    } catch (error) {
      throw new Error(`Failed to get 2FA status: ${error.message}`);
    }
  }

  /**
   * Tạo lại backup codes
   */
  async regenerateBackupCodes(username, token) {
    try {
      // Xác thực token trước
      const verification = await this.verify2FA(username, token);
      if (!verification.success) {
        throw new Error("Invalid 2FA token");
      }

      // Tạo backup codes mới
      const backupCodes = this.generateBackupCodes();
      await redis.set(`2fa:backup:${username}`, JSON.stringify(backupCodes));
      
      return {
        success: true,
        backupCodes
      };
    } catch (error) {
      throw new Error(`Failed to regenerate backup codes: ${error.message}`);
    }
  }

  /**
   * Middleware để yêu cầu 2FA
   */
  require2FA() {
    return async (req, res, next) => {
      try {
        const username = req.user?.username;
        if (!username) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const status = await this.get2FAStatus(username);
        if (!status.enabled) {
          return res.status(403).json({ 
            error: "2FA required", 
            message: "Two-factor authentication is required for this action" 
          });
        }

        req.twoFactorRequired = true;
        next();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }
}

export const twoFactorService = new TwoFactorService();
