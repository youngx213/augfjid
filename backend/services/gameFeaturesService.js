import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service quản lý các tính năng game như leaderboard, achievements, mini-games
 */
class GameFeaturesService extends EventEmitter {
  constructor() {
    super();
    this.leaderboards = new Map();
    this.achievements = new Map();
    this.miniGames = new Map();
    this.rewards = new Map();
  }

  /**
   * Khởi tạo game features cho account
   */
  initGameFeatures(accountId) {
    const gameFeatures = {
      accountId,
      leaderboard: {
        totalGifts: 0,
        totalRevenue: 0,
        totalCommands: 0,
        uniqueViewers: 0,
        rank: 0,
        lastUpdate: Date.now()
      },
      achievements: new Map(),
      miniGames: new Map(),
      rewards: new Map(),
      stats: {
        streak: 0,
        bestStreak: 0,
        totalPlayTime: 0,
        level: 1,
        experience: 0
      }
    };

    this.leaderboards.set(accountId, gameFeatures.leaderboard);
    this.achievements.set(accountId, gameFeatures.achievements);
    this.miniGames.set(accountId, gameFeatures.miniGames);
    this.rewards.set(accountId, gameFeatures.rewards);

    return gameFeatures;
  }

  /**
   * Cập nhật leaderboard
   */
  async updateLeaderboard(accountId, data) {
    const leaderboard = this.leaderboards.get(accountId);
    if (!leaderboard) {
      this.initGameFeatures(accountId);
      return this.updateLeaderboard(accountId, data);
    }

    // Cập nhật stats
    if (data.gifts) leaderboard.totalGifts += data.gifts;
    if (data.revenue) leaderboard.totalRevenue += data.revenue;
    if (data.commands) leaderboard.totalCommands += data.commands;
    if (data.viewers) leaderboard.uniqueViewers = Math.max(leaderboard.uniqueViewers, data.viewers);
    
    leaderboard.lastUpdate = Date.now();

    // Lưu vào Redis
    await this.saveLeaderboardToRedis(accountId, leaderboard);
    
    // Cập nhật rank
    await this.updateRank(accountId);
    
    this.emit('leaderboard:updated', { accountId, leaderboard });
  }

  /**
   * Cập nhật rank cho tất cả accounts
   */
  async updateRank(accountId) {
    try {
      // Lấy tất cả leaderboards từ Redis
      const allLeaderboards = await redis.keys('leaderboard:*');
      const leaderboardData = [];
      
      for (const key of allLeaderboards) {
        const data = await redis.hgetall(key);
        if (data.accountId) {
          leaderboardData.push({
            accountId: data.accountId,
            totalGifts: parseInt(data.totalGifts) || 0,
            totalRevenue: parseFloat(data.totalRevenue) || 0,
            totalCommands: parseInt(data.totalCommands) || 0,
            uniqueViewers: parseInt(data.uniqueViewers) || 0
          });
        }
      }
      
      // Sắp xếp theo total revenue
      leaderboardData.sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Cập nhật rank
      for (let i = 0; i < leaderboardData.length; i++) {
        const rank = i + 1;
        await redis.hset(`leaderboard:${leaderboardData[i].accountId}`, 'rank', rank);
        
        // Cập nhật local data
        const localLeaderboard = this.leaderboards.get(leaderboardData[i].accountId);
        if (localLeaderboard) {
          localLeaderboard.rank = rank;
        }
      }
      
      this.emit('ranks:updated', { leaderboardData });
    } catch (error) {
      console.error('Error updating ranks:', error);
    }
  }

  /**
   * Lấy leaderboard
   */
  async getLeaderboard(limit = 10, sortBy = 'totalRevenue') {
    try {
      const allLeaderboards = await redis.keys('leaderboard:*');
      const leaderboardData = [];
      
      for (const key of allLeaderboards) {
        const data = await redis.hgetall(key);
        if (data.accountId) {
          leaderboardData.push({
            accountId: data.accountId,
            totalGifts: parseInt(data.totalGifts) || 0,
            totalRevenue: parseFloat(data.totalRevenue) || 0,
            totalCommands: parseInt(data.totalCommands) || 0,
            uniqueViewers: parseInt(data.uniqueViewers) || 0,
            rank: parseInt(data.rank) || 0,
            lastUpdate: parseInt(data.lastUpdate) || 0
          });
        }
      }
      
      // Sắp xếp theo sortBy
      leaderboardData.sort((a, b) => b[sortBy] - a[sortBy]);
      
      return leaderboardData.slice(0, limit);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Kiểm tra và unlock achievements
   */
  async checkAchievements(accountId, data) {
    const achievements = this.achievements.get(accountId);
    if (!achievements) {
      this.initGameFeatures(accountId);
      return this.checkAchievements(accountId, data);
    }

    const unlockedAchievements = [];
    
    // Achievement: First Gift
    if (data.gifts && data.gifts > 0 && !achievements.has('first_gift')) {
      achievements.set('first_gift', {
        id: 'first_gift',
        name: 'Quà Tặng Đầu Tiên',
        description: 'Nhận quà tặng đầu tiên',
        unlockedAt: Date.now(),
        reward: { coins: 100, experience: 50 }
      });
      unlockedAchievements.push(achievements.get('first_gift'));
    }
    
    // Achievement: Gift Collector
    if (data.totalGifts >= 100 && !achievements.has('gift_collector')) {
      achievements.set('gift_collector', {
        id: 'gift_collector',
        name: 'Người Thu Thập Quà',
        description: 'Nhận 100 quà tặng',
        unlockedAt: Date.now(),
        reward: { coins: 500, experience: 200 }
      });
      unlockedAchievements.push(achievements.get('gift_collector'));
    }
    
    // Achievement: Command Master
    if (data.totalCommands >= 1000 && !achievements.has('command_master')) {
      achievements.set('command_master', {
        id: 'command_master',
        name: 'Bậc Thầy Lệnh',
        description: 'Thực thi 1000 lệnh',
        unlockedAt: Date.now(),
        reward: { coins: 1000, experience: 500 }
      });
      unlockedAchievements.push(achievements.get('command_master'));
    }
    
    // Achievement: Viewer Magnet
    if (data.uniqueViewers >= 50 && !achievements.has('viewer_magnet')) {
      achievements.set('viewer_magnet', {
        id: 'viewer_magnet',
        name: 'Nam Châm Viewer',
        description: 'Thu hút 50 viewers',
        unlockedAt: Date.now(),
        reward: { coins: 300, experience: 150 }
      });
      unlockedAchievements.push(achievements.get('viewer_magnet'));
    }
    
    // Achievement: Streak Master
    if (data.streak >= 7 && !achievements.has('streak_master')) {
      achievements.set('streak_master', {
        id: 'streak_master',
        name: 'Bậc Thầy Streak',
        description: 'Duy trì streak 7 ngày',
        unlockedAt: Date.now(),
        reward: { coins: 700, experience: 300 }
      });
      unlockedAchievements.push(achievements.get('streak_master'));
    }
    
    // Lưu achievements vào Redis
    if (unlockedAchievements.length > 0) {
      await this.saveAchievementsToRedis(accountId, achievements);
      this.emit('achievements:unlocked', { accountId, achievements: unlockedAchievements });
    }
    
    return unlockedAchievements;
  }

  /**
   * Lấy achievements của account
   */
  getAchievements(accountId) {
    const achievements = this.achievements.get(accountId);
    if (!achievements) return [];

    return Array.from(achievements.values());
  }

  /**
   * Tạo mini-game
   */
  createMiniGame(accountId, gameType, config = {}) {
    const gameId = `${accountId}_${Date.now()}`;
    const miniGame = {
      id: gameId,
      accountId,
      type: gameType,
      config,
      status: 'active',
      startTime: Date.now(),
      participants: new Set(),
      rewards: new Map(),
      leaderboard: new Map()
    };

    this.miniGames.set(gameId, miniGame);
    
    this.emit('minigame:created', { gameId, miniGame });
    return miniGame;
  }

  /**
   * Tham gia mini-game
   */
  joinMiniGame(gameId, username) {
    const miniGame = this.miniGames.get(gameId);
    if (!miniGame || miniGame.status !== 'active') {
      return { success: false, message: 'Game không khả dụng' };
    }

    miniGame.participants.add(username);
    miniGame.leaderboard.set(username, { score: 0, joinedAt: Date.now() });
    
    this.emit('minigame:joined', { gameId, username, miniGame });
    return { success: true, message: 'Tham gia thành công' };
  }

  /**
   * Cập nhật điểm mini-game
   */
  updateMiniGameScore(gameId, username, score) {
    const miniGame = this.miniGames.get(gameId);
    if (!miniGame || !miniGame.participants.has(username)) {
      return { success: false, message: 'Không thể cập nhật điểm' };
    }

    const currentScore = miniGame.leaderboard.get(username);
    if (currentScore) {
      currentScore.score += score;
      currentScore.lastUpdate = Date.now();
    }
    
    this.emit('minigame:score_updated', { gameId, username, score, miniGame });
    return { success: true, message: 'Điểm đã được cập nhật' };
  }

  /**
   * Kết thúc mini-game
   */
  endMiniGame(gameId) {
    const miniGame = this.miniGames.get(gameId);
    if (!miniGame) {
      return { success: false, message: 'Game không tồn tại' };
    }

    miniGame.status = 'ended';
    miniGame.endTime = Date.now();
    
    // Xác định người thắng
    const sortedLeaderboard = Array.from(miniGame.leaderboard.entries())
      .sort((a, b) => b[1].score - a[1].score);
    
    const winner = sortedLeaderboard[0];
    if (winner) {
      miniGame.winner = winner[0];
      miniGame.winnerScore = winner[1].score;
    }
    
    this.emit('minigame:ended', { gameId, miniGame });
    return { success: true, message: 'Game đã kết thúc', winner: miniGame.winner };
  }

  /**
   * Lấy mini-games đang hoạt động
   */
  getActiveMiniGames(accountId = null) {
    const activeGames = [];
    for (const [gameId, game] of this.miniGames) {
      if (game.status === 'active' && (!accountId || game.accountId === accountId)) {
        activeGames.push({
          id: gameId,
          type: game.type,
          participants: game.participants.size,
          startTime: game.startTime,
          leaderboard: Array.from(game.leaderboard.entries())
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 10)
        });
      }
    }
    return activeGames;
  }

  /**
   * Tạo reward
   */
  createReward(accountId, rewardType, rewardData) {
    const rewardId = `${accountId}_${Date.now()}`;
    const reward = {
      id: rewardId,
      accountId,
      type: rewardType,
      data: rewardData,
      createdAt: Date.now(),
      claimed: false,
      claimedAt: null
    };

    this.rewards.set(rewardId, reward);
    
    this.emit('reward:created', { rewardId, reward });
    return reward;
  }

  /**
   * Claim reward
   */
  claimReward(rewardId, username) {
    const reward = this.rewards.get(rewardId);
    if (!reward || reward.claimed) {
      return { success: false, message: 'Reward không khả dụng' };
    }

    reward.claimed = true;
    reward.claimedAt = Date.now();
    reward.claimedBy = username;
    
    this.emit('reward:claimed', { rewardId, reward, username });
    return { success: true, message: 'Reward đã được claim', reward };
  }

  /**
   * Lấy rewards của account
   */
  getRewards(accountId, claimed = null) {
    const rewards = [];
    for (const [rewardId, reward] of this.rewards) {
      if (reward.accountId === accountId && (claimed === null || reward.claimed === claimed)) {
        rewards.push(reward);
      }
    }
    return rewards.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Lưu leaderboard vào Redis
   */
  async saveLeaderboardToRedis(accountId, leaderboard) {
    try {
      await redis.hset(`leaderboard:${accountId}`, {
        accountId,
        totalGifts: leaderboard.totalGifts,
        totalRevenue: leaderboard.totalRevenue,
        totalCommands: leaderboard.totalCommands,
        uniqueViewers: leaderboard.uniqueViewers,
        rank: leaderboard.rank,
        lastUpdate: leaderboard.lastUpdate
      });
    } catch (error) {
      console.error('Error saving leaderboard to Redis:', error);
    }
  }

  /**
   * Lưu achievements vào Redis
   */
  async saveAchievementsToRedis(accountId, achievements) {
    try {
      const achievementsArray = Array.from(achievements.values());
      await redis.hset(`achievements:${accountId}`, {
        data: JSON.stringify(achievementsArray),
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Error saving achievements to Redis:', error);
    }
  }

  /**
   * Load achievements từ Redis
   */
  async loadAchievementsFromRedis(accountId) {
    try {
      const data = await redis.hgetall(`achievements:${accountId}`);
      if (data.data) {
        const achievementsArray = JSON.parse(data.data);
        const achievements = new Map();
        
        for (const achievement of achievementsArray) {
          achievements.set(achievement.id, achievement);
        }
        
        this.achievements.set(accountId, achievements);
      }
    } catch (error) {
      console.error('Error loading achievements from Redis:', error);
    }
  }

  /**
   * Dừng game features cho account
   */
  stopGameFeatures(accountId) {
    this.leaderboards.delete(accountId);
    this.achievements.delete(accountId);
    
    // Dừng mini-games của account
    for (const [gameId, game] of this.miniGames) {
      if (game.accountId === accountId) {
        this.miniGames.delete(gameId);
      }
    }
    
    // Dừng rewards của account
    for (const [rewardId, reward] of this.rewards) {
      if (reward.accountId === accountId) {
        this.rewards.delete(rewardId);
      }
    }
  }
}

export const gameFeaturesService = new GameFeaturesService();
