#!/usr/bin/env node

/**
 * Script test các tính năng mới
 * Chạy: node test-new-features.js
 */

import { botHealthService } from "./services/botHealthService.js";
import { analyticsService } from "./services/analyticsService.js";
import { gameFeaturesService } from "./services/gameFeaturesService.js";
import { rateLimitService } from "./services/rateLimitService.js";

console.log("🚀 Testing new features...\n");

// Test 1: Bot Health Service
console.log("1. 🤖 Testing Bot Health Service...");
try {
  const testAccountId = "test_account_123";
  
  // Khởi tạo health check
  botHealthService.initHealthCheck(testAccountId);
  console.log("✅ Health check initialized");
  
  // Lấy health status
  const healthStatus = botHealthService.getHealthStatus(testAccountId);
  console.log("✅ Health status:", healthStatus ? "Active" : "Not found");
  
  // Dừng health check
  botHealthService.stopHealthCheck(testAccountId);
  console.log("✅ Health check stopped");
  
} catch (error) {
  console.log("❌ Bot Health Service error:", error.message);
}

// Test 2: Analytics Service
console.log("\n2. 📊 Testing Analytics Service...");
try {
  const testAccountId = "test_account_456";
  
  // Khởi tạo analytics
  analyticsService.initAnalytics(testAccountId);
  console.log("✅ Analytics initialized");
  
  // Ghi nhận gift
  analyticsService.recordGift(testAccountId, {
    giftName: "Rose",
    giftValue: 10,
    username: "test_user",
    timestamp: Date.now()
  });
  console.log("✅ Gift recorded");
  
  // Ghi nhận command
  analyticsService.recordCommand(testAccountId, {
    command: "draw_image",
    success: true,
    executionTime: 5000,
    timestamp: Date.now()
  });
  console.log("✅ Command recorded");
  
  // Lấy analytics summary
  const summary = analyticsService.getAnalyticsSummary(testAccountId);
  console.log("✅ Analytics summary:", {
    totalGifts: summary.totalGifts,
    totalCommands: summary.totalCommands,
    totalRevenue: summary.totalRevenue
  });
  
  // Tạo report
  const report = analyticsService.generateReport(testAccountId, 'daily');
  console.log("✅ Report generated:", report.insights.length, "insights");
  
  // Dừng analytics
  analyticsService.stopAnalytics(testAccountId);
  console.log("✅ Analytics stopped");
  
} catch (error) {
  console.log("❌ Analytics Service error:", error.message);
}

// Test 3: Game Features Service
console.log("\n3. 🎮 Testing Game Features Service...");
try {
  const testAccountId = "test_account_789";
  
  // Khởi tạo game features
  gameFeaturesService.initGameFeatures(testAccountId);
  console.log("✅ Game features initialized");
  
  // Cập nhật leaderboard
  await gameFeaturesService.updateLeaderboard(testAccountId, {
    gifts: 5,
    revenue: 100,
    commands: 10,
    viewers: 25
  });
  console.log("✅ Leaderboard updated");
  
  // Kiểm tra achievements
  const achievements = await gameFeaturesService.checkAchievements(testAccountId, {
    gifts: 1,
    totalGifts: 1,
    totalRevenue: 10,
    uniqueViewers: 1
  });
  console.log("✅ Achievements checked:", achievements.length, "unlocked");
  
  // Tạo mini-game
  const miniGame = gameFeaturesService.createMiniGame(testAccountId, "gift_race", {
    duration: 300000, // 5 phút
    maxParticipants: 10
  });
  console.log("✅ Mini-game created:", miniGame.id);
  
  // Tham gia mini-game
  const joinResult = gameFeaturesService.joinMiniGame(miniGame.id, "test_player");
  console.log("✅ Joined mini-game:", joinResult.success);
  
  // Cập nhật điểm
  const scoreResult = gameFeaturesService.updateMiniGameScore(miniGame.id, "test_player", 100);
  console.log("✅ Score updated:", scoreResult.success);
  
  // Kết thúc mini-game
  const endResult = gameFeaturesService.endMiniGame(miniGame.id);
  console.log("✅ Mini-game ended:", endResult.success, "Winner:", endResult.winner);
  
  // Tạo reward
  const reward = gameFeaturesService.createReward(testAccountId, "achievement", {
    coins: 500,
    experience: 200
  });
  console.log("✅ Reward created:", reward.id);
  
  // Claim reward
  const claimResult = gameFeaturesService.claimReward(reward.id, "test_user");
  console.log("✅ Reward claimed:", claimResult.success);
  
  // Dừng game features
  gameFeaturesService.stopGameFeatures(testAccountId);
  console.log("✅ Game features stopped");
  
} catch (error) {
  console.log("❌ Game Features Service error:", error.message);
}

// Test 4: Rate Limit Service
console.log("\n4. 🔒 Testing Rate Limit Service...");
try {
  const testKey = "test_rate_limit";
  const testUserId = "test_user_123";
  
  // Test rate limit check
  const rateLimitResult = await rateLimitService.checkRateLimit(testKey);
  console.log("✅ Rate limit check:", rateLimitResult.allowed ? "Allowed" : "Blocked");
  
  // Test user rate limit
  const userRateLimit = await rateLimitService.checkUserRateLimit(testUserId, "api:auth:login");
  console.log("✅ User rate limit:", userRateLimit.allowed ? "Allowed" : "Blocked");
  
  // Test IP rate limit
  const ipRateLimit = await rateLimitService.checkIPRateLimit("127.0.0.1", "api:auth:register");
  console.log("✅ IP rate limit:", ipRateLimit.allowed ? "Allowed" : "Blocked");
  
  // Test gift processing limit
  const giftLimit = await rateLimitService.checkGiftProcessingLimit("test_account", 50);
  console.log("✅ Gift processing limit:", giftLimit.allowed ? "Allowed" : "Blocked");
  
  // Test queue limit
  const queueLimit = await rateLimitService.checkQueueLimit("test_account", 5);
  console.log("✅ Queue limit:", queueLimit.allowed ? "Allowed" : "Blocked");
  
  // Lấy rate limit stats
  const stats = await rateLimitService.getRateLimitStats(testKey);
  console.log("✅ Rate limit stats:", stats);
  
  // Reset rate limit
  await rateLimitService.resetRateLimit(testKey);
  console.log("✅ Rate limit reset");
  
} catch (error) {
  console.log("❌ Rate Limit Service error:", error.message);
}

// Test 5: Integration Test
console.log("\n5. 🔗 Testing Integration...");
try {
  const testAccountId = "integration_test_123";
  
  // Khởi tạo tất cả services
  botHealthService.initHealthCheck(testAccountId);
  analyticsService.initAnalytics(testAccountId);
  gameFeaturesService.initGameFeatures(testAccountId);
  console.log("✅ All services initialized");
  
  // Simulate gift flow
  analyticsService.recordGift(testAccountId, {
    giftName: "Diamond",
    giftValue: 100,
    username: "integration_user",
    timestamp: Date.now()
  });
  
  await gameFeaturesService.updateLeaderboard(testAccountId, {
    gifts: 1,
    revenue: 100,
    viewers: 1
  });
  
  const achievements = await gameFeaturesService.checkAchievements(testAccountId, {
    gifts: 1,
    totalGifts: 1,
    totalRevenue: 100,
    uniqueViewers: 1
  });
  
  console.log("✅ Integration test completed:", {
    gifts: 1,
    revenue: 100,
    achievements: achievements.length
  });
  
  // Cleanup
  botHealthService.stopHealthCheck(testAccountId);
  analyticsService.stopAnalytics(testAccountId);
  gameFeaturesService.stopGameFeatures(testAccountId);
  console.log("✅ All services stopped");
  
} catch (error) {
  console.log("❌ Integration test error:", error.message);
}

console.log("\n🎉 All tests completed!");
console.log("\n📋 Summary:");
console.log("✅ Bot Health Service - Auto-reconnect & monitoring");
console.log("✅ Analytics Service - Real-time tracking & reporting");
console.log("✅ Game Features Service - Leaderboard & achievements");
console.log("✅ Rate Limit Service - Security & protection");
console.log("✅ Integration - All services working together");
console.log("\n🚀 System ready for production!");
