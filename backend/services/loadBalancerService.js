import { redis } from "../redis.js";
import EventEmitter from "events";
import http from "http";
import https from "https";

/**
 * Service Load Balancing cho hệ thống
 */
class LoadBalancerService extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map();
    this.algorithm = 'round_robin';
    this.currentIndex = 0;
    this.healthChecks = new Map();
    this.isRunning = false;
    this.initializeLoadBalancer();
  }

  /**
   * Khởi tạo load balancer
   */
  initializeLoadBalancer() {
    // Default server configuration
    this.addServer({
      id: 'server_1',
      host: 'localhost',
      port: 3000,
      weight: 1,
      health: true,
      activeConnections: 0,
      totalRequests: 0,
      responseTime: 0,
      lastHealthCheck: null
    });
  }

  /**
   * Thêm server
   */
  addServer(serverConfig) {
    const server = {
      id: serverConfig.id,
      host: serverConfig.host,
      port: serverConfig.port,
      weight: serverConfig.weight || 1,
      health: true,
      activeConnections: 0,
      totalRequests: 0,
      responseTime: 0,
      lastHealthCheck: null,
      createdAt: new Date().toISOString()
    };

    this.servers.set(server.id, server);
    this.emit('server:added', server);
    
    console.log(`✅ Added server: ${server.id} (${server.host}:${server.port})`);
    return server;
  }

  /**
   * Xóa server
   */
  removeServer(serverId) {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      this.emit('server:removed', server);
      console.log(`🗑️ Removed server: ${serverId}`);
      return true;
    }
    return false;
  }

  /**
   * Cập nhật server
   */
  updateServer(serverId, updates) {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, updates);
      this.emit('server:updated', server);
      return server;
    }
    return null;
  }

  /**
   * Chọn server theo thuật toán
   */
  selectServer() {
    const healthyServers = Array.from(this.servers.values()).filter(server => server.health);
    
    if (healthyServers.length === 0) {
      throw new Error("No healthy servers available");
    }

    switch (this.algorithm) {
      case 'round_robin':
        return this.roundRobinSelection(healthyServers);
      case 'least_connections':
        return this.leastConnectionsSelection(healthyServers);
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelection(healthyServers);
      case 'least_response_time':
        return this.leastResponseTimeSelection(healthyServers);
      case 'ip_hash':
        return this.ipHashSelection(healthyServers);
      default:
        return this.roundRobinSelection(healthyServers);
    }
  }

  /**
   * Round Robin selection
   */
  roundRobinSelection(servers) {
    const server = servers[this.currentIndex % servers.length];
    this.currentIndex = (this.currentIndex + 1) % servers.length;
    return server;
  }

  /**
   * Least Connections selection
   */
  leastConnectionsSelection(servers) {
    return servers.reduce((min, server) => 
      server.activeConnections < min.activeConnections ? server : min
    );
  }

  /**
   * Weighted Round Robin selection
   */
  weightedRoundRobinSelection(servers) {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[0];
  }

  /**
   * Least Response Time selection
   */
  leastResponseTimeSelection(servers) {
    return servers.reduce((min, server) => 
      server.responseTime < min.responseTime ? server : min
    );
  }

  /**
   * IP Hash selection
   */
  ipHashSelection(servers, clientIP = '127.0.0.1') {
    const hash = this.hashCode(clientIP);
    const index = Math.abs(hash) % servers.length;
    return servers[index];
  }

  /**
   * Hash function
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Proxy request đến server
   */
  async proxyRequest(req, res, targetServer) {
    try {
      const startTime = Date.now();
      
      // Update server metrics
      targetServer.activeConnections++;
      targetServer.totalRequests++;

      const options = {
        hostname: targetServer.host,
        port: targetServer.port,
        path: req.url,
        method: req.method,
        headers: req.headers
      };

      const proxyReq = http.request(options, (proxyRes) => {
        // Set response headers
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe response
        proxyRes.pipe(res);
        
        // Update response time
        const responseTime = Date.now() - startTime;
        targetServer.responseTime = (targetServer.responseTime + responseTime) / 2;
        
        // Decrease active connections
        targetServer.activeConnections--;
        
        this.emit('request:completed', {
          server: targetServer.id,
          responseTime: responseTime,
          statusCode: proxyRes.statusCode
        });
      });

      proxyReq.on('error', (error) => {
        console.error(`Proxy request error for ${targetServer.id}:`, error.message);
        targetServer.activeConnections--;
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      });

      // Pipe request body
      req.pipe(proxyReq);
      
    } catch (error) {
      console.error("Failed to proxy request:", error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy Error' }));
    }
  }

  /**
   * Health check cho server
   */
  async healthCheck(server) {
    try {
      const startTime = Date.now();
      
      const options = {
        hostname: server.host,
        port: server.port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };

      return new Promise((resolve) => {
        const req = http.request(options, (res) => {
          const responseTime = Date.now() - startTime;
          const isHealthy = res.statusCode === 200;
          
          server.health = isHealthy;
          server.lastHealthCheck = new Date().toISOString();
          server.responseTime = responseTime;
          
          this.emit('health:checked', {
            server: server.id,
            healthy: isHealthy,
            responseTime: responseTime
          });
          
          resolve(isHealthy);
        });

        req.on('error', () => {
          server.health = false;
          server.lastHealthCheck = new Date().toISOString();
          
          this.emit('health:checked', {
            server: server.id,
            healthy: false,
            responseTime: -1
          });
          
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          server.health = false;
          server.lastHealthCheck = new Date().toISOString();
          
          this.emit('health:checked', {
            server: server.id,
            healthy: false,
            responseTime: -1
          });
          
          resolve(false);
        });

        req.end();
      });
    } catch (error) {
      server.health = false;
      server.lastHealthCheck = new Date().toISOString();
      return false;
    }
  }

  /**
   * Bắt đầu health checks
   */
  startHealthChecks(interval = 30000) {
    if (this.healthChecks.has('main')) {
      console.log("Health checks already running");
      return;
    }

    const healthCheckInterval = setInterval(async () => {
      const servers = Array.from(this.servers.values());
      
      for (const server of servers) {
        await this.healthCheck(server);
      }
    }, interval);

    this.healthChecks.set('main', healthCheckInterval);
    console.log(`✅ Health checks started (interval: ${interval}ms)`);
  }

  /**
   * Dừng health checks
   */
  stopHealthChecks() {
    for (const [name, interval] of this.healthChecks) {
      clearInterval(interval);
    }
    this.healthChecks.clear();
    console.log("🛑 Health checks stopped");
  }

  /**
   * Bắt đầu load balancer
   */
  startLoadBalancer(port = 8080) {
    if (this.isRunning) {
      console.log("Load balancer is already running");
      return;
    }

    const server = http.createServer((req, res) => {
      try {
        const targetServer = this.selectServer();
        this.proxyRequest(req, res, targetServer);
      } catch (error) {
        console.error("Failed to select server:", error.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service Unavailable' }));
      }
    });

    server.listen(port, () => {
      this.isRunning = true;
      console.log(`✅ Load balancer started on port ${port}`);
      this.emit('loadbalancer:started', { port });
    });

    server.on('error', (error) => {
      console.error("Load balancer error:", error.message);
      this.emit('loadbalancer:error', error);
    });

    this.server = server;
  }

  /**
   * Dừng load balancer
   */
  stopLoadBalancer() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.isRunning = false;
    console.log("🛑 Load balancer stopped");
    this.emit('loadbalancer:stopped');
  }

  /**
   * Cập nhật thuật toán load balancing
   */
  setAlgorithm(algorithm) {
    const validAlgorithms = [
      'round_robin',
      'least_connections',
      'weighted_round_robin',
      'least_response_time',
      'ip_hash'
    ];

    if (!validAlgorithms.includes(algorithm)) {
      throw new Error(`Invalid load balancing algorithm: ${algorithm}`);
    }

    this.algorithm = algorithm;
    this.currentIndex = 0; // Reset for round robin
    
    console.log(`🔄 Load balancing algorithm changed to: ${algorithm}`);
    this.emit('algorithm:changed', { algorithm });
  }

  /**
   * Lấy trạng thái load balancer
   */
  getLoadBalancerStatus() {
    return {
      isRunning: this.isRunning,
      algorithm: this.algorithm,
      servers: Array.from(this.servers.values()),
      totalServers: this.servers.size,
      healthyServers: Array.from(this.servers.values()).filter(s => s.health).length,
      totalRequests: Array.from(this.servers.values()).reduce((sum, s) => sum + s.totalRequests, 0),
      averageResponseTime: this.getAverageResponseTime()
    };
  }

  /**
   * Lấy average response time
   */
  getAverageResponseTime() {
    const servers = Array.from(this.servers.values());
    if (servers.length === 0) return 0;
    
    const totalResponseTime = servers.reduce((sum, server) => sum + server.responseTime, 0);
    return totalResponseTime / servers.length;
  }

  /**
   * Lấy server statistics
   */
  getServerStats(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return null;

    return {
      id: server.id,
      host: server.host,
      port: server.port,
      health: server.health,
      activeConnections: server.activeConnections,
      totalRequests: server.totalRequests,
      responseTime: server.responseTime,
      lastHealthCheck: server.lastHealthCheck,
      uptime: Date.now() - new Date(server.createdAt).getTime()
    };
  }

  /**
   * Lấy tất cả server statistics
   */
  getAllServerStats() {
    return Array.from(this.servers.keys()).map(id => this.getServerStats(id));
  }

  /**
   * Lưu cấu hình load balancer
   */
  async saveLoadBalancerConfig() {
    try {
      const config = {
        algorithm: this.algorithm,
        servers: Array.from(this.servers.values()),
        timestamp: new Date().toISOString()
      };

      await redis.hset('loadbalancer:config', config);
      return { success: true, message: "Load balancer configuration saved" };
    } catch (error) {
      throw new Error(`Failed to save load balancer config: ${error.message}`);
    }
  }

  /**
   * Load cấu hình load balancer
   */
  async loadLoadBalancerConfig() {
    try {
      const config = await redis.hgetall('loadbalancer:config');
      if (!config || !config.algorithm) {
        return false;
      }

      this.algorithm = config.algorithm;
      
      if (config.servers) {
        const servers = JSON.parse(config.servers);
        this.servers.clear();
        
        for (const server of servers) {
          this.servers.set(server.id, server);
        }
      }

      console.log("✅ Load balancer configuration loaded");
      return true;
    } catch (error) {
      console.error("Failed to load load balancer config:", error.message);
      return false;
    }
  }

  /**
   * Lấy load balancer metrics
   */
  async getLoadBalancerMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        totalRequests: Array.from(this.servers.values()).reduce((sum, s) => sum + s.totalRequests, 0),
        activeConnections: Array.from(this.servers.values()).reduce((sum, s) => sum + s.activeConnections, 0),
        averageResponseTime: this.getAverageResponseTime(),
        healthyServers: Array.from(this.servers.values()).filter(s => s.health).length,
        totalServers: this.servers.size,
        algorithm: this.algorithm
      };

      // Store metrics
      await redis.hset(`loadbalancer:metrics:${Date.now()}`, metrics);
      
      return metrics;
    } catch (error) {
      console.error("Failed to get load balancer metrics:", error.message);
      return null;
    }
  }

  /**
   * Lấy metrics history
   */
  async getMetricsHistory(limit = 100) {
    try {
      const metricKeys = await redis.keys('loadbalancer:metrics:*');
      const sortedKeys = metricKeys.sort().slice(-limit);
      
      const metrics = [];
      for (const key of sortedKeys) {
        const metric = await redis.hgetall(key);
        if (metric) {
          metrics.push({
            timestamp: metric.timestamp,
            totalRequests: parseInt(metric.totalRequests) || 0,
            activeConnections: parseInt(metric.activeConnections) || 0,
            averageResponseTime: parseFloat(metric.averageResponseTime) || 0,
            healthyServers: parseInt(metric.healthyServers) || 0,
            totalServers: parseInt(metric.totalServers) || 0,
            algorithm: metric.algorithm
          });
        }
      }
      
      return metrics;
    } catch (error) {
      return [];
    }
  }
}

export const loadBalancerService = new LoadBalancerService();
