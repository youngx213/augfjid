import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymentService } from '../../services/paymentService.js';

// Mock Redis
vi.mock('../../redis.js', () => ({
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

describe('Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent for Stripe', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'stripe',
        description: 'Pro Plan Subscription'
      };

      const result = await paymentService.createPaymentIntent(paymentData);

      expect(result.id).toMatch(/^pi_\d+_[a-z0-9]+$/);
      expect(result.userId).toBe(paymentData.userId);
      expect(result.amount).toBe(paymentData.amount);
      expect(result.currency).toBe(paymentData.currency);
      expect(result.paymentMethod).toBe(paymentData.paymentMethod);
      expect(result.status).toBe('pending');
      expect(result.clientSecret).toMatch(/^pi_.*_secret_[a-z0-9]+$/);
    });

    it('should create payment intent for PayPal', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'paypal',
        description: 'Pro Plan Subscription'
      };

      const result = await paymentService.createPaymentIntent(paymentData);

      expect(result.id).toMatch(/^pi_\d+_[a-z0-9]+$/);
      expect(result.paymentMethod).toBe('paypal');
      expect(result.paymentUrl).toMatch(/^https:\/\/paypal\.com\/payment\//);
    });

    it('should create payment intent for Crypto', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 0.001,
        currency: 'BTC',
        paymentMethod: 'crypto',
        description: 'Pro Plan Subscription'
      };

      const result = await paymentService.createPaymentIntent(paymentData);

      expect(result.id).toMatch(/^pi_\d+_[a-z0-9]+$/);
      expect(result.paymentMethod).toBe('crypto');
      expect(result.paymentUrl).toMatch(/^crypto:bitcoin:/);
    });

    it('should fail for unsupported payment method', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'unsupported',
        description: 'Pro Plan Subscription'
      };

      await expect(paymentService.createPaymentIntent(paymentData))
        .rejects.toThrow('Unsupported payment method: unsupported');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const paymentIntentId = 'pi_1234567890_abcdef';
      const confirmationData = { payment_intent: { status: 'succeeded' } };

      const mockPaymentIntent = {
        id: paymentIntentId,
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        status: 'pending'
      };

      // Mock Redis calls
      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce(mockPaymentIntent);
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.confirmPayment(paymentIntentId, confirmationData);

      expect(result.paymentIntent.status).toBe('succeeded');
      expect(result.invoice).toBeDefined();
      expect(result.invoice.paymentIntentId).toBe(paymentIntentId);
    });

    it('should fail if payment intent not found', async () => {
      const paymentIntentId = 'nonexistent';
      const confirmationData = { payment_intent: { status: 'succeeded' } };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce({}); // Payment intent not found

      await expect(paymentService.confirmPayment(paymentIntentId, confirmationData))
        .rejects.toThrow('Payment intent not found');
    });
  });

  describe('createInvoice', () => {
    it('should create invoice from payment intent', async () => {
      const paymentIntent = {
        id: 'pi_1234567890_abcdef',
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        description: 'Pro Plan Subscription',
        paymentMethod: 'stripe'
      };

      const { redis } = await import('../../redis.js');
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.createInvoice(paymentIntent);

      expect(result.id).toMatch(/^inv_\d+_[a-z0-9]+$/);
      expect(result.paymentIntentId).toBe(paymentIntent.id);
      expect(result.userId).toBe(paymentIntent.userId);
      expect(result.amount).toBe(paymentIntent.amount);
      expect(result.currency).toBe(paymentIntent.currency);
      expect(result.status).toBe('paid');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].description).toBe(paymentIntent.description);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const subscriptionData = {
        userId: 'user123',
        planId: 'pro',
        planName: 'Pro Plan',
        amount: 29.99,
        currency: 'USD',
        interval: 'monthly'
      };

      const { redis } = await import('../../redis.js');
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.createSubscription(subscriptionData);

      expect(result.id).toMatch(/^sub_\d+_[a-z0-9]+$/);
      expect(result.userId).toBe(subscriptionData.userId);
      expect(result.planId).toBe(subscriptionData.planId);
      expect(result.planName).toBe(subscriptionData.planName);
      expect(result.amount).toBe(subscriptionData.amount);
      expect(result.currency).toBe(subscriptionData.currency);
      expect(result.interval).toBe(subscriptionData.interval);
      expect(result.status).toBe('active');
      expect(result.currentPeriodStart).toBeDefined();
      expect(result.currentPeriodEnd).toBeDefined();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const subscriptionId = 'sub_1234567890_abcdef';
      const updates = { status: 'canceled' };

      const mockSubscription = {
        id: subscriptionId,
        userId: 'user123',
        planId: 'pro',
        status: 'active'
      };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce(mockSubscription);
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.updateSubscription(subscriptionId, updates);

      expect(result.status).toBe('canceled');
      expect(result.updatedAt).toBeDefined();
    });

    it('should fail if subscription not found', async () => {
      const subscriptionId = 'nonexistent';
      const updates = { status: 'canceled' };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce({}); // Subscription not found

      await expect(paymentService.updateSubscription(subscriptionId, updates))
        .rejects.toThrow('Subscription not found');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const subscriptionId = 'sub_1234567890_abcdef';

      const mockSubscription = {
        id: subscriptionId,
        userId: 'user123',
        planId: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false
      };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce(mockSubscription);
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.cancelSubscription(subscriptionId, true);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.status).toBe('active'); // Still active until period end
    });

    it('should cancel subscription immediately', async () => {
      const subscriptionId = 'sub_1234567890_abcdef';

      const mockSubscription = {
        id: subscriptionId,
        userId: 'user123',
        planId: 'pro',
        status: 'active'
      };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce(mockSubscription);
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.cancelSubscription(subscriptionId, false);

      expect(result.status).toBe('canceled');
      expect(result.canceledAt).toBeDefined();
    });
  });

  describe('handleWebhook', () => {
    it('should handle Stripe webhook successfully', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890_abcdef',
            status: 'succeeded'
          }
        }
      };

      const mockPaymentIntent = {
        id: 'pi_1234567890_abcdef',
        userId: 'user123',
        amount: 29.99,
        status: 'pending'
      };

      const { redis } = await import('../../redis.js');
      redis.hgetall.mockResolvedValueOnce(mockPaymentIntent);
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.handleWebhook(webhookData, 'stripe-signature', 'stripe');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });

    it('should handle PayPal webhook successfully', async () => {
      const webhookData = {
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'sale123',
          state: 'completed'
        }
      };

      const result = await paymentService.handleWebhook(webhookData, 'paypal-signature', 'paypal');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });

    it('should fail for invalid signature', async () => {
      const webhookData = { type: 'payment_intent.succeeded' };

      await expect(paymentService.handleWebhook(webhookData, 'invalid-signature', 'stripe'))
        .rejects.toThrow('Invalid webhook signature');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for user', async () => {
      const userId = 'user123';
      const mockPayments = [
        {
          id: 'pi_1',
          userId: userId,
          amount: 29.99,
          status: 'succeeded',
          createdAt: '2023-01-01T00:00:00.000Z'
        },
        {
          id: 'pi_2',
          userId: userId,
          amount: 9.99,
          status: 'succeeded',
          createdAt: '2023-01-02T00:00:00.000Z'
        }
      ];

      const { redis } = await import('../../redis.js');
      redis.keys.mockResolvedValueOnce(['payment:intent:pi_1', 'payment:intent:pi_2']);
      redis.hgetall
        .mockResolvedValueOnce(mockPayments[0])
        .mockResolvedValueOnce(mockPayments[1]);

      const result = await paymentService.getPaymentHistory(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pi_1');
      expect(result[1].id).toBe('pi_2');
    });

    it('should return empty array if no payments', async () => {
      const userId = 'user123';

      const { redis } = await import('../../redis.js');
      redis.keys.mockResolvedValueOnce([]);

      const result = await paymentService.getPaymentHistory(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPaymentStats', () => {
    it('should return payment statistics', async () => {
      const userId = 'user123';
      const mockPayments = [
        { userId: userId, amount: 29.99, status: 'succeeded' },
        { userId: userId, amount: 9.99, status: 'succeeded' },
        { userId: userId, amount: 19.99, status: 'failed' },
        { userId: userId, amount: 39.99, status: 'pending' }
      ];

      const { redis } = await import('../../redis.js');
      redis.keys.mockResolvedValueOnce(['payment:intent:pi_1', 'payment:intent:pi_2', 'payment:intent:pi_3', 'payment:intent:pi_4']);
      redis.hgetall
        .mockResolvedValueOnce(mockPayments[0])
        .mockResolvedValueOnce(mockPayments[1])
        .mockResolvedValueOnce(mockPayments[2])
        .mockResolvedValueOnce(mockPayments[3]);

      const result = await paymentService.getPaymentStats(userId);

      expect(result.totalPayments).toBe(4);
      expect(result.totalAmount).toBe(99.96);
      expect(result.successfulPayments).toBe(2);
      expect(result.failedPayments).toBe(1);
      expect(result.pendingPayments).toBe(1);
    });
  });

  describe('configurePaymentMethod', () => {
    it('should configure payment method successfully', async () => {
      const methodId = 'stripe';
      const config = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
        webhookSecret: 'whsec_123'
      };

      const { redis } = await import('../../redis.js');
      redis.hset.mockResolvedValue(1);

      const result = await paymentService.configurePaymentMethod(methodId, config);

      expect(result.enabled).toBe(true);
      expect(result.config.publishableKey).toBe(config.publishableKey);
      expect(result.config.secretKey).toBe(config.secretKey);
      expect(result.config.webhookSecret).toBe(config.webhookSecret);
    });

    it('should fail for unknown payment method', async () => {
      const methodId = 'unknown';
      const config = {};

      await expect(paymentService.configurePaymentMethod(methodId, config))
        .rejects.toThrow('Payment method not found: unknown');
    });
  });

  describe('getPaymentMethods', () => {
    it('should return all payment methods', () => {
      const methods = paymentService.getPaymentMethods();

      expect(methods).toHaveLength(4);
      expect(methods.map(m => m.name)).toContain('Stripe');
      expect(methods.map(m => m.name)).toContain('PayPal');
      expect(methods.map(m => m.name)).toContain('Cryptocurrency');
      expect(methods.map(m => m.name)).toContain('Bank Transfer');
    });
  });
});
