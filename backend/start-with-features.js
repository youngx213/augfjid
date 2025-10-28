#!/usr/bin/env node

/**
 * Script khởi động hệ thống với tất cả tính năng mới
 * Chạy: node start-with-features.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Starting TikTok Bot with new features...\n");

// Kiểm tra Redis connection
async function checkRedis() {
  try {
    const { testRedisConnection } = await import('./redis.js');
    await testRedisConnection();
    console.log("✅ Redis connection: OK");
    return true;
  } catch (error) {
    console.log("❌ Redis connection failed:", error.message);
    console.log("Please make sure Redis is running on localhost:6379");
    return false;
  }
}

// Khởi động server
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Starting backend server...");
    
    const server = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    
    server.on('error', (error) => {
      console.log("❌ Server startup error:", error.message);
      reject(error);
    });
    
    server.on('spawn', () => {
      console.log("✅ Backend server started on port 3001");
      resolve(server);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log("\n🛑 Shutting down server...");
      server.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log("\n🛑 Shutting down server...");
      server.kill('SIGTERM');
      process.exit(0);
    });
  });
}

// Hiển thị thông tin hệ thống
function displaySystemInfo() {
  console.log("\n📋 System Information:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌐 Backend Server: http://localhost:3001");
  console.log("🔌 WebSocket: ws://localhost:3001");
  console.log("📊 Analytics: /api/analytics/:accountId");
  console.log("🎮 Game Features: /api/game/*");
  console.log("🤖 Bot Health: /api/bot/health/:accountId");
  console.log("🔒 Rate Limiting: Enabled");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n🎯 New Features Available:");
  console.log("✅ Auto-reconnect & Error Recovery");
  console.log("✅ Real-time Analytics & Monitoring");
  console.log("✅ Game Features (Leaderboard, Achievements)");
  console.log("✅ Rate Limiting & Security");
  console.log("✅ Performance Monitoring");
  console.log("✅ Mini-games & Rewards System");
  
  console.log("\n📚 API Documentation:");
  console.log("• GET /api/analytics/:accountId - Analytics data");
  console.log("• GET /api/game/leaderboard - Leaderboard");
  console.log("• GET /api/game/achievements/:accountId - Achievements");
  console.log("• POST /api/game/minigames - Create mini-game");
  console.log("• GET /api/bot/health/:accountId - Bot health");
  
  console.log("\n🔧 WebSocket Events:");
  console.log("• analytics:gift:recorded - Gift received");
  console.log("• game:achievements:unlocked - Achievement unlocked");
  console.log("• bot:health:failure - Bot health issue");
  console.log("• analytics:realtime:update - Real-time data");
  
  console.log("\n🚀 Ready to use!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Main function
async function main() {
  try {
    // Kiểm tra Redis
    const redisOk = await checkRedis();
    if (!redisOk) {
      console.log("\n❌ Cannot start without Redis. Please start Redis first.");
      process.exit(1);
    }
    
    // Khởi động server
    const server = await startServer();
    
    // Hiển thị thông tin
    displaySystemInfo();
    
    // Giữ process chạy
    await new Promise(() => {});
    
  } catch (error) {
    console.log("\n❌ Startup failed:", error.message);
    process.exit(1);
  }
}

// Chạy main function
main().catch(console.error);
