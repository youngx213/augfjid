#!/usr/bin/env node

/**
 * Script khởi động production với tất cả tính năng
 * Chạy: node start-production.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Starting TikTok Bot in Production Mode...\n");

// Kiểm tra environment
function checkEnvironment() {
  const requiredVars = [
    'JWT_SECRET',
    'REDIS_URL',
    'NODE_ENV'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error("\nPlease check your .env file or environment configuration.");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
}

// Khởi động server
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Starting production server...");
    
    const server = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    server.on('error', (error) => {
      console.error("❌ Server startup error:", error.message);
      reject(error);
    });
    
    server.on('spawn', () => {
      console.log("✅ Production server started");
      resolve(server);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log("\n🛑 Shutting down production server...");
      server.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log("\n🛑 Shutting down production server...");
      server.kill('SIGTERM');
      process.exit(0);
    });
  });
}

// Hiển thị thông tin production
function displayProductionInfo() {
  console.log("\n🏭 Production Mode Information:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌐 Backend Server: http://localhost:3001");
  console.log("🔌 WebSocket: ws://localhost:3001");
  console.log("🔒 Security: Enhanced with 2FA, OAuth, API Keys");
  console.log("🛠️ DevOps: Docker, Auto-restart, Log aggregation");
  console.log("📊 Monitoring: Real-time analytics & health checks");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n🔐 Security Features:");
  console.log("✅ Two-Factor Authentication (2FA)");
  console.log("✅ OAuth Integration (Google, Facebook, Discord)");
  console.log("✅ API Key Management");
  console.log("✅ Security Headers & Rate Limiting");
  console.log("✅ Input Validation & CORS");
  
  console.log("\n🛠️ DevOps Features:");
  console.log("✅ Docker Containerization");
  console.log("✅ Environment Management");
  console.log("✅ Auto-restart on Failure");
  console.log("✅ Log Aggregation & Monitoring");
  console.log("✅ Health Checks & System Monitoring");
  
  console.log("\n📚 API Endpoints:");
  console.log("• Authentication: /api/auth/*");
  console.log("• 2FA: /api/auth/2fa/*");
  console.log("• OAuth: /api/oauth/*");
  console.log("• API Keys: /api/keys/*");
  console.log("• System: /api/system/*");
  console.log("• Logs: /api/logs/*");
  console.log("• Analytics: /api/analytics/*");
  console.log("• Game Features: /api/game/*");
  console.log("• Bot Health: /api/bot/health/*");
  
  console.log("\n🚀 Production Ready!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Main function
async function main() {
  try {
    // Kiểm tra environment
    checkEnvironment();
    
    // Khởi động server
    const server = await startServer();
    
    // Hiển thị thông tin
    displayProductionInfo();
    
    // Giữ process chạy
    await new Promise(() => {});
    
  } catch (error) {
    console.error("\n❌ Production startup failed:", error.message);
    process.exit(1);
  }
}

// Chạy main function
main().catch(console.error);
