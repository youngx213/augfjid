import { redis } from "../redis.js";
import EventEmitter from "events";
import { spawn, exec } from "child_process";
import fs from "fs/promises";
import path from "path";

/**
 * Service Auto-deployment cho hệ thống
 */
class AutoDeploymentService extends EventEmitter {
  constructor() {
    super();
    this.deployments = new Map();
    this.deploymentQueue = [];
    this.isProcessing = false;
    this.environments = new Map();
    this.initializeEnvironments();
  }

  /**
   * Khởi tạo environments
   */
  initializeEnvironments() {
    this.environments.set('development', {
      name: 'Development',
      branch: 'develop',
      port: 3000,
      autoDeploy: true,
      healthCheck: '/health',
      buildCommand: 'npm run build',
      startCommand: 'npm run dev'
    });

    this.environments.set('staging', {
      name: 'Staging',
      branch: 'staging',
      port: 3001,
      autoDeploy: true,
      healthCheck: '/health',
      buildCommand: 'npm run build:staging',
      startCommand: 'npm run start:staging'
    });

    this.environments.set('production', {
      name: 'Production',
      branch: 'main',
      port: 3002,
      autoDeploy: false, // Manual deployment for production
      healthCheck: '/health',
      buildCommand: 'npm run build:production',
      startCommand: 'npm run start:production'
    });
  }

  /**
   * Tạo deployment mới
   */
  async createDeployment(deploymentConfig) {
    try {
      const deployment = {
        id: `deploy_${Date.now()}`,
        environment: deploymentConfig.environment,
        branch: deploymentConfig.branch,
        commit: deploymentConfig.commit,
        status: 'pending',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        steps: [],
        logs: [],
        error: null,
        config: deploymentConfig
      };

      this.deployments.set(deployment.id, deployment);
      this.deploymentQueue.push(deployment.id);

      // Store in Redis
      await redis.hset(`deployment:${deployment.id}`, deployment);

      this.emit('deployment:created', deployment);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processDeploymentQueue();
      }

      return deployment;
    } catch (error) {
      console.error("Failed to create deployment:", error.message);
      throw error;
    }
  }

  /**
   * Xử lý deployment queue
   */
  async processDeploymentQueue() {
    if (this.isProcessing || this.deploymentQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.deploymentQueue.length > 0) {
      const deploymentId = this.deploymentQueue.shift();
      const deployment = this.deployments.get(deploymentId);
      
      if (deployment) {
        try {
          await this.executeDeployment(deployment);
        } catch (error) {
          console.error(`Deployment ${deploymentId} failed:`, error.message);
          deployment.status = 'failed';
          deployment.error = error.message;
          deployment.completedAt = new Date().toISOString();
          
          await redis.hset(`deployment:${deploymentId}`, deployment);
          this.emit('deployment:failed', deployment);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Thực hiện deployment
   */
  async executeDeployment(deployment) {
    try {
      deployment.status = 'running';
      deployment.startedAt = new Date().toISOString();
      
      await redis.hset(`deployment:${deployment.id}`, deployment);
      this.emit('deployment:started', deployment);

      const environment = this.environments.get(deployment.environment);
      if (!environment) {
        throw new Error(`Environment not found: ${deployment.environment}`);
      }

      // Step 1: Checkout code
      await this.addDeploymentStep(deployment, 'checkout', 'Checking out code...');
      await this.checkoutCode(deployment);

      // Step 2: Install dependencies
      await this.addDeploymentStep(deployment, 'install', 'Installing dependencies...');
      await this.installDependencies(deployment);

      // Step 3: Run tests
      await this.addDeploymentStep(deployment, 'test', 'Running tests...');
      await this.runTests(deployment);

      // Step 4: Build application
      await this.addDeploymentStep(deployment, 'build', 'Building application...');
      await this.buildApplication(deployment, environment);

      // Step 5: Deploy to environment
      await this.addDeploymentStep(deployment, 'deploy', 'Deploying to environment...');
      await this.deployToEnvironment(deployment, environment);

      // Step 6: Health check
      await this.addDeploymentStep(deployment, 'healthcheck', 'Running health check...');
      await this.runHealthCheck(deployment, environment);

      // Deployment completed successfully
      deployment.status = 'completed';
      deployment.completedAt = new Date().toISOString();
      
      await redis.hset(`deployment:${deployment.id}`, deployment);
      this.emit('deployment:completed', deployment);

    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.completedAt = new Date().toISOString();
      
      await redis.hset(`deployment:${deployment.id}`, deployment);
      this.emit('deployment:failed', deployment);
      throw error;
    }
  }

  /**
   * Thêm step vào deployment
   */
  async addDeploymentStep(deployment, stepName, description) {
    const step = {
      name: stepName,
      description: description,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      logs: []
    };

    deployment.steps.push(step);
    await redis.hset(`deployment:${deployment.id}`, deployment);
    
    this.emit('deployment:step', { deploymentId: deployment.id, step });
    return step;
  }

  /**
   * Cập nhật step
   */
  async updateDeploymentStep(deployment, stepIndex, updates) {
    if (deployment.steps[stepIndex]) {
      Object.assign(deployment.steps[stepIndex], updates);
      await redis.hset(`deployment:${deployment.id}`, deployment);
    }
  }

  /**
   * Checkout code
   */
  async checkoutCode(deployment) {
    return new Promise((resolve, reject) => {
      const command = `git checkout ${deployment.branch} && git pull origin ${deployment.branch}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Git checkout failed: ${error.message}`));
        } else {
          deployment.logs.push(`Git checkout successful: ${stdout}`);
          resolve();
        }
      });
    });
  }

  /**
   * Install dependencies
   */
  async installDependencies(deployment) {
    return new Promise((resolve, reject) => {
      exec('npm install', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Dependencies installation failed: ${error.message}`));
        } else {
          deployment.logs.push(`Dependencies installed: ${stdout}`);
          resolve();
        }
      });
    });
  }

  /**
   * Run tests
   */
  async runTests(deployment) {
    return new Promise((resolve, reject) => {
      exec('npm test', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Tests failed: ${error.message}`));
        } else {
          deployment.logs.push(`Tests passed: ${stdout}`);
          resolve();
        }
      });
    });
  }

  /**
   * Build application
   */
  async buildApplication(deployment, environment) {
    return new Promise((resolve, reject) => {
      exec(environment.buildCommand, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Build failed: ${error.message}`));
        } else {
          deployment.logs.push(`Build successful: ${stdout}`);
          resolve();
        }
      });
    });
  }

  /**
   * Deploy to environment
   */
  async deployToEnvironment(deployment, environment) {
    try {
      // Stop existing application
      await this.stopApplication(environment);
      
      // Start new application
      await this.startApplication(deployment, environment);
      
      deployment.logs.push(`Deployed to ${environment.name} environment`);
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Stop application
   */
  async stopApplication(environment) {
    return new Promise((resolve) => {
      // Find and kill existing process on the port
      exec(`lsof -ti:${environment.port} | xargs kill -9`, (error) => {
        // Ignore errors (process might not exist)
        resolve();
      });
    });
  }

  /**
   * Start application
   */
  async startApplication(deployment, environment) {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', environment.startCommand.split(' ')[1]], {
        env: {
          ...process.env,
          PORT: environment.port,
          NODE_ENV: deployment.environment
        },
        detached: true,
        stdio: 'inherit'
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start application: ${error.message}`));
      });

      // Give the application time to start
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  }

  /**
   * Run health check
   */
  async runHealthCheck(deployment, environment) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      
      const options = {
        hostname: 'localhost',
        port: environment.port,
        path: environment.healthCheck,
        method: 'GET',
        timeout: 10000
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          deployment.logs.push('Health check passed');
          resolve();
        } else {
          reject(new Error(`Health check failed with status: ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Health check failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(deploymentId, targetCommit) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      deployment.status = 'rollback';
      deployment.rollbackTo = targetCommit;
      
      await redis.hset(`deployment:${deploymentId}`, deployment);
      this.emit('deployment:rollback', deployment);

      // Checkout to previous commit
      await this.checkoutToCommit(targetCommit);
      
      // Redeploy
      const environment = this.environments.get(deployment.environment);
      await this.deployToEnvironment(deployment, environment);
      
      deployment.status = 'rolled_back';
      deployment.completedAt = new Date().toISOString();
      
      await redis.hset(`deployment:${deploymentId}`, deployment);
      this.emit('deployment:rolled_back', deployment);

      return deployment;
    } catch (error) {
      console.error("Rollback failed:", error.message);
      throw error;
    }
  }

  /**
   * Checkout to specific commit
   */
  async checkoutToCommit(commit) {
    return new Promise((resolve, reject) => {
      exec(`git checkout ${commit}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Git checkout to commit failed: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Lấy deployment status
   */
  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  /**
   * Lấy tất cả deployments
   */
  getAllDeployments() {
    return Array.from(this.deployments.values());
  }

  /**
   * Lấy deployment history
   */
  async getDeploymentHistory(limit = 50) {
    try {
      const deploymentKeys = await redis.keys('deployment:*');
      const sortedKeys = deploymentKeys.sort().slice(-limit);
      
      const deployments = [];
      for (const key of sortedKeys) {
        const deployment = await redis.hgetall(key);
        if (deployment) {
          deployments.push({
            ...deployment,
            steps: JSON.parse(deployment.steps || '[]'),
            logs: JSON.parse(deployment.logs || '[]')
          });
        }
      }
      
      return deployments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      return [];
    }
  }

  /**
   * Lấy environment status
   */
  getEnvironmentStatus(environmentName) {
    const environment = this.environments.get(environmentName);
    if (!environment) return null;

    return {
      name: environment.name,
      branch: environment.branch,
      port: environment.port,
      autoDeploy: environment.autoDeploy,
      healthCheck: environment.healthCheck,
      lastDeployment: this.getLastDeployment(environmentName)
    };
  }

  /**
   * Lấy last deployment cho environment
   */
  getLastDeployment(environmentName) {
    const deployments = Array.from(this.deployments.values())
      .filter(d => d.environment === environmentName)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return deployments[0] || null;
  }

  /**
   * Cập nhật environment config
   */
  updateEnvironmentConfig(environmentName, updates) {
    const environment = this.environments.get(environmentName);
    if (environment) {
      Object.assign(environment, updates);
      this.emit('environment:updated', { name: environmentName, environment });
      return environment;
    }
    return null;
  }

  /**
   * Lấy deployment statistics
   */
  getDeploymentStats() {
    const deployments = Array.from(this.deployments.values());
    
    return {
      total: deployments.length,
      completed: deployments.filter(d => d.status === 'completed').length,
      failed: deployments.filter(d => d.status === 'failed').length,
      running: deployments.filter(d => d.status === 'running').length,
      pending: deployments.filter(d => d.status === 'pending').length,
      successRate: deployments.length > 0 ? 
        (deployments.filter(d => d.status === 'completed').length / deployments.length) * 100 : 0
    };
  }

  /**
   * Lưu deployment config
   */
  async saveDeploymentConfig() {
    try {
      const config = {
        environments: Array.from(this.environments.entries()),
        timestamp: new Date().toISOString()
      };

      await redis.hset('deployment:config', config);
      return { success: true, message: "Deployment configuration saved" };
    } catch (error) {
      throw new Error(`Failed to save deployment config: ${error.message}`);
    }
  }

  /**
   * Load deployment config
   */
  async loadDeploymentConfig() {
    try {
      const config = await redis.hgetall('deployment:config');
      if (!config || !config.environments) {
        return false;
      }

      const environments = JSON.parse(config.environments);
      this.environments.clear();
      
      for (const [name, env] of environments) {
        this.environments.set(name, env);
      }

      console.log("✅ Deployment configuration loaded");
      return true;
    } catch (error) {
      console.error("Failed to load deployment config:", error.message);
      return false;
    }
  }

  /**
   * Webhook handler cho Git
   */
  async handleGitWebhook(payload) {
    try {
      const { ref, commits, repository } = payload;
      const branch = ref.replace('refs/heads/', '');
      
      // Find environment for this branch
      const environment = Array.from(this.environments.values())
        .find(env => env.branch === branch);
      
      if (!environment) {
        console.log(`No environment found for branch: ${branch}`);
        return;
      }

      if (!environment.autoDeploy) {
        console.log(`Auto-deploy disabled for environment: ${environment.name}`);
        return;
      }

      // Create deployment
      const deployment = await this.createDeployment({
        environment: environment.name.toLowerCase(),
        branch: branch,
        commit: commits[0]?.id || 'latest',
        repository: repository.name,
        triggeredBy: 'webhook'
      });

      return deployment;
    } catch (error) {
      console.error("Git webhook handling failed:", error.message);
      throw error;
    }
  }
}

export const autoDeploymentService = new AutoDeploymentService();
