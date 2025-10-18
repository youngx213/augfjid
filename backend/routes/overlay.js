import express from "express";
import { Canvas, Image } from "canvas";
import { getPresets, getStats } from "../services/gameService.js";
import sharp from "sharp";

// Helper function to draw images with fallback and WebP support
async function drawImageWithFallback(ctx, imageUrl, x, y, width, height) {
  return new Promise(async (resolve) => {
    try {
      let imgBuffer;
      
      // Check if URL is WebP format
      if (imageUrl.includes('.webp') || imageUrl.includes('~tplv-obj.webp')) {
        // Convert WebP to PNG using Sharp
        const response = await fetch(imageUrl);
        if (!response.ok) {
          drawPlaceholder(ctx, x, y, width, height);
          resolve(false);
          return;
        }
        
        const webpBuffer = Buffer.from(await response.arrayBuffer());
        imgBuffer = await sharp(webpBuffer)
          .png()
          .toBuffer();
      } else {
        // For non-WebP images, fetch directly
        const response = await fetch(imageUrl);
        if (!response.ok) {
          drawPlaceholder(ctx, x, y, width, height);
          resolve(false);
          return;
        }
        imgBuffer = Buffer.from(await response.arrayBuffer());
      }
      
      // Create Image from buffer
      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, x, y, width, height);
          resolve(true);
        } catch (err) {
          drawPlaceholder(ctx, x, y, width, height);
          resolve(false);
        }
      };
      img.onerror = () => {
        drawPlaceholder(ctx, x, y, width, height);
        resolve(false);
      };
      
      img.src = imgBuffer;
      
    } catch (error) {
      console.error(`Failed to load image ${imageUrl}:`, error.message);
      drawPlaceholder(ctx, x, y, width, height);
      resolve(false);
    }
  });
}

function drawPlaceholder(ctx, x, y, width, height) {
  // Draw a simple gift placeholder
  ctx.fillStyle = "#4a5568"; // Gray background
  ctx.fillRect(x, y, width, height);
  
  // Draw gift icon (simple square)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
  
  // Draw border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

const router = express.Router();

// Generate Goal Likes Bar overlay
router.get("/goal-likes/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const presets = await getPresets(username);
    const stats = await getStats(username);
    
    // Create canvas with higher resolution
    const width = 1000;
    const height = 280;
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext("2d");
    
    // Background with animated gradient
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
    gradient.addColorStop(0, "rgba(30, 41, 59, 0.98)"); // slate-800
    gradient.addColorStop(0.5, "rgba(15, 23, 42, 0.95)"); // slate-900
    gradient.addColorStop(1, "rgba(2, 6, 23, 0.98)"); // slate-950
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Animated border with glow effect
    ctx.strokeStyle = "#0ea5e9"; // sky-500
    ctx.lineWidth = 4;
    ctx.shadowColor = "#0ea5e9";
    ctx.shadowBlur = 20;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.shadowBlur = 0;
    
    // Title with glow effect
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#0ea5e9";
    ctx.shadowBlur = 10;
    ctx.fillText("🎯 GOAL PROGRESS", width / 2, 50);
    ctx.shadowBlur = 0;
    
    // Goal section with modern card design
    const cardX = 30;
    const cardY = 80;
    const cardWidth = width - 60;
    const cardHeight = 120;
    
    // Card background
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    // Card border
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
    
    // Goal text with emoji
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`💰 Goal: ${stats.coins || 0} / ${stats.winGoal || 100} Coins`, cardX + 20, cardY + 35);
    
    // Progress bar with modern design
    const progressBarX = cardX + 20;
    const progressBarY = cardY + 50;
    const progressBarWidth = cardWidth - 40;
    const progressBarHeight = 25;
    
    // Progress bar background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // Progress bar fill with gradient
    const progress = Math.min(1, (stats.coins || 0) / (stats.winGoal || 100));
    const progressWidth = progressBarWidth * progress;
    
    if (progressWidth > 0) {
      const progressGradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
      progressGradient.addColorStop(0, "#10b981"); // emerald-500
      progressGradient.addColorStop(0.5, "#059669"); // emerald-600
      progressGradient.addColorStop(1, "#047857"); // emerald-700
      ctx.fillStyle = progressGradient;
      ctx.fillRect(progressBarX, progressBarY, progressWidth, progressBarHeight);
      
      // Progress bar shine effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(progressBarX, progressBarY, progressWidth, progressBarHeight / 2);
    }
    
    // Progress percentage
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(progress * 100)}%`, progressBarX + progressBarWidth / 2, progressBarY + 18);
    
    // Top gifts section
    const topGifts = presets?.slice(0, 5) || [];
    if (topGifts.length > 0) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🎁 Top Gifts:", cardX + 20, cardY + 95);
      
      // Gift icons with modern spacing
      let x = cardX + 20;
      for (let i = 0; i < Math.min(topGifts.length, 5); i++) {
        const gift = topGifts[i];
        if (gift.imageUrl) {
          // Gift icon background
          ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
          ctx.fillRect(x - 5, cardY + 105, 50, 50);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 5, cardY + 105, 50, 50);
          
          await drawImageWithFallback(ctx, gift.imageUrl, x, cardY + 110, 40, 40);
          x += 55;
        }
      }
    }
    
    // Convert to buffer and send
    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.send(buffer);
  } catch (err) {
    console.error("Error generating goal likes overlay:", err);
    res.status(500).send("Error generating overlay");
  }
});

// Generate TikTok Gift Presets overlay
router.get("/gift-presets/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const presets = await getPresets(username);
    
    // Handle case when no presets exist
    if (!presets || !Array.isArray(presets) || presets.length === 0) {
      // Create a default "no presets" overlay
      const width = 1200;
      const height = 300;
      const canvas = new Canvas(width, height);
      const ctx = canvas.getContext("2d");
      
      // Background with TikTok-style gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(255, 0, 80, 0.95)"); // TikTok pink
      gradient.addColorStop(0.5, "rgba(0, 242, 255, 0.95)"); // TikTok cyan
      gradient.addColorStop(1, "rgba(255, 0, 80, 0.95)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Border with glow
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 15;
      ctx.strokeRect(3, 3, width - 6, height - 6);
      ctx.shadowBlur = 0;
      
      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 5;
      ctx.fillText("🎁 TIKTOK GIFT PRESETS", width / 2, 100);
      ctx.shadowBlur = 0;
      
      // No presets message
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("No Gift Presets Configured", width / 2, 150);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`Streamer: @${username}`, width / 2, 180);
      
      // Footer info
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Create gift presets in the dashboard to see them here", width / 2, height - 30);
      
      // Convert to buffer and send
      const buffer = canvas.toBuffer("image/png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-cache");
      res.send(buffer);
      return;
    }
    
    // Create canvas with dynamic height based on presets
    const width = 1200;
    const activePresets = presets.filter(p => p.enabled !== false);
    const cols = 4;
    const rows = Math.ceil(activePresets.length / cols);
    const height = Math.max(400, 120 + (rows * 150)); // Dynamic height
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext("2d");
    
    // Background with TikTok-style gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(255, 0, 80, 0.95)"); // TikTok pink
    gradient.addColorStop(0.5, "rgba(0, 242, 255, 0.95)"); // TikTok cyan
    gradient.addColorStop(1, "rgba(255, 0, 80, 0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Border with glow
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.shadowBlur = 0;
    
    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 5;
    ctx.fillText("🎁 TIKTOK GIFT PRESETS", width / 2, 50);
    ctx.shadowBlur = 0;
    
    // Active presets grid
    const cardWidth = (width - 100) / cols;
    const cardHeight = 140; // Fixed card height
    
    for (let i = 0; i < Math.min(activePresets.length, cols * rows); i++) {
      const preset = activePresets[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = 50 + col * cardWidth;
      const y = 80 + row * cardHeight;
      
      // Gift card background
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(x, y, cardWidth - 10, cardHeight - 10);
      
      // Gift card border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardWidth - 10, cardHeight - 10);
      
      // Gift image
      if (preset.imageUrl) {
        await drawImageWithFallback(ctx, preset.imageUrl, x + 10, y + 10, 60, 60);
      }
      
      // Gift name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(preset.giftName || "Unknown Gift", x + cardWidth/2 - 5, y + 85);
      
      // Coins per unit
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`💰 ${preset.coinsPerUnit || 1} coins`, x + cardWidth/2 - 5, y + 105);
      
      // Commands count
      ctx.fillStyle = "#00ff00";
      ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`⚡ ${(preset.commands || []).length} commands`, x + cardWidth/2 - 5, y + 120);
      
      // Punishment indicator
      if (preset.punishmentImage) {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("🔥 Punishment", x + cardWidth/2 - 5, y + 135);
      }
    }
    
    // Footer info
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Active Presets: ${activePresets.length} | Streamer: @${username}`, width / 2, height - 20);
    
    // Convert to buffer and send
    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.send(buffer);
  } catch (err) {
    console.error("Error generating gift presets overlay:", err);
    res.status(500).send("Error generating overlay");
  }
});

// Generate Smart Bar overlay
router.get("/smart-bar/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const presets = await getPresets(username);
    const stats = await getStats(username);
    
    // Create canvas
    const canvas = new Canvas(600, 150);
    const ctx = canvas.getContext("2d");
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, 600, 150);
    
    // Border
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 600, 150);
    
    // Streamer name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`@${username}`, 20, 30);
    
    // Stats
    ctx.font = "16px Arial";
    ctx.fillText(`Coins: ${stats.coins || 0}`, 20, 60);
    ctx.fillText(`Viewers: ${stats.viewers || 0}`, 20, 85);
    ctx.fillText(`Timer: ${stats.timer || 0}s`, 20, 110);
    
    // Active presets count
    const activePresets = presets?.filter(p => p.enabled !== false).length || 0;
    ctx.fillText(`Active Gifts: ${activePresets}`, 300, 60);
    
    // Recent gift (if any)
    if (presets && presets.length > 0) {
      const recentGift = presets[0];
      ctx.fillText(`Latest: ${recentGift.giftName}`, 300, 85);
      if (recentGift.imageUrl) {
        await drawImageWithFallback(ctx, recentGift.imageUrl, 500, 20, 60, 60);
      }
    }
    
    // Convert to buffer and send
    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.send(buffer);
  } catch (err) {
    console.error("Error generating smart bar overlay:", err);
    res.status(500).send("Error generating overlay");
  }
});

// Generate Top Gifters overlay
router.get("/top-gifters/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const presets = await getPresets(username);
    
    // Create canvas
    const canvas = new Canvas(500, 400);
    const ctx = canvas.getContext("2d");
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, 500, 400);
    
    // Border
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 500, 400);
    
    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.fillText("Top Gifters", 20, 35);
    
    // Gift list (top 10)
    const topGifts = presets?.slice(0, 10) || [];
    let y = 70;
    
    for (let i = 0; i < topGifts.length; i++) {
      const gift = topGifts[i];
      
      // Rank number
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`${i + 1}.`, 20, y);
      
      // Gift image
      if (gift.imageUrl) {
        await drawImageWithFallback(ctx, gift.imageUrl, 50, y - 20, 30, 30);
      }
      
      // Gift name
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.fillText(gift.giftName, 90, y);
      
      // Price
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px Arial";
      ctx.fillText(`${gift.coinsPerUnit || 1} coins`, 350, y);
      
      // Commands count
      const commandCount = gift.commands?.length || 0;
      ctx.fillStyle = "#ff8800";
      ctx.fillText(`${commandCount} commands`, 420, y);
      
      y += 35;
    }
    
    // Convert to buffer and send
    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.send(buffer);
  } catch (err) {
    console.error("Error generating top gifters overlay:", err);
    res.status(500).send("Error generating overlay");
  }
});

export default router;
