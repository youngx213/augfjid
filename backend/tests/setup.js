import { vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Reset all mocks after each test
  vi.resetAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock process.env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'bot',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockPaymentIntent: (overrides = {}) => ({
    id: 'pi_test_123',
    userId: 'test-user-id',
    amount: 29.99,
    currency: 'USD',
    paymentMethod: 'stripe',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockSubscription: (overrides = {}) => ({
    id: 'sub_test_123',
    userId: 'test-user-id',
    planId: 'pro',
    planName: 'Pro Plan',
    amount: 29.99,
    currency: 'USD',
    interval: 'monthly',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockInvoice: (overrides = {}) => ({
    id: 'inv_test_123',
    userId: 'test-user-id',
    amount: 29.99,
    currency: 'USD',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockTicket: (overrides = {}) => ({
    id: 'ticket_test_123',
    userId: 'test-user-id',
    subject: 'Test Ticket',
    description: 'Test description',
    category: 'technical',
    priority: 'medium',
    status: 'open',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockAffiliate: (overrides = {}) => ({
    id: 'aff_test_123',
    userId: 'test-user-id',
    referralCode: 'TEST123',
    status: 'active',
    totalEarnings: 0,
    totalPayouts: 0,
    pendingEarnings: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createMockTranslation: (overrides = {}) => ({
    id: 'trans_test_123',
    key: 'test.key',
    language: 'en',
    value: 'Test Value',
    category: 'general',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  mockRedisResponse: (data) => {
    const { redis } = require('../redis.js');
    redis.hgetall.mockResolvedValue(data);
    redis.hset.mockResolvedValue(1);
    redis.del.mockResolvedValue(1);
    redis.exists.mockResolvedValue(1);
    redis.keys.mockResolvedValue([]);
    redis.lpush.mockResolvedValue(1);
    redis.lrange.mockResolvedValue([]);
    redis.lrem.mockResolvedValue(1);
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    redis.expire.mockResolvedValue(1);
  }
};
