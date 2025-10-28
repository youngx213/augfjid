import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Affiliate System cho hệ thống
 */
class AffiliateService extends EventEmitter {
  constructor() {
    super();
    this.affiliates = new Map();
    this.commissions = new Map();
    this.referrals = new Map();
    this.payouts = new Map();
    this.initializeAffiliateData();
  }

  /**
   * Khởi tạo dữ liệu affiliate
   */
  initializeAffiliateData() {
    // Commission rates
    this.commissionRates = {
      subscription: {
        basic: 0.20, // 20% commission
        pro: 0.25,   // 25% commission
        enterprise: 0.30 // 30% commission
      },
      one_time: {
        default: 0.15 // 15% commission
      }
    };

    // Payout thresholds
    this.payoutThresholds = {
      minimum: 50, // Minimum $50 to request payout
      maximum: 10000 // Maximum $10,000 per payout
    };

    // Payout methods
    this.payoutMethods = {
      paypal: {
        name: 'PayPal',
        enabled: true,
        processingTime: '1-3 business days'
      },
      bank_transfer: {
        name: 'Bank Transfer',
        enabled: true,
        processingTime: '3-5 business days'
      },
      crypto: {
        name: 'Cryptocurrency',
        enabled: true,
        processingTime: '1-2 business days'
      }
    };
  }

  /**
   * Tạo affiliate account
   */
  async createAffiliate(affiliateData) {
    try {
      const affiliate = {
        id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: affiliateData.userId,
        referralCode: this.generateReferralCode(),
        status: 'pending', // pending, active, suspended, terminated
        commissionRate: affiliateData.commissionRate || this.commissionRates.subscription.basic,
        totalEarnings: 0,
        totalPayouts: 0,
        pendingEarnings: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        conversionRate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: null,
        payoutMethod: affiliateData.payoutMethod || 'paypal',
        payoutDetails: affiliateData.payoutDetails || {},
        metadata: affiliateData.metadata || {}
      };

      await redis.hset(`affiliate:${affiliate.id}`, affiliate);
      this.affiliates.set(affiliate.id, affiliate);
      
      // Add to user's affiliate record
      await redis.hset(`user:${affiliate.userId}`, {
        affiliateId: affiliate.id,
        affiliateStatus: affiliate.status
      });
      
      this.emit('affiliate:created', affiliate);
      return affiliate;
    } catch (error) {
      console.error("Failed to create affiliate:", error.message);
      throw error;
    }
  }

  /**
   * Tạo referral code
   */
  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Approve affiliate
   */
  async approveAffiliate(affiliateId) {
    try {
      const affiliate = await redis.hgetall(`affiliate:${affiliateId}`);
      if (!affiliate || !affiliate.id) {
        throw new Error("Affiliate not found");
      }

      affiliate.status = 'active';
      affiliate.approvedAt = new Date().toISOString();
      affiliate.updatedAt = new Date().toISOString();

      await redis.hset(`affiliate:${affiliateId}`, affiliate);
      this.affiliates.set(affiliateId, affiliate);
      
      // Update user status
      await redis.hset(`user:${affiliate.userId}`, {
        affiliateStatus: 'active'
      });
      
      this.emit('affiliate:approved', affiliate);
      return affiliate;
    } catch (error) {
      console.error("Failed to approve affiliate:", error.message);
      throw error;
    }
  }

  /**
   * Tạo referral
   */
  async createReferral(referralData) {
    try {
      const referral = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        affiliateId: referralData.affiliateId,
        referredUserId: referralData.referredUserId,
        referralCode: referralData.referralCode,
        status: 'pending', // pending, converted, expired
        conversionType: null, // subscription, one_time
        conversionValue: 0,
        commissionEarned: 0,
        commissionStatus: 'pending', // pending, approved, paid
        createdAt: new Date().toISOString(),
        convertedAt: null,
        expiresAt: this.calculateExpirationDate(),
        metadata: referralData.metadata || {}
      };

      await redis.hset(`referral:${referral.id}`, referral);
      this.referrals.set(referral.id, referral);
      
      // Add to affiliate's referrals
      await redis.lpush(`affiliate:${referral.affiliateId}:referrals`, referral.id);
      
      // Add to user's referral record
      await redis.hset(`user:${referral.referredUserId}`, {
        referredBy: referral.affiliateId,
        referralCode: referral.referralCode
      });
      
      this.emit('referral:created', referral);
      return referral;
    } catch (error) {
      console.error("Failed to create referral:", error.message);
      throw error;
    }
  }

  /**
   * Tính toán expiration date
   */
  calculateExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 days
    return expirationDate.toISOString();
  }

  /**
   * Convert referral
   */
  async convertReferral(referralId, conversionData) {
    try {
      const referral = await redis.hgetall(`referral:${referralId}`);
      if (!referral || !referral.id) {
        throw new Error("Referral not found");
      }

      if (referral.status !== 'pending') {
        throw new Error("Referral already converted or expired");
      }

      // Calculate commission
      const commissionRate = this.getCommissionRate(conversionData.type, conversionData.plan);
      const commissionEarned = conversionData.value * commissionRate;

      // Update referral
      referral.status = 'converted';
      referral.conversionType = conversionData.type;
      referral.conversionValue = conversionData.value;
      referral.commissionEarned = commissionEarned;
      referral.commissionStatus = 'approved';
      referral.convertedAt = new Date().toISOString();
      referral.updatedAt = new Date().toISOString();

      await redis.hset(`referral:${referralId}`, referral);
      this.referrals.set(referralId, referral);

      // Update affiliate earnings
      await this.updateAffiliateEarnings(referral.affiliateId, commissionEarned);

      // Create commission record
      await this.createCommission({
        affiliateId: referral.affiliateId,
        referralId: referralId,
        amount: commissionEarned,
        type: conversionData.type,
        status: 'approved'
      });

      this.emit('referral:converted', referral);
      return referral;
    } catch (error) {
      console.error("Failed to convert referral:", error.message);
      throw error;
    }
  }

  /**
   * Lấy commission rate
   */
  getCommissionRate(type, plan = null) {
    if (type === 'subscription' && plan) {
      return this.commissionRates.subscription[plan] || this.commissionRates.subscription.basic;
    }
    return this.commissionRates.one_time.default;
  }

  /**
   * Cập nhật affiliate earnings
   */
  async updateAffiliateEarnings(affiliateId, amount) {
    try {
      const affiliate = await redis.hgetall(`affiliate:${affiliateId}`);
      if (!affiliate || !affiliate.id) {
        throw new Error("Affiliate not found");
      }

      affiliate.totalEarnings += amount;
      affiliate.pendingEarnings += amount;
      affiliate.totalReferrals += 1;
      affiliate.activeReferrals += 1;
      affiliate.updatedAt = new Date().toISOString();

      await redis.hset(`affiliate:${affiliateId}`, affiliate);
      this.affiliates.set(affiliateId, affiliate);
      
      this.emit('affiliate:earnings:updated', { affiliateId, amount, affiliate });
      return affiliate;
    } catch (error) {
      console.error("Failed to update affiliate earnings:", error.message);
      throw error;
    }
  }

  /**
   * Tạo commission record
   */
  async createCommission(commissionData) {
    try {
      const commission = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        affiliateId: commissionData.affiliateId,
        referralId: commissionData.referralId,
        amount: commissionData.amount,
        type: commissionData.type,
        status: commissionData.status || 'pending',
        createdAt: new Date().toISOString(),
        paidAt: null,
        payoutId: null,
        metadata: commissionData.metadata || {}
      };

      await redis.hset(`commission:${commission.id}`, commission);
      this.commissions.set(commission.id, commission);
      
      this.emit('commission:created', commission);
      return commission;
    } catch (error) {
      console.error("Failed to create commission:", error.message);
      throw error;
    }
  }

  /**
   * Tạo payout request
   */
  async createPayoutRequest(payoutData) {
    try {
      const affiliate = await redis.hgetall(`affiliate:${payoutData.affiliateId}`);
      if (!affiliate || !affiliate.id) {
        throw new Error("Affiliate not found");
      }

      if (affiliate.pendingEarnings < this.payoutThresholds.minimum) {
        throw new Error(`Minimum payout amount is $${this.payoutThresholds.minimum}`);
      }

      const payout = {
        id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        affiliateId: payoutData.affiliateId,
        amount: Math.min(affiliate.pendingEarnings, this.payoutThresholds.maximum),
        method: affiliate.payoutMethod,
        details: affiliate.payoutDetails,
        status: 'pending', // pending, processing, completed, failed
        requestedAt: new Date().toISOString(),
        processedAt: null,
        completedAt: null,
        transactionId: null,
        notes: payoutData.notes || '',
        metadata: payoutData.metadata || {}
      };

      await redis.hset(`payout:${payout.id}`, payout);
      this.payouts.set(payout.id, payout);
      
      // Update affiliate pending earnings
      affiliate.pendingEarnings -= payout.amount;
      affiliate.updatedAt = new Date().toISOString();
      await redis.hset(`affiliate:${payoutData.affiliateId}`, affiliate);
      
      this.emit('payout:requested', payout);
      return payout;
    } catch (error) {
      console.error("Failed to create payout request:", error.message);
      throw error;
    }
  }

  /**
   * Process payout
   */
  async processPayout(payoutId, transactionId) {
    try {
      const payout = await redis.hset(`payout:${payoutId}`, {
        status: 'processing',
        transactionId: transactionId,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      this.emit('payout:processing', payout);
      return payout;
    } catch (error) {
      console.error("Failed to process payout:", error.message);
      throw error;
    }
  }

  /**
   * Complete payout
   */
  async completePayout(payoutId) {
    try {
      const payout = await redis.hgetall(`payout:${payoutId}`);
      if (!payout || !payout.id) {
        throw new Error("Payout not found");
      }

      payout.status = 'completed';
      payout.completedAt = new Date().toISOString();
      payout.updatedAt = new Date().toISOString();

      await redis.hset(`payout:${payoutId}`, payout);
      this.payouts.set(payoutId, payout);

      // Update affiliate total payouts
      const affiliate = await redis.hgetall(`affiliate:${payout.affiliateId}`);
      if (affiliate && affiliate.id) {
        affiliate.totalPayouts += payout.amount;
        affiliate.updatedAt = new Date().toISOString();
        await redis.hset(`affiliate:${payout.affiliateId}`, affiliate);
      }

      this.emit('payout:completed', payout);
      return payout;
    } catch (error) {
      console.error("Failed to complete payout:", error.message);
      throw error;
    }
  }

  /**
   * Lấy affiliate by ID
   */
  async getAffiliate(affiliateId) {
    try {
      const affiliate = await redis.hgetall(`affiliate:${affiliateId}`);
      return affiliate && affiliate.id ? affiliate : null;
    } catch (error) {
      console.error("Failed to get affiliate:", error.message);
      return null;
    }
  }

  /**
   * Lấy affiliate by user ID
   */
  async getAffiliateByUserId(userId) {
    try {
      const userData = await redis.hgetall(`user:${userId}`);
      if (!userData.affiliateId) {
        return null;
      }

      return await this.getAffiliate(userData.affiliateId);
    } catch (error) {
      console.error("Failed to get affiliate by user ID:", error.message);
      return null;
    }
  }

  /**
   * Lấy referrals của affiliate
   */
  async getAffiliateReferrals(affiliateId, limit = 50) {
    try {
      const referralIds = await redis.lrange(`affiliate:${affiliateId}:referrals`, 0, limit - 1);
      const referrals = [];

      for (const referralId of referralIds) {
        const referral = await redis.hgetall(`referral:${referralId}`);
        if (referral && referral.id) {
          referrals.push(referral);
        }
      }

      return referrals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to get affiliate referrals:", error.message);
      return [];
    }
  }

  /**
   * Lấy commissions của affiliate
   */
  async getAffiliateCommissions(affiliateId, limit = 50) {
    try {
      const commissionKeys = await redis.keys(`commission:*`);
      const commissions = [];

      for (const key of commissionKeys) {
        const commission = await redis.hgetall(key);
        if (commission && commission.affiliateId === affiliateId) {
          commissions.push(commission);
        }
      }

      return commissions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get affiliate commissions:", error.message);
      return [];
    }
  }

  /**
   * Lấy payouts của affiliate
   */
  async getAffiliatePayouts(affiliateId, limit = 50) {
    try {
      const payoutKeys = await redis.keys(`payout:*`);
      const payouts = [];

      for (const key of payoutKeys) {
        const payout = await redis.hgetall(key);
        if (payout && payout.affiliateId === affiliateId) {
          payouts.push(payout);
        }
      }

      return payouts
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get affiliate payouts:", error.message);
      return [];
    }
  }

  /**
   * Lấy affiliate statistics
   */
  async getAffiliateStats(affiliateId = null) {
    try {
      const stats = {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalReferrals: 0,
        totalCommissions: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        conversionRate: 0
      };

      const affiliateKeys = await redis.keys(`affiliate:*`);
      let totalConversions = 0;
      let totalReferrals = 0;

      for (const key of affiliateKeys) {
        const affiliate = await redis.hgetall(key);
        if (affiliate && affiliate.id && (!affiliateId || affiliate.id === affiliateId)) {
          stats.totalAffiliates++;
          
          if (affiliate.status === 'active') {
            stats.activeAffiliates++;
          }

          stats.totalReferrals += parseInt(affiliate.totalReferrals) || 0;
          stats.totalCommissions += parseFloat(affiliate.totalEarnings) || 0;
          stats.totalPayouts += parseFloat(affiliate.totalPayouts) || 0;
          stats.pendingPayouts += parseFloat(affiliate.pendingEarnings) || 0;

          totalReferrals += parseInt(affiliate.totalReferrals) || 0;
          totalConversions += parseInt(affiliate.activeReferrals) || 0;
        }
      }

      if (totalReferrals > 0) {
        stats.conversionRate = (totalConversions / totalReferrals) * 100;
      }

      return stats;
    } catch (error) {
      console.error("Failed to get affiliate stats:", error.message);
      return {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalReferrals: 0,
        totalCommissions: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        conversionRate: 0
      };
    }
  }

  /**
   * Lấy tất cả affiliates
   */
  async getAllAffiliates(limit = 50) {
    try {
      const affiliateKeys = await redis.keys(`affiliate:*`);
      const affiliates = [];

      for (const key of affiliateKeys) {
        const affiliate = await redis.hgetall(key);
        if (affiliate && affiliate.id) {
          affiliates.push(affiliate);
        }
      }

      return affiliates
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get all affiliates:", error.message);
      return [];
    }
  }

  /**
   * Lấy tất cả payouts
   */
  async getAllPayouts(limit = 50) {
    try {
      const payoutKeys = await redis.keys(`payout:*`);
      const payouts = [];

      for (const key of payoutKeys) {
        const payout = await redis.hgetall(key);
        if (payout && payout.id) {
          payouts.push(payout);
        }
      }

      return payouts
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get all payouts:", error.message);
      return [];
    }
  }

  /**
   * Lấy commission rates
   */
  getCommissionRates() {
    return this.commissionRates;
  }

  /**
   * Lấy payout thresholds
   */
  getPayoutThresholds() {
    return this.payoutThresholds;
  }

  /**
   * Lấy payout methods
   */
  getPayoutMethods() {
    return this.payoutMethods;
  }

  /**
   * Cập nhật commission rates
   */
  async updateCommissionRates(rates) {
    try {
      this.commissionRates = { ...this.commissionRates, ...rates };
      await redis.hset('affiliate:config', 'commissionRates', JSON.stringify(this.commissionRates));
      
      this.emit('commission:rates:updated', this.commissionRates);
      return this.commissionRates;
    } catch (error) {
      console.error("Failed to update commission rates:", error.message);
      throw error;
    }
  }

  /**
   * Cập nhật payout thresholds
   */
  async updatePayoutThresholds(thresholds) {
    try {
      this.payoutThresholds = { ...this.payoutThresholds, ...thresholds };
      await redis.hset('affiliate:config', 'payoutThresholds', JSON.stringify(this.payoutThresholds));
      
      this.emit('payout:thresholds:updated', this.payoutThresholds);
      return this.payoutThresholds;
    } catch (error) {
      console.error("Failed to update payout thresholds:", error.message);
      throw error;
    }
  }
}

export const affiliateService = new AffiliateService();
