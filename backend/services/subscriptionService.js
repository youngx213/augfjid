import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Subscription Management cho hệ thống
 */
class SubscriptionService extends EventEmitter {
  constructor() {
    super();
    this.subscriptionPlans = new Map();
    this.subscriptions = new Map();
    this.initializeSubscriptionPlans();
  }

  /**
   * Khởi tạo subscription plans
   */
  initializeSubscriptionPlans() {
    // Free Plan
    this.subscriptionPlans.set('free', {
      id: 'free',
      name: 'Free Plan',
      description: 'Basic features for getting started',
      price: 0,
      currency: 'USD',
      interval: 'monthly',
      features: [
        '1 TikTok account',
        'Basic gift detection',
        'Standard support',
        'Limited analytics'
      ],
      limits: {
        maxAccounts: 1,
        maxGiftsPerHour: 10,
        maxAnalyticsDays: 7,
        maxBackups: 1
      },
      isActive: true,
      isPopular: false
    });

    // Basic Plan
    this.subscriptionPlans.set('basic', {
      id: 'basic',
      name: 'Basic Plan',
      description: 'Perfect for small creators',
      price: 9.99,
      currency: 'USD',
      interval: 'monthly',
      features: [
        '3 TikTok accounts',
        'Advanced gift detection',
        'Priority support',
        '30 days analytics',
        'Basic automation',
        'Email notifications'
      ],
      limits: {
        maxAccounts: 3,
        maxGiftsPerHour: 50,
        maxAnalyticsDays: 30,
        maxBackups: 5
      },
      isActive: true,
      isPopular: false
    });

    // Pro Plan
    this.subscriptionPlans.set('pro', {
      id: 'pro',
      name: 'Pro Plan',
      description: 'For serious content creators',
      price: 29.99,
      currency: 'USD',
      interval: 'monthly',
      features: [
        '10 TikTok accounts',
        'Premium gift detection',
        '24/7 support',
        '90 days analytics',
        'Advanced automation',
        'All notifications',
        'Custom themes',
        'API access'
      ],
      limits: {
        maxAccounts: 10,
        maxGiftsPerHour: 200,
        maxAnalyticsDays: 90,
        maxBackups: 20
      },
      isActive: true,
      isPopular: true
    });

    // Enterprise Plan
    this.subscriptionPlans.set('enterprise', {
      id: 'enterprise',
      name: 'Enterprise Plan',
      description: 'For agencies and large teams',
      price: 99.99,
      currency: 'USD',
      interval: 'monthly',
      features: [
        'Unlimited TikTok accounts',
        'AI-powered gift detection',
        'Dedicated support',
        'Unlimited analytics',
        'Full automation suite',
        'White-label options',
        'Custom integrations',
        'Priority features'
      ],
      limits: {
        maxAccounts: -1, // Unlimited
        maxGiftsPerHour: -1, // Unlimited
        maxAnalyticsDays: -1, // Unlimited
        maxBackups: -1 // Unlimited
      },
      isActive: true,
      isPopular: false
    });
  }

  /**
   * Tạo subscription
   */
  async createSubscription(subscriptionData) {
    try {
      const plan = this.subscriptionPlans.get(subscriptionData.planId);
      if (!plan) {
        throw new Error(`Subscription plan not found: ${subscriptionData.planId}`);
      }

      const subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: subscriptionData.userId,
        planId: subscriptionData.planId,
        planName: plan.name,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: this.calculatePeriodEnd(plan.interval),
        trialEnd: subscriptionData.trialEnd || null,
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: subscriptionData.metadata || {},
        features: plan.features,
        limits: plan.limits
      };

      await redis.hset(`subscription:${subscription.id}`, subscription);
      this.subscriptions.set(subscription.id, subscription);
      
      // Update user subscription status
      await redis.hset(`user:${subscription.userId}`, {
        subscriptionId: subscription.id,
        planId: subscription.planId,
        subscriptionStatus: subscription.status
      });
      
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
   * Lấy subscription của user
   */
  async getUserSubscription(userId) {
    try {
      const userData = await redis.hgetall(`user:${userId}`);
      if (!userData.subscriptionId) {
        return null;
      }

      const subscription = await redis.hgetall(`subscription:${userData.subscriptionId}`);
      return subscription && subscription.id ? subscription : null;
    } catch (error) {
      console.error("Failed to get user subscription:", error.message);
      return null;
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
        
        // Downgrade to free plan
        await this.downgradeToFreePlan(subscription.userId);
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
   * Downgrade to free plan
   */
  async downgradeToFreePlan(userId) {
    try {
      const freePlan = this.subscriptionPlans.get('free');
      
      // Update user subscription
      await redis.hset(`user:${userId}`, {
        planId: 'free',
        subscriptionStatus: 'active'
      });

      // Create new free subscription
      const freeSubscription = await this.createSubscription({
        userId: userId,
        planId: 'free'
      });

      this.emit('subscription:downgraded', { userId, freeSubscription });
      return freeSubscription;
    } catch (error) {
      console.error("Failed to downgrade to free plan:", error.message);
      throw error;
    }
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(subscriptionId, newPlanId) {
    try {
      const subscription = await redis.hgetall(`subscription:${subscriptionId}`);
      if (!subscription || !subscription.id) {
        throw new Error("Subscription not found");
      }

      const newPlan = this.subscriptionPlans.get(newPlanId);
      if (!newPlan) {
        throw new Error(`Plan not found: ${newPlanId}`);
      }

      // Update subscription
      subscription.planId = newPlanId;
      subscription.planName = newPlan.name;
      subscription.features = newPlan.features;
      subscription.limits = newPlan.limits;
      subscription.updatedAt = new Date().toISOString();

      await redis.hset(`subscription:${subscriptionId}`, subscription);
      this.subscriptions.set(subscriptionId, subscription);
      
      // Update user plan
      await redis.hset(`user:${subscription.userId}`, {
        planId: newPlanId
      });
      
      this.emit('subscription:upgraded', subscription);
      return subscription;
    } catch (error) {
      console.error("Failed to upgrade subscription:", error.message);
      throw error;
    }
  }

  /**
   * Kiểm tra feature access
   */
  async checkFeatureAccess(userId, feature) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return false;
      }

      const plan = this.subscriptionPlans.get(subscription.planId);
      if (!plan) {
        return false;
      }

      return plan.features.includes(feature);
    } catch (error) {
      console.error("Failed to check feature access:", error.message);
      return false;
    }
  }

  /**
   * Kiểm tra limits
   */
  async checkLimits(userId, limitType, currentValue = 0) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { allowed: false, limit: 0, current: currentValue };
      }

      const plan = this.subscriptionPlans.get(subscription.planId);
      if (!plan) {
        return { allowed: false, limit: 0, current: currentValue };
      }

      const limit = plan.limits[limitType];
      if (limit === -1) {
        return { allowed: true, limit: -1, current: currentValue }; // Unlimited
      }

      const allowed = currentValue < limit;
      return { allowed, limit, current: currentValue };
    } catch (error) {
      console.error("Failed to check limits:", error.message);
      return { allowed: false, limit: 0, current: currentValue };
    }
  }

  /**
   * Tạo subscription plan mới
   */
  async createSubscriptionPlan(planData) {
    try {
      const plan = {
        id: planData.id,
        name: planData.name,
        description: planData.description,
        price: planData.price,
        currency: planData.currency || 'USD',
        interval: planData.interval || 'monthly',
        features: planData.features || [],
        limits: planData.limits || {},
        isActive: planData.isActive !== false,
        isPopular: planData.isPopular || false,
        createdAt: new Date().toISOString()
      };

      this.subscriptionPlans.set(plan.id, plan);
      await redis.hset(`subscription:plan:${plan.id}`, plan);
      
      this.emit('subscription:plan:created', plan);
      return plan;
    } catch (error) {
      console.error("Failed to create subscription plan:", error.message);
      throw error;
    }
  }

  /**
   * Cập nhật subscription plan
   */
  async updateSubscriptionPlan(planId, updates) {
    try {
      const plan = this.subscriptionPlans.get(planId);
      if (!plan) {
        throw new Error(`Subscription plan not found: ${planId}`);
      }

      Object.assign(plan, updates);
      plan.updatedAt = new Date().toISOString();

      await redis.hset(`subscription:plan:${planId}`, plan);
      
      this.emit('subscription:plan:updated', plan);
      return plan;
    } catch (error) {
      console.error("Failed to update subscription plan:", error.message);
      throw error;
    }
  }

  /**
   * Xóa subscription plan
   */
  async deleteSubscriptionPlan(planId) {
    try {
      const plan = this.subscriptionPlans.get(planId);
      if (!plan) {
        throw new Error(`Subscription plan not found: ${planId}`);
      }

      // Check if plan is in use
      const subscriptions = await redis.keys(`subscription:*`);
      for (const key of subscriptions) {
        const subscription = await redis.hgetall(key);
        if (subscription && subscription.planId === planId) {
          throw new Error(`Cannot delete plan that is in use by subscription ${subscription.id}`);
        }
      }

      this.subscriptionPlans.delete(planId);
      await redis.del(`subscription:plan:${planId}`);
      
      this.emit('subscription:plan:deleted', { planId });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete subscription plan:", error.message);
      throw error;
    }
  }

  /**
   * Lấy subscription statistics
   */
  async getSubscriptionStats() {
    try {
      const stats = {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        trialSubscriptions: 0,
        planStats: {},
        revenue: 0
      };

      const subscriptions = await redis.keys(`subscription:*`);
      for (const key of subscriptions) {
        const subscription = await redis.hgetall(key);
        if (subscription && subscription.id) {
          stats.totalSubscriptions++;
          
          switch (subscription.status) {
            case 'active':
              stats.activeSubscriptions++;
              break;
            case 'canceled':
              stats.canceledSubscriptions++;
              break;
          }

          if (subscription.trialEnd) {
            stats.trialSubscriptions++;
          }

          // Plan stats
          if (!stats.planStats[subscription.planId]) {
            stats.planStats[subscription.planId] = 0;
          }
          stats.planStats[subscription.planId]++;

          // Revenue calculation
          const plan = this.subscriptionPlans.get(subscription.planId);
          if (plan && plan.price > 0) {
            stats.revenue += plan.price;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error("Failed to get subscription stats:", error.message);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        trialSubscriptions: 0,
        planStats: {},
        revenue: 0
      };
    }
  }

  /**
   * Lấy tất cả subscription plans
   */
  getSubscriptionPlans() {
    return Array.from(this.subscriptionPlans.values());
  }

  /**
   * Lấy tất cả subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Lấy subscription plan by ID
   */
  getSubscriptionPlan(planId) {
    return this.subscriptionPlans.get(planId);
  }

  /**
   * Lấy subscription by ID
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await redis.hgetall(`subscription:${subscriptionId}`);
      return subscription && subscription.id ? subscription : null;
    } catch (error) {
      console.error("Failed to get subscription:", error.message);
      return null;
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
}

export const subscriptionService = new SubscriptionService();
