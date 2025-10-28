import { redis } from "../redis.js";
import { machineLearningService } from "./machineLearningService.js";
import EventEmitter from "events";

/**
 * Service Predictive Analytics cho dự đoán xu hướng và phân tích
 */
class PredictiveAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.predictions = new Map();
    this.trends = new Map();
    this.forecasts = new Map();
    this.initializeAnalytics();
  }

  /**
   * Khởi tạo analytics
   */
  initializeAnalytics() {
    this.predictions.set('gift_trends', {
      name: 'Gift Trends',
      type: 'trend_analysis',
      period: 'daily',
      lastUpdate: null
    });

    this.predictions.set('viewer_growth', {
      name: 'Viewer Growth',
      type: 'growth_forecast',
      period: 'weekly',
      lastUpdate: null
    });

    this.predictions.set('revenue_forecast', {
      name: 'Revenue Forecast',
      type: 'revenue_prediction',
      period: 'monthly',
      lastUpdate: null
    });

    this.predictions.set('peak_hours', {
      name: 'Peak Hours Analysis',
      type: 'time_analysis',
      period: 'daily',
      lastUpdate: null
    });
  }

  /**
   * Phân tích xu hướng gift
   */
  async analyzeGiftTrends(accountId, period = '7d') {
    try {
      const data = await this.getGiftData(accountId, period);
      if (data.length === 0) {
        throw new Error("No gift data available for analysis");
      }

      const analysis = {
        totalGifts: data.length,
        totalValue: data.reduce((sum, gift) => sum + gift.value, 0),
        averageValue: data.reduce((sum, gift) => sum + gift.value, 0) / data.length,
        trend: this.calculateTrend(data),
        peakHours: this.findPeakHours(data),
        popularGifts: this.findPopularGifts(data),
        growthRate: this.calculateGrowthRate(data),
        predictions: await this.predictGiftTrends(data),
        timestamp: new Date().toISOString()
      };

      // Store analysis
      await redis.hset(`analytics:gift_trends:${accountId}`, Date.now().toString(), JSON.stringify(analysis));

      this.emit('trend:analyzed', {
        type: 'gift_trends',
        accountId: accountId,
        analysis: analysis
      });

      return analysis;
    } catch (error) {
      console.error("Failed to analyze gift trends:", error.message);
      throw error;
    }
  }

  /**
   * Dự đoán tăng trưởng viewer
   */
  async predictViewerGrowth(accountId, forecastDays = 30) {
    try {
      const historicalData = await this.getViewerData(accountId, '30d');
      if (historicalData.length === 0) {
        throw new Error("No viewer data available for prediction");
      }

      const analysis = {
        currentViewers: historicalData[historicalData.length - 1]?.viewers || 0,
        averageViewers: historicalData.reduce((sum, day) => sum + day.viewers, 0) / historicalData.length,
        growthRate: this.calculateViewerGrowthRate(historicalData),
        forecast: this.generateViewerForecast(historicalData, forecastDays),
        confidence: this.calculateForecastConfidence(historicalData),
        factors: this.analyzeGrowthFactors(historicalData),
        recommendations: this.generateGrowthRecommendations(historicalData),
        timestamp: new Date().toISOString()
      };

      await redis.hset(`analytics:viewer_growth:${accountId}`, Date.now().toString(), JSON.stringify(analysis));

      this.emit('growth:predicted', {
        type: 'viewer_growth',
        accountId: accountId,
        analysis: analysis
      });

      return analysis;
    } catch (error) {
      console.error("Failed to predict viewer growth:", error.message);
      throw error;
    }
  }

  /**
   * Dự đoán revenue
   */
  async predictRevenue(accountId, forecastDays = 30) {
    try {
      const revenueData = await this.getRevenueData(accountId, '30d');
      if (revenueData.length === 0) {
        throw new Error("No revenue data available for prediction");
      }

      const analysis = {
        currentRevenue: revenueData[revenueData.length - 1]?.revenue || 0,
        averageRevenue: revenueData.reduce((sum, day) => sum + day.revenue, 0) / revenueData.length,
        revenueGrowth: this.calculateRevenueGrowth(revenueData),
        forecast: this.generateRevenueForecast(revenueData, forecastDays),
        confidence: this.calculateForecastConfidence(revenueData),
        seasonalPatterns: this.analyzeSeasonalPatterns(revenueData),
        recommendations: this.generateRevenueRecommendations(revenueData),
        timestamp: new Date().toISOString()
      };

      await redis.hset(`analytics:revenue_forecast:${accountId}`, Date.now().toString(), JSON.stringify(analysis));

      this.emit('revenue:predicted', {
        type: 'revenue_forecast',
        accountId: accountId,
        analysis: analysis
      });

      return analysis;
    } catch (error) {
      console.error("Failed to predict revenue:", error.message);
      throw error;
    }
  }

  /**
   * Phân tích giờ peak
   */
  async analyzePeakHours(accountId, period = '7d') {
    try {
      const data = await this.getStreamData(accountId, period);
      if (data.length === 0) {
        throw new Error("No stream data available for analysis");
      }

      const analysis = {
        peakHours: this.findPeakStreamingHours(data),
        optimalStreamingTimes: this.findOptimalStreamingTimes(data),
        viewerDistribution: this.analyzeViewerDistribution(data),
        engagementByHour: this.analyzeEngagementByHour(data),
        recommendations: this.generateTimingRecommendations(data),
        timestamp: new Date().toISOString()
      };

      await redis.hset(`analytics:peak_hours:${accountId}`, Date.now().toString(), JSON.stringify(analysis));

      return analysis;
    } catch (error) {
      console.error("Failed to analyze peak hours:", error.message);
      throw error;
    }
  }

  /**
   * Tạo báo cáo tổng hợp
   */
  async generateComprehensiveReport(accountId, period = '30d') {
    try {
      const giftTrends = await this.analyzeGiftTrends(accountId, period);
      const viewerGrowth = await this.predictViewerGrowth(accountId, 30);
      const revenueForecast = await this.predictRevenue(accountId, 30);
      const peakHours = await this.analyzePeakHours(accountId, period);

      const report = {
        accountId: accountId,
        period: period,
        generatedAt: new Date().toISOString(),
        summary: {
          totalGifts: giftTrends.totalGifts,
          totalRevenue: giftTrends.totalValue,
          averageViewers: viewerGrowth.averageViewers,
          growthRate: viewerGrowth.growthRate
        },
        insights: {
          giftTrends: giftTrends,
          viewerGrowth: viewerGrowth,
          revenueForecast: revenueForecast,
          peakHours: peakHours
        },
        recommendations: this.generateOverallRecommendations(giftTrends, viewerGrowth, revenueForecast, peakHours),
        confidence: this.calculateOverallConfidence(giftTrends, viewerGrowth, revenueForecast)
      };

      await redis.hset(`analytics:comprehensive_report:${accountId}`, Date.now().toString(), JSON.stringify(report));

      this.emit('report:generated', {
        type: 'comprehensive_report',
        accountId: accountId,
        report: report
      });

      return report;
    } catch (error) {
      console.error("Failed to generate comprehensive report:", error.message);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  calculateTrend(data) {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  findPeakHours(data) {
    const hourCounts = {};
    
    data.forEach(gift => {
      const hour = new Date(gift.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
  }

  findPopularGifts(data) {
    const giftCounts = {};
    
    data.forEach(gift => {
      giftCounts[gift.type] = (giftCounts[gift.type] || 0) + 1;
    });
    
    return Object.entries(giftCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  calculateGrowthRate(data) {
    if (data.length < 2) return 0;
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  async predictGiftTrends(data) {
    try {
      // Use ML service for prediction
      const prediction = await machineLearningService.predictNextGift('default', {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        viewerCount: data.length > 0 ? data[data.length - 1].viewers : 0,
        streamDuration: 3600,
        previousGifts: data.length
      });
      
      return {
        nextGiftProbability: prediction.probability,
        predictedValue: prediction.predictedValue,
        predictedType: prediction.predictedType,
        confidence: prediction.confidence
      };
    } catch (error) {
      return {
        nextGiftProbability: 0.5,
        predictedValue: 10,
        predictedType: 'Rose',
        confidence: 0.7
      };
    }
  }

  calculateViewerGrowthRate(data) {
    if (data.length < 2) return 0;
    
    const firstViewers = data[0].viewers;
    const lastViewers = data[data.length - 1].viewers;
    
    return ((lastViewers - firstViewers) / firstViewers) * 100;
  }

  generateViewerForecast(data, days) {
    const forecast = [];
    const growthRate = this.calculateViewerGrowthRate(data) / 100;
    const currentViewers = data[data.length - 1]?.viewers || 0;
    
    for (let i = 1; i <= days; i++) {
      const predictedViewers = Math.round(currentViewers * Math.pow(1 + growthRate, i));
      forecast.push({
        day: i,
        predictedViewers: predictedViewers,
        confidence: Math.max(0.5, 1 - (i * 0.02)) // Decreasing confidence over time
      });
    }
    
    return forecast;
  }

  calculateForecastConfidence(data) {
    // Calculate confidence based on data consistency
    if (data.length < 7) return 0.5;
    
    const values = data.map(d => d.viewers || d.revenue || d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficient = stdDev / mean;
    
    // Lower coefficient = higher confidence
    return Math.max(0.3, Math.min(0.95, 1 - coefficient));
  }

  analyzeGrowthFactors(data) {
    return {
      consistency: this.calculateConsistency(data),
      seasonality: this.detectSeasonality(data),
      trend: this.calculateTrend(data),
      volatility: this.calculateVolatility(data)
    };
  }

  generateGrowthRecommendations(data) {
    const recommendations = [];
    const growthRate = this.calculateViewerGrowthRate(data);
    
    if (growthRate > 10) {
      recommendations.push("Excellent growth! Consider scaling up your content production.");
    } else if (growthRate > 0) {
      recommendations.push("Positive growth trend. Focus on consistency to maintain momentum.");
    } else {
      recommendations.push("Growth is slowing. Consider new content strategies or engagement tactics.");
    }
    
    return recommendations;
  }

  calculateRevenueGrowth(data) {
    if (data.length < 2) return 0;
    
    const firstRevenue = data[0].revenue;
    const lastRevenue = data[data.length - 1].revenue;
    
    return ((lastRevenue - firstRevenue) / firstRevenue) * 100;
  }

  generateRevenueForecast(data, days) {
    const forecast = [];
    const growthRate = this.calculateRevenueGrowth(data) / 100;
    const currentRevenue = data[data.length - 1]?.revenue || 0;
    
    for (let i = 1; i <= days; i++) {
      const predictedRevenue = Math.round(currentRevenue * Math.pow(1 + growthRate, i) * 100) / 100;
      forecast.push({
        day: i,
        predictedRevenue: predictedRevenue,
        confidence: Math.max(0.5, 1 - (i * 0.02))
      });
    }
    
    return forecast;
  }

  analyzeSeasonalPatterns(data) {
    // Simple seasonal analysis
    const patterns = {
      weekly: this.analyzeWeeklyPatterns(data),
      monthly: this.analyzeMonthlyPatterns(data)
    };
    
    return patterns;
  }

  generateRevenueRecommendations(data) {
    const recommendations = [];
    const revenueGrowth = this.calculateRevenueGrowth(data);
    
    if (revenueGrowth > 20) {
      recommendations.push("Strong revenue growth! Consider premium content or merchandise.");
    } else if (revenueGrowth > 0) {
      recommendations.push("Steady revenue growth. Focus on viewer engagement to increase gifts.");
    } else {
      recommendations.push("Revenue is declining. Review your content strategy and viewer interaction.");
    }
    
    return recommendations;
  }

  findPeakStreamingHours(data) {
    const hourCounts = {};
    
    data.forEach(stream => {
      const hour = new Date(stream.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
  }

  findOptimalStreamingTimes(data) {
    // Analyze when streams get the most viewers
    const timeSlots = {
      morning: { start: 6, end: 12, viewers: 0, count: 0 },
      afternoon: { start: 12, end: 18, viewers: 0, count: 0 },
      evening: { start: 18, end: 24, viewers: 0, count: 0 },
      night: { start: 0, end: 6, viewers: 0, count: 0 }
    };
    
    data.forEach(stream => {
      const hour = new Date(stream.startTime).getHours();
      for (const [slot, info] of Object.entries(timeSlots)) {
        if (hour >= info.start && hour < info.end) {
          info.viewers += stream.peakViewers;
          info.count++;
        }
      }
    });
    
    // Calculate averages
    for (const [slot, info] of Object.entries(timeSlots)) {
      info.averageViewers = info.count > 0 ? info.viewers / info.count : 0;
    }
    
    return timeSlots;
  }

  analyzeViewerDistribution(data) {
    const distribution = {
      totalViewers: 0,
      uniqueViewers: new Set(),
      averageViewers: 0,
      peakViewers: 0
    };
    
    data.forEach(stream => {
      distribution.totalViewers += stream.viewers;
      distribution.uniqueViewers.add(stream.viewerId);
      distribution.peakViewers = Math.max(distribution.peakViewers, stream.peakViewers);
    });
    
    distribution.averageViewers = distribution.totalViewers / data.length;
    distribution.uniqueViewerCount = distribution.uniqueViewers.size;
    
    return distribution;
  }

  analyzeEngagementByHour(data) {
    const engagementByHour = {};
    
    data.forEach(stream => {
      const hour = new Date(stream.startTime).getHours();
      if (!engagementByHour[hour]) {
        engagementByHour[hour] = { totalEngagement: 0, count: 0 };
      }
      engagementByHour[hour].totalEngagement += stream.engagementRate;
      engagementByHour[hour].count++;
    });
    
    // Calculate averages
    for (const hour in engagementByHour) {
      engagementByHour[hour].averageEngagement = 
        engagementByHour[hour].totalEngagement / engagementByHour[hour].count;
    }
    
    return engagementByHour;
  }

  generateTimingRecommendations(data) {
    const recommendations = [];
    const optimalTimes = this.findOptimalStreamingTimes(data);
    
    const bestSlot = Object.entries(optimalTimes)
      .sort(([,a], [,b]) => b.averageViewers - a.averageViewers)[0];
    
    recommendations.push(`Best streaming time: ${bestSlot[0]} (${bestSlot[1].averageViewers} avg viewers)`);
    
    return recommendations;
  }

  generateOverallRecommendations(giftTrends, viewerGrowth, revenueForecast, peakHours) {
    const recommendations = [];
    
    if (giftTrends.trend === 'increasing') {
      recommendations.push("Gift trends are positive! Continue engaging with your audience.");
    }
    
    if (viewerGrowth.growthRate > 10) {
      recommendations.push("Strong viewer growth! Consider expanding your content variety.");
    }
    
    if (revenueForecast.revenueGrowth > 20) {
      recommendations.push("Excellent revenue growth! Consider premium features or merchandise.");
    }
    
    return recommendations;
  }

  calculateOverallConfidence(giftTrends, viewerGrowth, revenueForecast) {
    const confidences = [
      giftTrends.confidence || 0.7,
      viewerGrowth.confidence || 0.7,
      revenueForecast.confidence || 0.7
    ];
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  calculateConsistency(data) {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.viewers || d.revenue || d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, 1 - (stdDev / mean));
  }

  detectSeasonality(data) {
    // Simple seasonality detection
    if (data.length < 7) return false;
    
    const weeklyPattern = [];
    for (let i = 0; i < 7; i++) {
      const dayData = data.filter((_, index) => index % 7 === i);
      if (dayData.length > 0) {
        weeklyPattern.push(dayData.reduce((sum, d) => sum + (d.viewers || d.revenue || d.value), 0) / dayData.length);
      }
    }
    
    // Check if there's a clear weekly pattern
    const max = Math.max(...weeklyPattern);
    const min = Math.min(...weeklyPattern);
    return (max - min) / max > 0.2; // 20% variation indicates seasonality
  }

  calculateVolatility(data) {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.viewers || d.revenue || d.value);
    const returns = [];
    
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1]);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  analyzeWeeklyPatterns(data) {
    const weeklyData = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    data.forEach(item => {
      const dayOfWeek = new Date(item.timestamp).getDay();
      weeklyData[dayOfWeek].push(item.viewers || item.revenue || item.value);
    });
    
    const weeklyAverages = {};
    for (const [day, values] of Object.entries(weeklyData)) {
      weeklyAverages[day] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }
    
    return weeklyAverages;
  }

  analyzeMonthlyPatterns(data) {
    const monthlyData = {};
    
    data.forEach(item => {
      const month = new Date(item.timestamp).getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(item.viewers || item.revenue || item.value);
    });
    
    const monthlyAverages = {};
    for (const [month, values] of Object.entries(monthlyData)) {
      monthlyAverages[month] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    return monthlyAverages;
  }

  /**
   * Data retrieval methods
   */
  async getGiftData(accountId, period) {
    try {
      const keys = await redis.keys(`gifts:${accountId}:*`);
      const data = [];
      
      for (const key of keys) {
        const giftData = await redis.hgetall(key);
        if (giftData) {
          data.push({
            value: parseInt(giftData.value) || 0,
            type: giftData.type || 'unknown',
            timestamp: giftData.timestamp,
            viewers: parseInt(giftData.viewers) || 0
          });
        }
      }
      
      return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      return [];
    }
  }

  async getViewerData(accountId, period) {
    try {
      const keys = await redis.keys(`viewers:${accountId}:*`);
      const data = [];
      
      for (const key of keys) {
        const viewerData = await redis.hgetall(key);
        if (viewerData) {
          data.push({
            viewers: parseInt(viewerData.count) || 0,
            timestamp: viewerData.timestamp
          });
        }
      }
      
      return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      return [];
    }
  }

  async getRevenueData(accountId, period) {
    try {
      const keys = await redis.keys(`revenue:${accountId}:*`);
      const data = [];
      
      for (const key of keys) {
        const revenueData = await redis.hgetall(key);
        if (revenueData) {
          data.push({
            revenue: parseFloat(revenueData.amount) || 0,
            timestamp: revenueData.timestamp
          });
        }
      }
      
      return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      return [];
    }
  }

  async getStreamData(accountId, period) {
    try {
      const keys = await redis.keys(`streams:${accountId}:*`);
      const data = [];
      
      for (const key of keys) {
        const streamData = await redis.hgetall(key);
        if (streamData) {
          data.push({
            startTime: streamData.startTime,
            duration: parseInt(streamData.duration) || 0,
            peakViewers: parseInt(streamData.peakViewers) || 0,
            viewers: parseInt(streamData.viewers) || 0,
            engagementRate: parseFloat(streamData.engagementRate) || 0,
            viewerId: streamData.viewerId
          });
        }
      }
      
      return data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    } catch (error) {
      return [];
    }
  }

  /**
   * Lấy trạng thái analytics
   */
  getAnalyticsStatus() {
    const status = {};
    for (const [key, prediction] of this.predictions) {
      status[key] = {
        name: prediction.name,
        type: prediction.type,
        period: prediction.period,
        lastUpdate: prediction.lastUpdate
      };
    }
    return status;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
