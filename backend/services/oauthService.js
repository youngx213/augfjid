import { redis } from "../redis.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Service quản lý OAuth integration
 */
class OAuthService {
  constructor() {
    this.providers = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/oauth/google/callback',
        scope: 'openid email profile',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/oauth/facebook/callback',
        scope: 'email,public_profile',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfoUrl: 'https://graph.facebook.com/v18.0/me'
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/oauth/discord/callback',
        scope: 'identify email',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me'
      }
    };
  }

  /**
   * Tạo state parameter để bảo mật OAuth flow
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Lưu state vào Redis
   */
  async saveState(state, provider) {
    const key = `oauth:state:${state}`;
    await redis.setex(key, 600, JSON.stringify({ provider, timestamp: Date.now() })); // 10 phút
  }

  /**
   * Xác thực state
   */
  async verifyState(state) {
    const key = `oauth:state:${state}`;
    const data = await redis.get(key);
    if (!data) {
      throw new Error("Invalid or expired state");
    }
    
    await redis.del(key); // Xóa state sau khi sử dụng
    return JSON.parse(data);
  }

  /**
   * Tạo OAuth URL
   */
  generateAuthUrl(provider) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const state = this.generateState();
    this.saveState(state, provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state
    });

    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    return {
      url: `${config.authUrl}?${params.toString()}`,
      state
    };
  }

  /**
   * Lấy access token từ authorization code
   */
  async getAccessToken(provider, code) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const tokenData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code: code
    };

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const token = await response.json();
      return token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  /**
   * Lấy thông tin user từ access token
   */
  async getUserInfo(provider, accessToken) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      let url = config.userInfoUrl;
      let headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };

      // Facebook cần thêm fields
      if (provider === 'facebook') {
        url += '?fields=id,name,email,picture';
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`User info request failed: ${response.statusText}`);
      }

      const userInfo = await response.json();
      return this.normalizeUserInfo(provider, userInfo);
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Chuẩn hóa thông tin user từ các provider khác nhau
   */
  normalizeUserInfo(provider, userInfo) {
    const normalized = {
      provider,
      providerId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      avatar: null
    };

    switch (provider) {
      case 'google':
        normalized.avatar = userInfo.picture;
        break;
      case 'facebook':
        normalized.avatar = userInfo.picture?.data?.url;
        break;
      case 'discord':
        normalized.avatar = userInfo.avatar ? 
          `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png` : null;
        break;
    }

    return normalized;
  }

  /**
   * Tạo hoặc cập nhật user từ OAuth
   */
  async createOrUpdateUser(userInfo) {
    try {
      const { provider, providerId, email, name, avatar } = userInfo;
      
      // Kiểm tra xem user đã tồn tại chưa
      const existingUser = await redis.hgetall(`user:oauth:${provider}:${providerId}`);
      
      if (existingUser && existingUser.username) {
        // Cập nhật thông tin user
        await redis.hset(`user:oauth:${provider}:${providerId}`, {
          email,
          name,
          avatar,
          lastLogin: Date.now()
        });
        
        return {
          isNewUser: false,
          username: existingUser.username,
          user: existingUser
        };
      } else {
        // Tạo user mới
        const username = await this.generateUsername(name, email);
        const userId = crypto.randomUUID();
        
        const newUser = {
          id: userId,
          username,
          email,
          name,
          avatar,
          provider,
          providerId,
          role: 'bot', // Default role
          createdAt: Date.now(),
          lastLogin: Date.now()
        };

        // Lưu user
        await redis.hset(`user:oauth:${provider}:${providerId}`, newUser);
        await redis.hset(`user:${username}`, newUser);
        await redis.sadd('users', username);
        
        return {
          isNewUser: true,
          username,
          user: newUser
        };
      }
    } catch (error) {
      throw new Error(`Failed to create or update user: ${error.message}`);
    }
  }

  /**
   * Tạo username từ name và email
   */
  async generateUsername(name, email) {
    const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Thử baseName trước
    let username = baseName;
    if (username.length < 3) {
      username = emailPrefix;
    }
    
    // Thêm số nếu cần
    let counter = 1;
    let finalUsername = username;
    
    // Check if username exists and generate unique one
    while (true) {
      const exists = await redis.exists(`user:${finalUsername}`);
      if (!exists) break;
      finalUsername = `${username}${counter}`;
      counter++;
    }
    
    return finalUsername;
  }

  /**
   * Tạo JWT token cho user
   */
  generateJWT(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      provider: user.provider
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
  }

  /**
   * Liên kết OAuth account với existing user
   */
  async linkOAuthAccount(username, userInfo) {
    try {
      const { provider, providerId } = userInfo;
      
      // Kiểm tra xem OAuth account đã được liên kết chưa
      const existingLink = await redis.exists(`user:oauth:${provider}:${providerId}`);
      if (existingLink) {
        throw new Error("OAuth account already linked to another user");
      }

      // Lấy thông tin user hiện tại
      const user = await redis.hgetall(`user:${username}`);
      if (!user || !user.username) {
        throw new Error("User not found");
      }

      // Liên kết OAuth account
      await redis.hset(`user:oauth:${provider}:${providerId}`, {
        username,
        linkedAt: Date.now()
      });

      // Cập nhật user info
      await redis.hset(`user:${username}`, {
        [`${provider}Id`]: providerId,
        [`${provider}Linked`]: true,
        lastLogin: Date.now()
      });

      return { success: true, message: "OAuth account linked successfully" };
    } catch (error) {
      throw new Error(`Failed to link OAuth account: ${error.message}`);
    }
  }

  /**
   * Hủy liên kết OAuth account
   */
  async unlinkOAuthAccount(username, provider) {
    try {
      // Lấy providerId từ user
      const user = await redis.hgetall(`user:${username}`);
      const providerId = user[`${provider}Id`];
      
      if (!providerId) {
        throw new Error("OAuth account not linked");
      }

      // Xóa liên kết
      await redis.del(`user:oauth:${provider}:${providerId}`);
      await redis.hdel(`user:${username}`, `${provider}Id`, `${provider}Linked`);

      return { success: true, message: "OAuth account unlinked successfully" };
    } catch (error) {
      throw new Error(`Failed to unlink OAuth account: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách OAuth accounts đã liên kết
   */
  async getLinkedAccounts(username) {
    try {
      const user = await redis.hgetall(`user:${username}`);
      const linkedAccounts = [];

      for (const provider of Object.keys(this.providers)) {
        if (user[`${provider}Linked`] === 'true') {
          linkedAccounts.push({
            provider,
            providerId: user[`${provider}Id`],
            linkedAt: user[`${provider}LinkedAt`]
          });
        }
      }

      return linkedAccounts;
    } catch (error) {
      throw new Error(`Failed to get linked accounts: ${error.message}`);
    }
  }
}

export const oauthService = new OAuthService();
