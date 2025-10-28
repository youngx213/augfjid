import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service phân tích và giám sát hiệu suất hệ thống
 */
class AnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.realTimeData = new Map();
    this.aggregatedData = new Map();
  }

  /**
   * Khởi tạo analytics cho account
   */
  initAnalytics(accountId) {
    const analytics = {
      accountId,
      startTime: Date.now(),
      totalGifts: 0,
      totalCommands: 0,
      totalErrors: 0,
      totalRevenue: 0,
      uniqueViewers: new Set(),
      giftTypes: new Map(),
      commandTypes: new Map(),
      errorTypes: new Map(),
      hourlyStats: new Map(),
      dailyStats: new Map()
    };

    this.metrics.set(accountId, analytics);
    this.realTimeData.set(accountId, {
      currentViewers: 0,
      currentGifts: 0,
      currentCommands: 0,
      lastUpdate: Date.now()
    });

    return analytics;
  }

  /**
   * Ghi nhận gift được nhận
   */
  recordGift(accountId, giftData) {
    const analytics = this.metrics.get(accountId);
    if (!analytics) {
      this.initAnalytics(accountId);
      return this.recordGift(accountId, giftData);
    }

    const { giftName, giftValue, username, timestamp = Date.now() } = giftData;
    
    // Cập nhật counters
    analytics.totalGifts++;
    analytics.totalRevenue += giftValue;
    analytics.uniqueViewers.add(username);
    
    // Cập nhật gift types
    const currentCount = analytics.giftTypes.get(giftName) || 0;
    analytics.giftTypes.set(giftName, currentCount + 1);
    
    // Cập nhật hourly stats
    const hour = new Date(timestamp).getHours();
    const hourKey = `${new Date(timestamp).toDateString()}:${hour}`;
    const hourStats = analytics.hourlyStats.get(hourKey) || { gifts: 0, revenue: 0, viewers: new Set() };
    hourStats.gifts++;
    hourStats.revenue += giftValue;
    hourStats.viewers.add(username);
    analytics.hourlyStats.set(hourKey, hourStats);
    
    // Cập nhật daily stats
    const dayKey = new Date(timestamp).toDateString();
    const dayStats = analytics.dailyStats.get(dayKey) || { gifts: 0, revenue: 0, viewers: new Set() };
    dayStats.gifts++;
    dayStats.revenue += giftValue;
    dayStats.viewers.add(username);
    analytics.dailyStats.set(dayKey, dayStats);
    
    // Cập nhật real-time data
    this.updateRealTimeData(accountId, 'gifts');
    
    // Emit event
    this.emit('gift:recorded', { accountId, giftData, analytics: this.getAnalyticsSummary(accountId) });
    
    // Lưu vào Redis cho persistence
    this.saveToRedis(accountId);
  }

  /**
   * Ghi nhận command được thực thi
   */
  recordCommand(accountId, commandData) {
    const analytics = this.metrics.get(accountId);
    if (!analytics) {
      this.initAnalytics(accountId);
      return this.recordCommand(accountId, commandData);
    }

    const { command, success, executionTime, timestamp = Date.now() } = commandData;
    
    // Cập nhật counters
    analytics.totalCommands++;
    if (!success) analytics.totalErrors++;
    
    // Cập nhật command types
    const commandType = command.split(' ')[0]; // Lấy command đầu tiên
    const currentCount = analytics.commandTypes.get(commandType) || 0;
    analytics.commandTypes.set(commandType, currentCount + 1);
    
    // Cập nhật error types nếu có lỗi
    if (!success) {
      const errorType = commandData.errorType || 'unknown';
      const currentCount = analytics.errorTypes.get(errorType) || 0;
      analytics.errorTypes.set(errorType, currentCount + 1);
    }
    
    // Cập nhật real-time data
    this.updateRealTimeData(accountId, 'commands');
    
    // Emit event
    this.emit('command:recorded', { accountId, commandData, analytics: this.getAnalyticsSummary(accountId) });
    
    // Lưu vào Redis
    this.saveToRedis(accountId);
  }

  /**
   * Ghi nhận viewer
   */
  recordViewer(accountId, viewerData) {
    const analytics = this.metrics.get(accountId);
    if (!analytics) {
      this.initAnalytics(accountId);
      return this.recordViewer(accountId, viewerData);
    }

    const { username, timestamp = Date.now() } = viewerData;
    
    // Cập nhật unique viewers
    analytics.uniqueViewers.add(username);
    
    // Cập nhật real-time data
    this.updateRealTimeData(accountId, 'viewers');
    
    // Emit event
    this.emit('viewer:recorded', { accountId, viewerData, analytics: this.getAnalyticsSummary(accountId) });
  }

  /**
   * Cập nhật real-time data
   */
  updateRealTimeData(accountId, type) {
    const realTimeData = this.realTimeData.get(accountId);
    if (!realTimeData) return;

    realTimeData.lastUpdate = Date.now();
    
    switch (type) {
      case 'gifts':
        realTimeData.currentGifts++;
        break;
      case 'commands':
        realTimeData.currentCommands++;
        break;
      case 'viewers':
        realTimeData.currentViewers++;
        break;
    }
    
    // Emit real-time update
    this.emit('realtime:update', { accountId, realTimeData });
  }

  /**
   * Lấy analytics summary
   */
  getAnalyticsSummary(accountId) {
    const analytics = this.metrics.get(accountId);
    if (!analytics) return null;

    const uptime = Date.now() - analytics.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      accountId,
      uptime: uptime,
      uptimeHours: uptimeHours,
      totalGifts: analytics.totalGifts,
      totalCommands: analytics.totalCommands,
      totalErrors: analytics.totalErrors,
      totalRevenue: analytics.totalRevenue,
      uniqueViewers: analytics.uniqueViewers.size,
      errorRate: analytics.totalCommands > 0 ? (analytics.totalErrors / analytics.totalCommands) * 100 : 0,
      giftsPerHour: uptimeHours > 0 ? analytics.totalGifts / uptimeHours : 0,
      commandsPerHour: uptimeHours > 0 ? analytics.totalCommands / uptimeHours : 0,
      revenuePerHour: uptimeHours > 0 ? analytics.totalRevenue / uptimeHours : 0,
      topGifts: this.getTopItems(analytics.giftTypes, 5),
      topCommands: this.getTopItems(analytics.commandTypes, 5),
      topErrors: this.getTopItems(analytics.errorTypes, 5),
      hourlyStats: this.getHourlyStats(analytics),
      dailyStats: this.getDailyStats(analytics)
    };
  }

  /**
   * Lấy top items từ Map
   */
  getTopItems(map, limit = 5) {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ name: key, count: value }));
  }

  /**
   * Lấy hourly stats
   */
  getHourlyStats(analytics) {
    const hourlyStats = [];
    for (const [key, stats] of analytics.hourlyStats) {
      hourlyStats.push({
        hour: key,
        gifts: stats.gifts,
        revenue: stats.revenue,
        viewers: stats.viewers.size
      });
    }
    return hourlyStats.sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Lấy daily stats
   */
  getDailyStats(analytics) {
    const dailyStats = [];
    for (const [key, stats] of analytics.dailyStats) {
      dailyStats.push({
        date: key,
        gifts: stats.gifts,
        revenue: stats.revenue,
        viewers: stats.viewers.size
      });
    }
    return dailyStats.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Lấy real-time data
   */
  getRealTimeData(accountId) {
    return this.realTimeData.get(accountId) || null;
  }

  /**
   * Lấy tất cả analytics
   */
  getAllAnalytics() {
    const allAnalytics = {};
    for (const [accountId] of this.metrics) {
      allAnalytics[accountId] = this.getAnalyticsSummary(accountId);
    }
    return allAnalytics;
  }

  /**
   * Lấy tất cả real-time data
   */
  getAllRealTimeData() {
    const allRealTimeData = {};
    for (const [accountId, data] of this.realTimeData) {
      allRealTimeData[accountId] = data;
    }
    return allRealTimeData;
  }

  /**
   * Lưu analytics vào Redis
   */
  async saveToRedis(accountId) {
    const analytics = this.metrics.get(accountId);
    if (!analytics) return;

    try {
      const summary = this.getAnalyticsSummary(accountId);
      await redis.hset(`analytics:${accountId}`, {
        data: JSON.stringify(summary),
        lastUpdate: Date.now()
      });
      
      // Lưu real-time data
      const realTimeData = this.realTimeData.get(accountId);
      if (realTimeData) {
        await redis.hset(`realtime:${accountId}`, {
          data: JSON.stringify(realTimeData),
          lastUpdate: Date.now()
        });
      }
    } catch (error) {
      console.error('Error saving analytics to Redis:', error);
    }
  }

  /**
   * Load analytics từ Redis
   */
  async loadFromRedis(accountId) {
    try {
      const analyticsData = await redis.hgetall(`analytics:${accountId}`);
      const realTimeData = await redis.hgetall(`realtime:${accountId}`);
      
      if (analyticsData.data) {
        const summary = JSON.parse(analyticsData.data);
        // Reconstruct analytics object từ summary
        this.reconstructAnalytics(accountId, summary);
      }
      
      if (realTimeData.data) {
        const realTime = JSON.parse(realTimeData.data);
        this.realTimeData.set(accountId, realTime);
      }
    } catch (error) {
      console.error('Error loading analytics from Redis:', error);
    }
  }

  /**
   * Reconstruct analytics object từ summary
   */
  reconstructAnalytics(accountId, summary) {
    // Tạo analytics object cơ bản
    const analytics = {
      accountId,
      startTime: Date.now() - summary.uptime,
      totalGifts: summary.totalGifts,
      totalCommands: summary.totalCommands,
      totalErrors: summary.totalErrors,
      totalRevenue: summary.totalRevenue,
      uniqueViewers: new Set(),
      giftTypes: new Map(),
      commandTypes: new Map(),
      errorTypes: new Map(),
      hourlyStats: new Map(),
      dailyStats: new Map()
    };
    
    this.metrics.set(accountId, analytics);
  }

  /**
   * Tạo báo cáo tự động
   */
  generateReport(accountId, period = 'daily') {
    const analytics = this.metrics.get(accountId);
    if (!analytics) return null;

    const summary = this.getAnalyticsSummary(accountId);
    const realTimeData = this.getRealTimeData(accountId);
    
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      accountId,
      summary,
      realTimeData,
      insights: this.generateInsights(summary),
      recommendations: this.generateRecommendations(summary)
    };
    
    this.emit('report:generated', { accountId, report });
    return report;
  }

  /**
   * Tạo insights từ analytics
   */
  generateInsights(summary) {
    const insights = [];
    
    if (summary.errorRate > 10) {
      insights.push({
        type: 'warning',
        message: `Tỷ lệ lỗi cao: ${summary.errorRate.toFixed(1)}%`,
        recommendation: 'Kiểm tra logs và cải thiện error handling'
      });
    }
    
    if (summary.giftsPerHour > 50) {
      insights.push({
        type: 'success',
        message: `Hiệu suất cao: ${summary.giftsPerHour.toFixed(1)} gifts/giờ`,
        recommendation: 'Tiếp tục duy trì hiệu suất này'
      });
    }
    
    if (summary.uniqueViewers > 100) {
      insights.push({
        type: 'info',
        message: `Lượng viewer đa dạng: ${summary.uniqueViewers} người xem`,
        recommendation: 'Tạo thêm nội dung để giữ chân viewers'
      });
    }
    
    return insights;
  }

  /**
   * Tạo recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.giftsPerHour < 10) {
      recommendations.push('Tăng cường tương tác với viewers để nhận nhiều gifts hơn');
    }
    
    if (summary.errorRate > 5) {
      recommendations.push('Cải thiện hệ thống xử lý lỗi và monitoring');
    }
    
    if (summary.commandsPerHour < 20) {
      recommendations.push('Tạo thêm preset commands để tăng tương tác');
    }
    
    return recommendations;
  }

  /**
   * Dừng analytics cho account
   */
  stopAnalytics(accountId) {
    this.metrics.delete(accountId);
    this.realTimeData.delete(accountId);
  }

  /**
   * Dừng tất cả analytics
   */
  stopAllAnalytics() {
    this.metrics.clear();
    this.realTimeData.clear();
  }
}

export const analyticsService = new AnalyticsService();
