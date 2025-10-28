import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Payment Processing cho hệ thống
 */
class PaymentService extends EventEmitter {
  constructor() {
    super();
    this.paymentMethods = new Map();
    this.subscriptions = new Map();
    this.invoices = new Map();
    this.initializePaymentMethods();
  }

  /**
   * Khởi tạo payment methods
   */
  initializePaymentMethods() {
    this.paymentMethods.set('stripe', {
      name: 'Stripe',
      enabled: false,
      config: {
        publishableKey: '',
        secretKey: '',
        webhookSecret: ''
      }
    });

    this.paymentMethods.set('paypal', {
      name: 'PayPal',
      enabled: false,
      config: {
        clientId: '',
        clientSecret: '',
        sandbox: true
      }
    });

    this.paymentMethods.set('crypto', {
      name: 'Cryptocurrency',
      enabled: false,
      config: {
        bitcoinAddress: '',
        ethereumAddress: '',
        litecoinAddress: ''
      }
    });

    this.paymentMethods.set('bank_transfer', {
      name: 'Bank Transfer',
      enabled: false,
      config: {
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        swiftCode: ''
      }
    });
  }

  /**
   * Tạo payment intent
   */
  async createPaymentIntent(paymentData) {
    try {
      const paymentIntent = {
        id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        paymentMethod: paymentData.paymentMethod,
        description: paymentData.description,
        metadata: paymentData.metadata || {},
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientSecret: null,
        paymentUrl: null
      };

      // Process based on payment method
      switch (paymentData.paymentMethod) {
        case 'stripe':
          paymentIntent.clientSecret = await this.createStripePaymentIntent(paymentIntent);
          break;
        case 'paypal':
          paymentIntent.paymentUrl = await this.createPayPalPayment(paymentIntent);
          break;
        case 'crypto':
          paymentIntent.paymentUrl = await this.createCryptoPayment(paymentIntent);
          break;
        case 'bank_transfer':
          paymentIntent.paymentUrl = await this.createBankTransferPayment(paymentIntent);
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
      }

      // Store payment intent
      await redis.hset(`payment:intent:${paymentIntent.id}`, paymentIntent);
      
      this.emit('payment:created', paymentIntent);
      return paymentIntent;
    } catch (error) {
      console.error("Failed to create payment intent:", error.message);
      throw error;
    }
  }

  /**
   * Tạo Stripe payment intent
   */
  async createStripePaymentIntent(paymentIntent) {
    try {
      const stripe = this.paymentMethods.get('stripe');
      if (!stripe.enabled) {
        throw new Error("Stripe payment method is not enabled");
      }

      // Simulate Stripe API call
      const clientSecret = `pi_${paymentIntent.id}_secret_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real implementation, you would call Stripe API here
      // const stripe = require('stripe')(stripe.config.secretKey);
      // const intent = await stripe.paymentIntents.create({
      //   amount: paymentIntent.amount * 100, // Convert to cents
      //   currency: paymentIntent.currency,
      //   metadata: paymentIntent.metadata
      // });

      return clientSecret;
    } catch (error) {
      console.error("Stripe payment intent creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Tạo PayPal payment
   */
  async createPayPalPayment(paymentIntent) {
    try {
      const paypal = this.paymentMethods.get('paypal');
      if (!paypal.enabled) {
        throw new Error("PayPal payment method is not enabled");
      }

      // Simulate PayPal API call
      const paymentUrl = `https://paypal.com/payment/${paymentIntent.id}`;
      
      // In real implementation, you would call PayPal API here
      
      return paymentUrl;
    } catch (error) {
      console.error("PayPal payment creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Tạo Crypto payment
   */
  async createCryptoPayment(paymentIntent) {
    try {
      const crypto = this.paymentMethods.get('crypto');
      if (!crypto.enabled) {
        throw new Error("Cryptocurrency payment method is not enabled");
      }

      // Generate crypto payment address
      const paymentUrl = `crypto:bitcoin:${crypto.config.bitcoinAddress}?amount=${paymentIntent.amount}`;
      
      return paymentUrl;
    } catch (error) {
      console.error("Crypto payment creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Tạo Bank transfer payment
   */
  async createBankTransferPayment(paymentIntent) {
    try {
      const bankTransfer = this.paymentMethods.get('bank_transfer');
      if (!bankTransfer.enabled) {
        throw new Error("Bank transfer payment method is not enabled");
      }

      // Generate bank transfer instructions
      const paymentUrl = `bank://transfer?amount=${paymentIntent.amount}&reference=${paymentIntent.id}`;
      
      return paymentUrl;
    } catch (error) {
      console.error("Bank transfer payment creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Xác nhận payment
   */
  async confirmPayment(paymentIntentId, confirmationData) {
    try {
      const paymentIntent = await redis.hgetall(`payment:intent:${paymentIntentId}`);
      if (!paymentIntent || !paymentIntent.id) {
        throw new Error("Payment intent not found");
      }

      // Update payment status based on confirmation
      paymentIntent.status = 'succeeded';
      paymentIntent.updatedAt = new Date().toISOString();
      paymentIntent.confirmationData = confirmationData;

      await redis.hset(`payment:intent:${paymentIntentId}`, paymentIntent);
      
      // Create invoice
      const invoice = await this.createInvoice(paymentIntent);
      
      this.emit('payment:succeeded', { paymentIntent, invoice });
      return { paymentIntent, invoice };
    } catch (error) {
      console.error("Failed to confirm payment:", error.message);
      throw error;
    }
  }

  /**
   * Tạo invoice
   */
  async createInvoice(paymentIntent) {
    try {
      const invoice = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentIntentId: paymentIntent.id,
        userId: paymentIntent.userId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'paid',
        createdAt: new Date().toISOString(),
        items: [
          {
            description: paymentIntent.description,
            amount: paymentIntent.amount,
            quantity: 1
          }
        ],
        tax: 0,
        total: paymentIntent.amount,
        paymentMethod: paymentIntent.paymentMethod
      };

      await redis.hset(`invoice:${invoice.id}`, invoice);
      this.invoices.set(invoice.id, invoice);
      
      this.emit('invoice:created', invoice);
      return invoice;
    } catch (error) {
      console.error("Failed to create invoice:", error.message);
      throw error;
    }
  }

  /**
   * Tạo subscription
   */
  async createSubscription(subscriptionData) {
    try {
      const subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: subscriptionData.userId,
        planId: subscriptionData.planId,
        planName: subscriptionData.planName,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'USD',
        interval: subscriptionData.interval, // monthly, yearly
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: this.calculatePeriodEnd(subscriptionData.interval),
        trialEnd: subscriptionData.trialEnd || null,
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: subscriptionData.metadata || {}
      };

      await redis.hset(`subscription:${subscription.id}`, subscription);
      this.subscriptions.set(subscription.id, subscription);
      
      this.emit('subscription:created', subscription);
      return subscription;
    } catch (error) {
      console.error("Failed to create subscription:", error.message);
      throw error;
    }
  }

  /**
   * Tính toán period end
   */
  calculatePeriodEnd(interval) {
    const now = new Date();
    switch (interval) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    }
  }

  /**
   * Cập nhật subscription
   */
  async updateSubscription(subscriptionId, updates) {
    try {
      const subscription = await redis.hgetall(`subscription:${subscriptionId}`);
      if (!subscription || !subscription.id) {
        throw new Error("Subscription not found");
      }

      Object.assign(subscription, updates);
      subscription.updatedAt = new Date().toISOString();

      await redis.hset(`subscription:${subscriptionId}`, subscription);
      this.subscriptions.set(subscriptionId, subscription);
      
      this.emit('subscription:updated', subscription);
      return subscription;
    } catch (error) {
      console.error("Failed to update subscription:", error.message);
      throw error;
    }
  }

  /**
   * Hủy subscription
   */
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await redis.hgetall(`subscription:${subscriptionId}`);
      if (!subscription || !subscription.id) {
        throw new Error("Subscription not found");
      }

      if (cancelAtPeriodEnd) {
        subscription.cancelAtPeriodEnd = true;
        subscription.status = 'active'; // Still active until period end
      } else {
        subscription.status = 'canceled';
        subscription.canceledAt = new Date().toISOString();
      }

      subscription.updatedAt = new Date().toISOString();

      await redis.hset(`subscription:${subscriptionId}`, subscription);
      this.subscriptions.set(subscriptionId, subscription);
      
      this.emit('subscription:canceled', subscription);
      return subscription;
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message);
      throw error;
    }
  }

  /**
   * Xử lý webhook
   */
  async handleWebhook(webhookData, signature, source) {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(webhookData, signature, source);
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      // Process webhook based on source
      switch (source) {
        case 'stripe':
          return await this.handleStripeWebhook(webhookData);
        case 'paypal':
          return await this.handlePayPalWebhook(webhookData);
        default:
          throw new Error(`Unsupported webhook source: ${source}`);
      }
    } catch (error) {
      console.error("Webhook handling failed:", error.message);
      throw error;
    }
  }

  /**
   * Xử lý Stripe webhook
   */
  async handleStripeWebhook(webhookData) {
    try {
      const { type, data } = webhookData;

      switch (type) {
        case 'payment_intent.succeeded':
          const paymentIntent = data.object;
          await this.confirmPayment(paymentIntent.id, paymentIntent);
          break;
        
        case 'invoice.payment_succeeded':
          const invoice = data.object;
          // Handle subscription payment
          break;
        
        case 'customer.subscription.updated':
          const subscription = data.object;
          // Handle subscription update
          break;
        
        default:
          console.log(`Unhandled Stripe webhook type: ${type}`);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error("Stripe webhook handling failed:", error.message);
      throw error;
    }
  }

  /**
   * Xử lý PayPal webhook
   */
  async handlePayPalWebhook(webhookData) {
    try {
      const { event_type, resource } = webhookData;

      switch (event_type) {
        case 'PAYMENT.SALE.COMPLETED':
          // Handle payment completion
          break;
        
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          // Handle subscription activation
          break;
        
        default:
          console.log(`Unhandled PayPal webhook type: ${event_type}`);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error("PayPal webhook handling failed:", error.message);
      throw error;
    }
  }

  /**
   * Xác minh webhook signature
   */
  async verifyWebhookSignature(webhookData, signature, source) {
    try {
      // In real implementation, you would verify the signature
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return false;
    }
  }

  /**
   * Lấy payment history
   */
  async getPaymentHistory(userId, limit = 50) {
    try {
      const paymentKeys = await redis.keys(`payment:intent:*`);
      const payments = [];

      for (const key of paymentKeys) {
        const payment = await redis.hgetall(key);
        if (payment && payment.userId === userId) {
          payments.push(payment);
        }
      }

      return payments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get payment history:", error.message);
      return [];
    }
  }

  /**
   * Lấy subscription history
   */
  async getSubscriptionHistory(userId, limit = 50) {
    try {
      const subscriptionKeys = await redis.keys(`subscription:*`);
      const subscriptions = [];

      for (const key of subscriptionKeys) {
        const subscription = await redis.hgetall(key);
        if (subscription && subscription.userId === userId) {
          subscriptions.push(subscription);
        }
      }

      return subscriptions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get subscription history:", error.message);
      return [];
    }
  }

  /**
   * Lấy invoice history
   */
  async getInvoiceHistory(userId, limit = 50) {
    try {
      const invoiceKeys = await redis.keys(`invoice:*`);
      const invoices = [];

      for (const key of invoiceKeys) {
        const invoice = await redis.hgetall(key);
        if (invoice && invoice.userId === userId) {
          invoices.push(invoice);
        }
      }

      return invoices
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get invoice history:", error.message);
      return [];
    }
  }

  /**
   * Cấu hình payment method
   */
  async configurePaymentMethod(methodId, config) {
    try {
      const method = this.paymentMethods.get(methodId);
      if (!method) {
        throw new Error(`Payment method not found: ${methodId}`);
      }

      method.config = { ...method.config, ...config };
      method.enabled = true;

      await redis.hset(`payment:method:${methodId}`, method);
      
      this.emit('payment:method:configured', { methodId, method });
      return method;
    } catch (error) {
      console.error("Failed to configure payment method:", error.message);
      throw error;
    }
  }

  /**
   * Lấy payment statistics
   */
  async getPaymentStats(userId = null) {
    try {
      const stats = {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0
      };

      // Get payment stats
      const paymentKeys = await redis.keys(`payment:intent:*`);
      for (const key of paymentKeys) {
        const payment = await redis.hgetall(key);
        if (payment && (!userId || payment.userId === userId)) {
          stats.totalPayments++;
          stats.totalAmount += parseFloat(payment.amount) || 0;
          
          switch (payment.status) {
            case 'succeeded':
              stats.successfulPayments++;
              break;
            case 'failed':
              stats.failedPayments++;
              break;
            case 'pending':
              stats.pendingPayments++;
              break;
          }
        }
      }

      // Get subscription stats
      const subscriptionKeys = await redis.keys(`subscription:*`);
      for (const key of subscriptionKeys) {
        const subscription = await redis.hgetall(key);
        if (subscription && (!userId || subscription.userId === userId)) {
          stats.totalSubscriptions++;
          
          switch (subscription.status) {
            case 'active':
              stats.activeSubscriptions++;
              break;
            case 'canceled':
              stats.canceledSubscriptions++;
              break;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error("Failed to get payment stats:", error.message);
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0
      };
    }
  }

  /**
   * Lấy tất cả payment methods
   */
  getPaymentMethods() {
    return Array.from(this.paymentMethods.values());
  }

  /**
   * Lấy tất cả subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Lấy tất cả invoices
   */
  getInvoices() {
    return Array.from(this.invoices.values());
  }
}

export const paymentService = new PaymentService();
