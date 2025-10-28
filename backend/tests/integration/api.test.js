import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

// Mock all services
vi.mock('../../services/paymentService.js', () => ({
  paymentService: {
    getPaymentMethods: vi.fn(),
    createPaymentIntent: vi.fn(),
    confirmPayment: vi.fn(),
    getPaymentHistory: vi.fn(),
    getPaymentStats: vi.fn(),
    handleWebhook: vi.fn(),
    configurePaymentMethod: vi.fn()
  }
}));

vi.mock('../../services/subscriptionService.js', () => ({
  subscriptionService: {
    getSubscriptionPlans: vi.fn(),
    getUserSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    upgradeSubscription: vi.fn(),
    checkFeatureAccess: vi.fn(),
    checkLimits: vi.fn(),
    getSubscriptionHistory: vi.fn(),
    getSubscriptionStats: vi.fn(),
    createSubscriptionPlan: vi.fn(),
    updateSubscriptionPlan: vi.fn(),
    deleteSubscriptionPlan: vi.fn()
  }
}));

vi.mock('../../services/invoiceService.js', () => ({
  invoiceService: {
    getTemplates: vi.fn(),
    generateInvoice: vi.fn(),
    getInvoice: vi.fn(),
    getInvoiceHistory: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    getInvoiceStats: vi.fn()
  }
}));

vi.mock('../../services/customerSupportService.js', () => ({
  customerSupportService: {
    getCategories: vi.fn(),
    getPriorities: vi.fn(),
    getStatuses: vi.fn(),
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    addComment: vi.fn(),
    getTicketComments: vi.fn(),
    getUserTickets: vi.fn(),
    getSupportStats: vi.fn(),
    getKnowledgeBaseArticles: vi.fn(),
    getFAQs: vi.fn(),
    getAllTickets: vi.fn(),
    assignTicket: vi.fn()
  }
}));

vi.mock('../../services/affiliateService.js', () => ({
  affiliateService: {
    createAffiliate: vi.fn(),
    getAffiliateByUserId: vi.fn(),
    getAffiliateReferrals: vi.fn(),
    getAffiliateCommissions: vi.fn(),
    getAffiliatePayouts: vi.fn(),
    createPayoutRequest: vi.fn(),
    getAffiliateStats: vi.fn(),
    getCommissionRates: vi.fn(),
    getPayoutThresholds: vi.fn(),
    getPayoutMethods: vi.fn(),
    getAllAffiliates: vi.fn(),
    approveAffiliate: vi.fn(),
    getAllPayouts: vi.fn(),
    processPayout: vi.fn(),
    completePayout: vi.fn()
  }
}));

vi.mock('../../services/i18nService.js', () => ({
  i18nService: {
    getEnabledLanguages: vi.fn(),
    getEnabledCurrencies: vi.fn(),
    getEnabledTimezones: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    getTranslation: vi.fn(),
    getTranslations: vi.fn(),
    createTranslation: vi.fn(),
    updateTranslation: vi.fn(),
    formatCurrency: vi.fn(),
    formatDate: vi.fn(),
    formatNumber: vi.fn(),
    detectLanguage: vi.fn(),
    getI18nStats: vi.fn(),
    bulkImportTranslations: vi.fn(),
    exportTranslations: vi.fn(),
    createLanguage: vi.fn(),
    createCurrency: vi.fn(),
    createTimezone: vi.fn()
  }
}));

// Mock auth middleware
vi.mock('../../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'bot' };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = { id: 'admin-user-id', role: 'admin' };
    next();
  }
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Payment API', () => {
    it('should get payment methods', async () => {
      const { paymentService } = await import('../../services/paymentService.js');
      paymentService.getPaymentMethods.mockResolvedValue([
        { name: 'Stripe', enabled: true },
        { name: 'PayPal', enabled: true }
      ]);

      const response = await request(app)
        .get('/api/business/payment/methods')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Stripe');
    });

    it('should create payment intent', async () => {
      const { paymentService } = await import('../../services/paymentService.js');
      const mockPaymentIntent = {
        id: 'pi_123',
        userId: 'test-user-id',
        amount: 29.99,
        currency: 'USD',
        status: 'pending'
      };
      paymentService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/api/business/payment/create-intent')
        .send({
          amount: 29.99,
          currency: 'USD',
          paymentMethod: 'stripe',
          description: 'Pro Plan'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentIntent.id).toBe('pi_123');
    });

    it('should get payment history', async () => {
      const { paymentService } = await import('../../services/paymentService.js');
      const mockHistory = [
        { id: 'pi_1', amount: 29.99, status: 'succeeded' },
        { id: 'pi_2', amount: 9.99, status: 'succeeded' }
      ];
      paymentService.getPaymentHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/business/payment/history')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('pi_1');
    });
  });

  describe('Subscription API', () => {
    it('should get subscription plans', async () => {
      const { subscriptionService } = await import('../../services/subscriptionService.js');
      const mockPlans = [
        { id: 'free', name: 'Free Plan', price: 0 },
        { id: 'basic', name: 'Basic Plan', price: 9.99 },
        { id: 'pro', name: 'Pro Plan', price: 29.99 }
      ];
      subscriptionService.getSubscriptionPlans.mockResolvedValue(mockPlans);

      const response = await request(app)
        .get('/api/business/subscription/plans')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].id).toBe('free');
    });

    it('should get current subscription', async () => {
      const { subscriptionService } = await import('../../services/subscriptionService.js');
      const mockSubscription = {
        id: 'sub_123',
        userId: 'test-user-id',
        planId: 'pro',
        status: 'active'
      };
      subscriptionService.getUserSubscription.mockResolvedValue(mockSubscription);

      const response = await request(app)
        .get('/api/business/subscription/current')
        .expect(200);

      expect(response.body.id).toBe('sub_123');
      expect(response.body.planId).toBe('pro');
    });

    it('should create subscription', async () => {
      const { subscriptionService } = await import('../../services/subscriptionService.js');
      const mockSubscription = {
        id: 'sub_123',
        userId: 'test-user-id',
        planId: 'pro',
        status: 'active'
      };
      subscriptionService.createSubscription.mockResolvedValue(mockSubscription);

      const response = await request(app)
        .post('/api/business/subscription/create')
        .send({
          planId: 'pro',
          planName: 'Pro Plan',
          amount: 29.99,
          interval: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.id).toBe('sub_123');
    });
  });

  describe('Invoice API', () => {
    it('should get invoice templates', async () => {
      const { invoiceService } = await import('../../services/invoiceService.js');
      const mockTemplates = [
        { id: 'default', name: 'Default Template' },
        { id: 'modern', name: 'Modern Template' }
      ];
      invoiceService.getTemplates.mockReturnValue(mockTemplates);

      const response = await request(app)
        .get('/api/business/invoice/templates')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('default');
    });

    it('should generate invoice', async () => {
      const { invoiceService } = await import('../../services/invoiceService.js');
      const mockInvoice = {
        id: 'inv_123',
        userId: 'test-user-id',
        amount: 29.99,
        status: 'pending'
      };
      invoiceService.generateInvoice.mockResolvedValue(mockInvoice);

      const response = await request(app)
        .post('/api/business/invoice/generate')
        .send({
          customerInfo: { name: 'John Doe', email: 'john@example.com' },
          items: [{ description: 'Pro Plan', amount: 29.99 }],
          subtotal: 29.99,
          total: 29.99
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.invoice.id).toBe('inv_123');
    });
  });

  describe('Customer Support API', () => {
    it('should get support categories', async () => {
      const { customerSupportService } = await import('../../services/customerSupportService.js');
      const mockCategories = [
        { id: 'technical', name: 'Technical Support' },
        { id: 'billing', name: 'Billing & Payments' }
      ];
      customerSupportService.getCategories.mockReturnValue(mockCategories);

      const response = await request(app)
        .get('/api/business/support/categories')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('technical');
    });

    it('should create support ticket', async () => {
      const { customerSupportService } = await import('../../services/customerSupportService.js');
      const mockTicket = {
        id: 'ticket_123',
        userId: 'test-user-id',
        subject: 'Need help',
        status: 'open'
      };
      customerSupportService.createTicket.mockResolvedValue(mockTicket);

      const response = await request(app)
        .post('/api/business/support/ticket')
        .send({
          subject: 'Need help',
          description: 'I need assistance with my account',
          category: 'technical',
          priority: 'medium'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.ticket.id).toBe('ticket_123');
    });
  });

  describe('Affiliate API', () => {
    it('should register affiliate', async () => {
      const { affiliateService } = await import('../../services/affiliateService.js');
      const mockAffiliate = {
        id: 'aff_123',
        userId: 'test-user-id',
        referralCode: 'ABC123',
        status: 'pending'
      };
      affiliateService.createAffiliate.mockResolvedValue(mockAffiliate);

      const response = await request(app)
        .post('/api/business/affiliate/register')
        .send({
          payoutMethod: 'paypal',
          payoutDetails: { email: 'test@example.com' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.affiliate.id).toBe('aff_123');
    });

    it('should get affiliate status', async () => {
      const { affiliateService } = await import('../../services/affiliateService.js');
      const mockAffiliate = {
        id: 'aff_123',
        userId: 'test-user-id',
        status: 'active',
        totalEarnings: 100
      };
      affiliateService.getAffiliateByUserId.mockResolvedValue(mockAffiliate);

      const response = await request(app)
        .get('/api/business/affiliate/status')
        .expect(200);

      expect(response.body.id).toBe('aff_123');
      expect(response.body.status).toBe('active');
    });
  });

  describe('I18n API', () => {
    it('should get languages', async () => {
      const { i18nService } = await import('../../services/i18nService.js');
      const mockLanguages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' }
      ];
      i18nService.getEnabledLanguages.mockReturnValue(mockLanguages);

      const response = await request(app)
        .get('/api/i18n/languages')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].code).toBe('en');
    });

    it('should get user preferences', async () => {
      const { i18nService } = await import('../../services/i18nService.js');
      const mockPreferences = {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      };
      i18nService.getUserPreferences.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/i18n/preferences')
        .expect(200);

      expect(response.body.language).toBe('en');
      expect(response.body.currency).toBe('USD');
    });

    it('should update user preferences', async () => {
      const { i18nService } = await import('../../services/i18nService.js');
      const mockPreferences = {
        language: 'vi',
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh'
      };
      i18nService.updateUserPreferences.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .put('/api/i18n/preferences')
        .send({
          language: 'vi',
          currency: 'VND'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.language).toBe('vi');
    });

    it('should get translation', async () => {
      const { i18nService } = await import('../../services/i18nService.js');
      i18nService.getTranslation.mockResolvedValue('Hello');

      const response = await request(app)
        .get('/api/i18n/translate/common.hello')
        .query({ language: 'en' })
        .expect(200);

      expect(response.body.key).toBe('common.hello');
      expect(response.body.translation).toBe('Hello');
    });

    it('should format currency', async () => {
      const { i18nService } = await import('../../services/i18nService.js');
      i18nService.formatCurrency.mockReturnValue('$29.99');

      const response = await request(app)
        .get('/api/i18n/format/currency')
        .query({ amount: 29.99, currency: 'USD', language: 'en' })
        .expect(200);

      expect(response.body.formatted).toBe('$29.99');
    });
  });

  describe('Admin API', () => {
    it('should get admin stats', async () => {
      const { affiliateService, customerSupportService, invoiceService } = await import('../../services/affiliateService.js');
      
      affiliateService.getAffiliateStats.mockResolvedValue({ totalAffiliates: 10 });
      customerSupportService.getSupportStats.mockResolvedValue({ totalTickets: 50 });
      invoiceService.getInvoiceStats.mockResolvedValue({ totalInvoices: 100 });

      const response = await request(app)
        .get('/api/business/admin/stats')
        .expect(200);

      expect(response.body.affiliate.totalAffiliates).toBe(10);
      expect(response.body.support.totalTickets).toBe(50);
      expect(response.body.invoice.totalInvoices).toBe(100);
    });

    it('should approve affiliate', async () => {
      const { affiliateService } = await import('../../services/affiliateService.js');
      const mockAffiliate = {
        id: 'aff_123',
        status: 'active',
        approvedAt: new Date().toISOString()
      };
      affiliateService.approveAffiliate.mockResolvedValue(mockAffiliate);

      const response = await request(app)
        .post('/api/business/admin/affiliate/aff_123/approve')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.affiliate.status).toBe('active');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { paymentService } = await import('../../services/paymentService.js');
      paymentService.getPaymentMethods.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/business/payment/methods')
        .expect(500);

      expect(response.body.error).toBe('Service unavailable');
    });

    it('should handle validation errors', async () => {
      const { paymentService } = await import('../../services/paymentService.js');
      paymentService.createPaymentIntent.mockRejectedValue(new Error('Invalid payment data'));

      const response = await request(app)
        .post('/api/business/payment/create-intent')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.error).toBe('Invalid payment data');
    });
  });
});
