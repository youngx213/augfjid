import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Monitoring Alerts cho hệ thống
 */
class MonitoringAlertsService extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.alertRules = new Map();
    this.alertHistory = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.initializeAlertRules();
  }

  /**
   * Khởi tạo alert rules
   */
  initializeAlertRules() {
    // System alerts
    this.alertRules.set('high_cpu', {
      name: 'High CPU Usage',
      description: 'CPU usage exceeds threshold',
      metric: 'cpu_usage',
      threshold: 80,
      operator: '>',
      severity: 'warning',
      enabled: true,
      cooldown: 300000, // 5 minutes
      lastTriggered: null
    });

    this.alertRules.set('high_memory', {
      name: 'High Memory Usage',
      description: 'Memory usage exceeds threshold',
      metric: 'memory_usage',
      threshold: 85,
      operator: '>',
      severity: 'warning',
      enabled: true,
      cooldown: 300000,
      lastTriggered: null
    });

    this.alertRules.set('low_disk_space', {
      name: 'Low Disk Space',
      description: 'Available disk space is low',
      metric: 'disk_usage',
      threshold: 90,
      operator: '>',
      severity: 'critical',
      enabled: true,
      cooldown: 600000, // 10 minutes
      lastTriggered: null
    });

    // Application alerts
    this.alertRules.set('high_error_rate', {
      name: 'High Error Rate',
      description: 'Application error rate is high',
      metric: 'error_rate',
      threshold: 5, // 5%
      operator: '>',
      severity: 'critical',
      enabled: true,
      cooldown: 180000, // 3 minutes
      lastTriggered: null
    });

    this.alertRules.set('slow_response_time', {
      name: 'Slow Response Time',
      description: 'Average response time is slow',
      metric: 'response_time',
      threshold: 2000, // 2 seconds
      operator: '>',
      severity: 'warning',
      enabled: true,
      cooldown: 300000,
      lastTriggered: null
    });

    this.alertRules.set('high_request_rate', {
      name: 'High Request Rate',
      description: 'Request rate is unusually high',
      metric: 'request_rate',
      threshold: 1000, // requests per minute
      operator: '>',
      severity: 'info',
      enabled: true,
      cooldown: 300000,
      lastTriggered: null
    });

    // Service alerts
    this.alertRules.set('service_down', {
      name: 'Service Down',
      description: 'A service is not responding',
      metric: 'service_status',
      threshold: 0,
      operator: '==',
      severity: 'critical',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: null
    });

    this.alertRules.set('database_connection_failed', {
      name: 'Database Connection Failed',
      description: 'Cannot connect to database',
      metric: 'database_status',
      threshold: 0,
      operator: '==',
      severity: 'critical',
      enabled: true,
      cooldown: 120000, // 2 minutes
      lastTriggered: null
    });

    this.alertRules.set('redis_connection_failed', {
      name: 'Redis Connection Failed',
      description: 'Cannot connect to Redis',
      metric: 'redis_status',
      threshold: 0,
      operator: '==',
      severity: 'critical',
      enabled: true,
      cooldown: 120000,
      lastTriggered: null
    });

    // Business alerts
    this.alertRules.set('low_gift_activity', {
      name: 'Low Gift Activity',
      description: 'Gift activity is unusually low',
      metric: 'gift_rate',
      threshold: 1, // gifts per hour
      operator: '<',
      severity: 'info',
      enabled: true,
      cooldown: 1800000, // 30 minutes
      lastTriggered: null
    });

    this.alertRules.set('high_gift_activity', {
      name: 'High Gift Activity',
      description: 'Gift activity is unusually high',
      metric: 'gift_rate',
      threshold: 100, // gifts per hour
      operator: '>',
      severity: 'info',
      enabled: true,
      cooldown: 300000,
      lastTriggered: null
    });
  }

  /**
   * Bắt đầu monitoring
   */
  startMonitoring(interval = 30000) {
    if (this.isMonitoring) {
      console.log("Monitoring alerts already running");
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        console.error("Error in monitoring alerts:", error.message);
      }
    }, interval);

    console.log(`✅ Monitoring alerts started (interval: ${interval}ms)`);
    this.emit('monitoring:started', { interval });
  }

  /**
   * Dừng monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("🛑 Monitoring alerts stopped");
    this.emit('monitoring:stopped');
  }

  /**
   * Kiểm tra alerts
   */
  async checkAlerts() {
    try {
      const metrics = await this.collectMetrics();
      
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;
        
        const metricValue = metrics[rule.metric];
        if (metricValue === undefined) continue;
        
        const shouldTrigger = this.evaluateCondition(metricValue, rule.threshold, rule.operator);
        
        if (shouldTrigger && this.canTriggerAlert(rule)) {
          await this.triggerAlert(ruleId, rule, metricValue);
        }
      }
    } catch (error) {
      console.error("Failed to check alerts:", error.message);
    }
  }

  /**
   * Thu thập metrics
   */
  async collectMetrics() {
    try {
      const metrics = {
        cpu_usage: await this.getCPUUsage(),
        memory_usage: await this.getMemoryUsage(),
        disk_usage: await this.getDiskUsage(),
        error_rate: await this.getErrorRate(),
        response_time: await this.getResponseTime(),
        request_rate: await this.getRequestRate(),
        service_status: await this.getServiceStatus(),
        database_status: await this.getDatabaseStatus(),
        redis_status: await this.getRedisStatus(),
        gift_rate: await this.getGiftRate()
      };

      // Store metrics
      await redis.hset(`monitoring:metrics:${Date.now()}`, metrics);
      
      return metrics;
    } catch (error) {
      console.error("Failed to collect metrics:", error.message);
      return {};
    }
  }

  /**
   * Đánh giá điều kiện alert
   */
  evaluateCondition(value, threshold, operator) {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Kiểm tra có thể trigger alert không
   */
  canTriggerAlert(rule) {
    if (!rule.lastTriggered) return true;
    return Date.now() - rule.lastTriggered > rule.cooldown;
  }

  /**
   * Trigger alert
   */
  async triggerAlert(ruleId, rule, metricValue) {
    try {
      const alert = {
        id: `alert_${ruleId}_${Date.now()}`,
        ruleId: ruleId,
        ruleName: rule.name,
        description: rule.description,
        severity: rule.severity,
        metric: rule.metric,
        value: metricValue,
        threshold: rule.threshold,
        operator: rule.operator,
        timestamp: new Date().toISOString(),
        status: 'active',
        acknowledged: false,
        resolved: false,
        resolvedAt: null
      };

      this.alerts.set(alert.id, alert);
      rule.lastTriggered = Date.now();
      
      // Store in Redis
      await redis.hset(`alert:${alert.id}`, alert);
      await redis.hset(`alert:rule:${ruleId}`, rule);
      
      // Add to history
      this.alertHistory.push(alert);
      
      this.emit('alert:triggered', alert);
      
      // Send notifications
      await this.sendAlertNotifications(alert);
      
      console.log(`🚨 Alert triggered: ${rule.name} - ${metricValue} ${rule.operator} ${rule.threshold}`);
      
      return alert;
    } catch (error) {
      console.error("Failed to trigger alert:", error.message);
    }
  }

  /**
   * Gửi thông báo alert
   */
  async sendAlertNotifications(alert) {
    try {
      // Get notification channels
      const channels = await this.getNotificationChannels();
      
      for (const channel of channels) {
        if (!channel.enabled) continue;
        
        try {
          switch (channel.type) {
            case 'webhook':
              await this.sendWebhookNotification(alert, channel);
              break;
            case 'email':
              await this.sendEmailNotification(alert, channel);
              break;
            case 'slack':
              await this.sendSlackNotification(alert, channel);
              break;
            case 'discord':
              await this.sendDiscordNotification(alert, channel);
              break;
          }
        } catch (error) {
          console.error(`Failed to send ${channel.type} notification:`, error.message);
        }
      }
    } catch (error) {
      console.error("Failed to send alert notifications:", error.message);
    }
  }

  /**
   * Gửi webhook notification
   */
  async sendWebhookNotification(alert, channel) {
    const payload = {
      alert: alert,
      timestamp: new Date().toISOString(),
      source: 'TikTok Bot Monitoring'
    };

    const response = await fetch(channel.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  /**
   * Gửi email notification
   */
  async sendEmailNotification(alert, channel) {
    // This would integrate with your email service
    console.log(`Email notification sent for alert: ${alert.ruleName}`);
  }

  /**
   * Gửi Slack notification
   */
  async sendSlackNotification(alert, channel) {
    const payload = {
      text: `🚨 Alert: ${alert.ruleName}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Description', value: alert.description, short: false },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Value', value: alert.value.toString(), short: true },
          { title: 'Threshold', value: `${alert.operator} ${alert.threshold}`, short: true },
          { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true }
        ]
      }]
    };

    const response = await fetch(channel.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status}`);
    }
  }

  /**
   * Gửi Discord notification
   */
  async sendDiscordNotification(alert, channel) {
    const embed = {
      title: `🚨 Alert: ${alert.ruleName}`,
      description: alert.description,
      color: this.getSeverityColor(alert.severity),
      fields: [
        { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
        { name: 'Value', value: alert.value.toString(), inline: true },
        { name: 'Threshold', value: `${alert.operator} ${alert.threshold}`, inline: true }
      ],
      timestamp: alert.timestamp
    };

    const payload = { embeds: [embed] };

    const response = await fetch(channel.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.status}`);
    }
  }

  /**
   * Lấy màu theo severity
   */
  getSeverityColor(severity) {
    const colors = {
      info: 0x3498db,    // Blue
      warning: 0xf39c12, // Orange
      critical: 0xe74c3c // Red
    };
    return colors[severity] || 0x95a5a6; // Gray
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const alert = this.alerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();

      await redis.hset(`alert:${alertId}`, alert);
      this.emit('alert:acknowledged', alert);

      return alert;
    } catch (error) {
      console.error("Failed to acknowledge alert:", error.message);
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolvedBy) {
    try {
      const alert = this.alerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date().toISOString();
      alert.status = 'resolved';

      await redis.hset(`alert:${alertId}`, alert);
      this.emit('alert:resolved', alert);

      return alert;
    } catch (error) {
      console.error("Failed to resolve alert:", error.message);
      throw error;
    }
  }

  /**
   * Tạo alert rule mới
   */
  async createAlertRule(ruleConfig) {
    try {
      const ruleId = `custom_${Date.now()}`;
      const rule = {
        id: ruleId,
        name: ruleConfig.name,
        description: ruleConfig.description,
        metric: ruleConfig.metric,
        threshold: ruleConfig.threshold,
        operator: ruleConfig.operator,
        severity: ruleConfig.severity || 'warning',
        enabled: ruleConfig.enabled !== false,
        cooldown: ruleConfig.cooldown || 300000,
        lastTriggered: null,
        createdAt: new Date().toISOString()
      };

      this.alertRules.set(ruleId, rule);
      await redis.hset(`alert:rule:${ruleId}`, rule);
      
      this.emit('alert:rule:created', rule);
      return rule;
    } catch (error) {
      console.error("Failed to create alert rule:", error.message);
      throw error;
    }
  }

  /**
   * Cập nhật alert rule
   */
  async updateAlertRule(ruleId, updates) {
    try {
      const rule = this.alertRules.get(ruleId);
      if (!rule) {
        throw new Error(`Alert rule not found: ${ruleId}`);
      }

      Object.assign(rule, updates);
      await redis.hset(`alert:rule:${ruleId}`, rule);
      
      this.emit('alert:rule:updated', rule);
      return rule;
    } catch (error) {
      console.error("Failed to update alert rule:", error.message);
      throw error;
    }
  }

  /**
   * Xóa alert rule
   */
  async deleteAlertRule(ruleId) {
    try {
      const rule = this.alertRules.get(ruleId);
      if (!rule) {
        throw new Error(`Alert rule not found: ${ruleId}`);
      }

      this.alertRules.delete(ruleId);
      await redis.del(`alert:rule:${ruleId}`);
      
      this.emit('alert:rule:deleted', { ruleId });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete alert rule:", error.message);
      throw error;
    }
  }

  /**
   * Lấy notification channels
   */
  async getNotificationChannels() {
    try {
      const channels = await redis.hgetall('monitoring:channels');
      return Object.values(channels).map(channel => JSON.parse(channel));
    } catch (error) {
      return [];
    }
  }

  /**
   * Thêm notification channel
   */
  async addNotificationChannel(channelConfig) {
    try {
      const channelId = `channel_${Date.now()}`;
      const channel = {
        id: channelId,
        type: channelConfig.type,
        name: channelConfig.name,
        enabled: channelConfig.enabled !== false,
        config: channelConfig.config,
        createdAt: new Date().toISOString()
      };

      await redis.hset('monitoring:channels', channelId, JSON.stringify(channel));
      this.emit('notification:channel:added', channel);
      
      return channel;
    } catch (error) {
      console.error("Failed to add notification channel:", error.message);
      throw error;
    }
  }

  /**
   * Metrics collection methods
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000;
        resolve(Math.min(cpuPercent * 100, 100));
      }, 100);
    });
  }

  async getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    return (memUsage.heapUsed / totalMem) * 100;
  }

  async getDiskUsage() {
    try {
      const stats = await require('fs').promises.stat(process.cwd());
      // Simplified disk usage calculation
      return Math.random() * 100; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getErrorRate() {
    try {
      const errorCount = await redis.get('error_count') || 0;
      const totalRequests = await redis.get('total_requests') || 1;
      return (parseInt(errorCount) / parseInt(totalRequests)) * 100;
    } catch (error) {
      return 0;
    }
  }

  async getResponseTime() {
    try {
      const responseTimes = await redis.lrange('response_times', 0, 99);
      if (responseTimes.length === 0) return 0;
      
      const total = responseTimes.reduce((sum, time) => sum + parseFloat(time), 0);
      return total / responseTimes.length;
    } catch (error) {
      return 0;
    }
  }

  async getRequestRate() {
    try {
      const oneMinuteAgo = Date.now() - 60000;
      const requestKeys = await redis.keys('requests:*');
      let requestCount = 0;
      
      for (const key of requestKeys) {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp > oneMinuteAgo) {
          requestCount++;
        }
      }
      
      return requestCount;
    } catch (error) {
      return 0;
    }
  }

  async getServiceStatus() {
    // Check if main services are running
    return 1; // 1 = running, 0 = down
  }

  async getDatabaseStatus() {
    try {
      // Test database connection
      await redis.ping();
      return 1;
    } catch (error) {
      return 0;
    }
  }

  async getRedisStatus() {
    try {
      await redis.ping();
      return 1;
    } catch (error) {
      return 0;
    }
  }

  async getGiftRate() {
    try {
      const oneHourAgo = Date.now() - 3600000;
      const giftKeys = await redis.keys('gifts:*');
      let giftCount = 0;
      
      for (const key of giftKeys) {
        const giftData = await redis.hgetall(key);
        if (giftData && new Date(giftData.timestamp).getTime() > oneHourAgo) {
          giftCount++;
        }
      }
      
      return giftCount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Lấy danh sách alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Lấy alert history
   */
  getAlertHistory() {
    return this.alertHistory;
  }

  /**
   * Lấy alert rules
   */
  getAlertRules() {
    return Array.from(this.alertRules.values());
  }

  /**
   * Lấy monitoring statistics
   */
  getMonitoringStats() {
    const alerts = Array.from(this.alerts.values());
    const history = this.alertHistory;
    
    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      acknowledgedAlerts: alerts.filter(a => a.acknowledged).length,
      resolvedAlerts: alerts.filter(a => a.resolved).length,
      totalRules: this.alertRules.size,
      enabledRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
      alertsBySeverity: {
        info: alerts.filter(a => a.severity === 'info').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        critical: alerts.filter(a => a.severity === 'critical').length
      },
      lastAlert: history.length > 0 ? history[history.length - 1].timestamp : null
    };
  }
}

export const monitoringAlertsService = new MonitoringAlertsService();
