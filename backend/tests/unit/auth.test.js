import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { register, login, getAllUsers, deleteUser, addKey, removeKey, verifyAdminToken, generateKey, getAllUsedKeys, getUsedKeyInfo } from '../auth.js';
import { redis } from '../redis.js';

// Mock Redis
vi.mock('../redis.js', () => ({
  redis: {
    hgetall: vi.fn(),
    hset: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    lpush: vi.fn(),
    lrange: vi.fn(),
    lrem: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    expire: vi.fn()
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  hash: vi.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: vi.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`))
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn((payload) => `token_${payload.id}`),
  verify: vi.fn((token) => ({ id: token.replace('token_', ''), role: 'admin' }))
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        key: 'valid-key-123'
      };

      redis.hgetall.mockResolvedValueOnce({}); // Key exists
      redis.hgetall.mockResolvedValueOnce({}); // User doesn't exist
      redis.hset.mockResolvedValueOnce(1);
      redis.del.mockResolvedValueOnce(1);

      const result = await register(userData);

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.role).toBe('bot');
      expect(redis.hset).toHaveBeenCalledWith(
        `user:${result.user.id}`,
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
          role: 'bot'
        })
      );
    });

    it('should fail if key is invalid', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        key: 'invalid-key'
      };

      redis.hgetall.mockResolvedValueOnce({}); // Key doesn't exist

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid registration key');
    });

    it('should fail if key is already used', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        key: 'used-key-123'
      };

      redis.hgetall.mockResolvedValueOnce({ used: true }); // Key is used

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration key has already been used');
    });

    it('should fail if user already exists', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        key: 'valid-key-123'
      };

      redis.hgetall.mockResolvedValueOnce({}); // Key exists
      redis.hgetall.mockResolvedValueOnce({ username: 'testuser' }); // User exists

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const userData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password123',
        role: 'bot'
      };

      redis.hgetall.mockResolvedValueOnce(userData);

      const result = await login(loginData);

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBe('token_user123');
    });

    it('should fail if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      redis.hgetall.mockResolvedValueOnce({}); // User doesn't exist

      const result = await login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should fail if password is incorrect', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const userData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password123',
        role: 'bot'
      };

      redis.hgetall.mockResolvedValueOnce(userData);

      const result = await login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 'user1', username: 'user1', email: 'user1@example.com' },
        { id: 'user2', username: 'user2', email: 'user2@example.com' }
      ];

      redis.keys.mockResolvedValueOnce(['user:user1', 'user:user2']);
      redis.hgetall
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1]);

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('user1');
      expect(result[1].username).toBe('user2');
    });

    it('should return empty array if no users', async () => {
      redis.keys.mockResolvedValueOnce([]);

      const result = await getAllUsers();

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user123';
      
      redis.exists.mockResolvedValueOnce(1);
      redis.del.mockResolvedValueOnce(1);

      const result = await deleteUser(userId);

      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should fail if user not found', async () => {
      const userId = 'nonexistent';
      
      redis.exists.mockResolvedValueOnce(0);

      const result = await deleteUser(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('addKey', () => {
    it('should add key successfully', async () => {
      const keyData = {
        key: 'new-key-123',
        role: 'bot',
        description: 'Test key'
      };

      redis.hgetall.mockResolvedValueOnce({}); // Key doesn't exist
      redis.hset.mockResolvedValueOnce(1);

      const result = await addKey(keyData);

      expect(result.success).toBe(true);
      expect(redis.hset).toHaveBeenCalledWith(
        `key:${keyData.key}`,
        expect.objectContaining({
          key: keyData.key,
          role: keyData.role,
          description: keyData.description,
          used: false
        })
      );
    });

    it('should fail if key already exists', async () => {
      const keyData = {
        key: 'existing-key-123',
        role: 'bot',
        description: 'Test key'
      };

      redis.hgetall.mockResolvedValueOnce({ key: 'existing-key-123' }); // Key exists

      const result = await addKey(keyData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key already exists');
    });
  });

  describe('removeKey', () => {
    it('should remove key successfully', async () => {
      const key = 'key-to-remove';
      
      redis.exists.mockResolvedValueOnce(1);
      redis.del.mockResolvedValueOnce(1);

      const result = await removeKey(key);

      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalledWith(`key:${key}`);
    });

    it('should fail if key not found', async () => {
      const key = 'nonexistent-key';
      
      redis.exists.mockResolvedValueOnce(0);

      const result = await removeKey(key);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key not found');
    });
  });

  describe('generateKey', () => {
    it('should generate a valid key', () => {
      const key = generateKey();
      
      expect(key).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('verifyAdminToken', () => {
    it('should verify admin token successfully', async () => {
      const token = 'token_admin123';
      const userData = {
        id: 'admin123',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      redis.hgetall.mockResolvedValueOnce(userData);

      const result = await verifyAdminToken(token);

      expect(result.success).toBe(true);
      expect(result.user.role).toBe('admin');
    });

    it('should fail if token is invalid', async () => {
      const token = 'invalid-token';

      const result = await verifyAdminToken(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should fail if user is not admin', async () => {
      const token = 'token_user123';
      const userData = {
        id: 'user123',
        username: 'user',
        email: 'user@example.com',
        role: 'bot'
      };

      redis.hgetall.mockResolvedValueOnce(userData);

      const result = await verifyAdminToken(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin access required');
    });
  });

  describe('getAllUsedKeys', () => {
    it('should return all used keys', async () => {
      const mockKeys = [
        { key: 'key1', role: 'bot', used: true, usedBy: 'user1' },
        { key: 'key2', role: 'game', used: true, usedBy: 'user2' }
      ];

      redis.keys.mockResolvedValueOnce(['key:key1', 'key:key2']);
      redis.hgetall
        .mockResolvedValueOnce(mockKeys[0])
        .mockResolvedValueOnce(mockKeys[1]);

      const result = await getAllUsedKeys();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('key1');
      expect(result[1].key).toBe('key2');
    });
  });

  describe('getUsedKeyInfo', () => {
    it('should return used key info', async () => {
      const key = 'used-key-123';
      const keyData = {
        key: key,
        role: 'bot',
        used: true,
        usedBy: 'user123',
        usedAt: '2023-01-01T00:00:00.000Z'
      };
      const userData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      redis.hgetall
        .mockResolvedValueOnce(keyData)
        .mockResolvedValueOnce(userData);

      const result = await getUsedKeyInfo(key);

      expect(result.success).toBe(true);
      expect(result.keyInfo.key).toBe(key);
      expect(result.userInfo.username).toBe('testuser');
    });

    it('should fail if key not found', async () => {
      const key = 'nonexistent-key';

      redis.hgetall.mockResolvedValueOnce({}); // Key doesn't exist

      const result = await getUsedKeyInfo(key);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key not found');
    });
  });
});
