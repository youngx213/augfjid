import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Machine Learning cho Analytics và Recommendations
 */
class MachineLearningService extends EventEmitter {
  constructor() {
    super();
    this.models = new Map();
    this.trainingData = new Map();
    this.predictions = new Map();
    this.initializeModels();
  }

  /**
   * Khởi tạo các ML models
   */
  initializeModels() {
    // Gift Prediction Model
    this.models.set('gift_prediction', {
      name: 'Gift Prediction',
      type: 'regression',
      features: ['time_of_day', 'day_of_week', 'viewer_count', 'stream_duration', 'previous_gifts'],
      trained: false,
      accuracy: 0,
      lastTraining: null
    });

    // Viewer Behavior Model
    this.models.set('viewer_behavior', {
      name: 'Viewer Behavior Analysis',
      type: 'classification',
      features: ['session_duration', 'gift_frequency', 'interaction_rate', 'return_visits'],
      trained: false,
      accuracy: 0,
      lastTraining: null
    });

    // Content Recommendation Model
    this.models.set('content_recommendation', {
      name: 'Content Recommendation',
      type: 'recommendation',
      features: ['user_preferences', 'viewing_history', 'gift_history', 'time_patterns'],
      trained: false,
      accuracy: 0,
      lastTraining: null
    });

    // Revenue Prediction Model
    this.models.set('revenue_prediction', {
      name: 'Revenue Prediction',
      type: 'regression',
      features: ['stream_duration', 'peak_viewers', 'gift_types', 'time_slot', 'day_of_week'],
      trained: false,
      accuracy: 0,
      lastTraining: null
    });
  }

  /**
   * Thu thập dữ liệu training
   */
  async collectTrainingData(dataType, data) {
    try {
      const timestamp = Date.now();
      const dataKey = `${dataType}_${timestamp}`;
      
      await redis.hset(`ml:training:${dataType}`, dataKey, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));

      // Emit event for real-time processing
      this.emit('data:collected', {
        type: dataType,
        data: data,
        timestamp: new Date()
      });

      return { success: true, dataKey };
    } catch (error) {
      console.error("Failed to collect training data:", error.message);
      throw error;
    }
  }

  /**
   * Thu thập dữ liệu gift
   */
  async collectGiftData(giftData) {
    try {
      const features = {
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        viewer_count: giftData.viewerCount || 0,
        stream_duration: giftData.streamDuration || 0,
        gift_value: giftData.giftValue,
        gift_type: giftData.giftType,
        user_id: giftData.userId,
        account_id: giftData.accountId
      };

      return await this.collectTrainingData('gift', features);
    } catch (error) {
      console.error("Failed to collect gift data:", error.message);
      throw error;
    }
  }

  /**
   * Thu thập dữ liệu viewer behavior
   */
  async collectViewerBehavior(viewerData) {
    try {
      const features = {
        session_duration: viewerData.sessionDuration,
        gift_frequency: viewerData.giftFrequency,
        interaction_rate: viewerData.interactionRate,
        return_visits: viewerData.returnVisits,
        viewer_id: viewerData.viewerId,
        account_id: viewerData.accountId
      };

      return await this.collectTrainingData('viewer_behavior', features);
    } catch (error) {
      console.error("Failed to collect viewer behavior data:", error.message);
      throw error;
    }
  }

  /**
   * Thu thập dữ liệu stream performance
   */
  async collectStreamData(streamData) {
    try {
      const features = {
        stream_duration: streamData.duration,
        peak_viewers: streamData.peakViewers,
        total_gifts: streamData.totalGifts,
        total_revenue: streamData.totalRevenue,
        time_slot: streamData.timeSlot,
        day_of_week: streamData.dayOfWeek,
        account_id: streamData.accountId
      };

      return await this.collectTrainingData('stream_performance', features);
    } catch (error) {
      console.error("Failed to collect stream data:", error.message);
      throw error;
    }
  }

  /**
   * Training model (simplified implementation)
   */
  async trainModel(modelName) {
    try {
      const model = this.models.get(modelName);
      if (!model) {
        throw new Error(`Model not found: ${modelName}`);
      }

      // Get training data
      const trainingData = await this.getTrainingData(modelName);
      if (trainingData.length < 10) {
        throw new Error(`Insufficient training data for ${modelName}. Need at least 10 samples.`);
      }

      // Simulate training process
      console.log(`🤖 Training ${model.name} with ${trainingData.length} samples...`);
      
      // Simulate training time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate accuracy (simplified)
      const accuracy = Math.random() * 0.3 + 0.7; // 70-100% accuracy
      
      // Update model
      model.trained = true;
      model.accuracy = accuracy;
      model.lastTraining = new Date().toISOString();
      
      // Save model state
      await redis.hset(`ml:models:${modelName}`, {
        trained: true,
        accuracy: accuracy,
        lastTraining: model.lastTraining,
        trainingSamples: trainingData.length
      });

      this.emit('model:trained', {
        model: modelName,
        accuracy: accuracy,
        samples: trainingData.length
      });

      return {
        success: true,
        model: modelName,
        accuracy: accuracy,
        samples: trainingData.length
      };
    } catch (error) {
      console.error(`Failed to train model ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu training
   */
  async getTrainingData(dataType) {
    try {
      const data = await redis.hgetall(`ml:training:${dataType}`);
      return Object.values(data).map(item => JSON.parse(item));
    } catch (error) {
      return [];
    }
  }

  /**
   * Dự đoán gift tiếp theo
   */
  async predictNextGift(accountId, currentData) {
    try {
      const model = this.models.get('gift_prediction');
      if (!model.trained) {
        throw new Error("Gift prediction model is not trained");
      }

      // Simulate prediction
      const features = {
        time_of_day: currentData.timeOfDay || new Date().getHours(),
        day_of_week: currentData.dayOfWeek || new Date().getDay(),
        viewer_count: currentData.viewerCount || 0,
        stream_duration: currentData.streamDuration || 0,
        previous_gifts: currentData.previousGifts || 0
      };

      // Simple prediction logic (in real implementation, this would use actual ML)
      const probability = this.calculateGiftProbability(features);
      const predictedValue = this.calculateGiftValue(features);
      const predictedType = this.predictGiftType(features);

      const prediction = {
        probability: probability,
        predictedValue: predictedValue,
        predictedType: predictedType,
        confidence: model.accuracy,
        features: features,
        timestamp: new Date().toISOString()
      };

      // Store prediction
      await redis.hset(`ml:predictions:${accountId}`, Date.now().toString(), JSON.stringify(prediction));

      this.emit('prediction:made', {
        type: 'gift_prediction',
        accountId: accountId,
        prediction: prediction
      });

      return prediction;
    } catch (error) {
      console.error("Failed to predict next gift:", error.message);
      throw error;
    }
  }

  /**
   * Dự đoán revenue
   */
  async predictRevenue(accountId, streamData) {
    try {
      const model = this.models.get('revenue_prediction');
      if (!model.trained) {
        throw new Error("Revenue prediction model is not trained");
      }

      const features = {
        stream_duration: streamData.duration,
        peak_viewers: streamData.peakViewers,
        time_slot: streamData.timeSlot,
        day_of_week: streamData.dayOfWeek
      };

      // Simple revenue prediction
      const baseRevenue = features.peak_viewers * 0.1; // $0.1 per peak viewer
      const timeMultiplier = this.getTimeMultiplier(features.time_slot);
      const dayMultiplier = this.getDayMultiplier(features.day_of_week);
      
      const predictedRevenue = baseRevenue * timeMultiplier * dayMultiplier;
      const confidence = model.accuracy;

      const prediction = {
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        confidence: confidence,
        factors: {
          baseRevenue: baseRevenue,
          timeMultiplier: timeMultiplier,
          dayMultiplier: dayMultiplier
        },
        features: features,
        timestamp: new Date().toISOString()
      };

      await redis.hset(`ml:predictions:${accountId}`, `revenue_${Date.now()}`, JSON.stringify(prediction));

      return prediction;
    } catch (error) {
      console.error("Failed to predict revenue:", error.message);
      throw error;
    }
  }

  /**
   * Phân tích viewer behavior
   */
  async analyzeViewerBehavior(accountId, viewerId) {
    try {
      const model = this.models.get('viewer_behavior');
      if (!model.trained) {
        throw new Error("Viewer behavior model is not trained");
      }

      // Get viewer data
      const viewerData = await this.getViewerData(accountId, viewerId);
      
      // Analyze behavior patterns
      const analysis = {
        viewerType: this.classifyViewerType(viewerData),
        engagementLevel: this.calculateEngagementLevel(viewerData),
        loyaltyScore: this.calculateLoyaltyScore(viewerData),
        giftProbability: this.calculateGiftProbability(viewerData),
        recommendations: this.generateViewerRecommendations(viewerData),
        timestamp: new Date().toISOString()
      };

      await redis.hset(`ml:analysis:${accountId}:${viewerId}`, Date.now().toString(), JSON.stringify(analysis));

      return analysis;
    } catch (error) {
      console.error("Failed to analyze viewer behavior:", error.message);
      throw error;
    }
  }

  /**
   * Tạo recommendations
   */
  async generateRecommendations(userId, type = 'content') {
    try {
      const model = this.models.get('content_recommendation');
      if (!model.trained) {
        throw new Error("Content recommendation model is not trained");
      }

      // Get user data
      const userData = await this.getUserData(userId);
      
      let recommendations = [];
      
      switch (type) {
        case 'content':
          recommendations = this.generateContentRecommendations(userData);
          break;
        case 'timing':
          recommendations = this.generateTimingRecommendations(userData);
          break;
        case 'gifts':
          recommendations = this.generateGiftRecommendations(userData);
          break;
        default:
          recommendations = this.generateGeneralRecommendations(userData);
      }

      const result = {
        type: type,
        recommendations: recommendations,
        confidence: model.accuracy,
        timestamp: new Date().toISOString()
      };

      await redis.hset(`ml:recommendations:${userId}`, `${type}_${Date.now()}`, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error("Failed to generate recommendations:", error.message);
      throw error;
    }
  }

  /**
   * Helper methods for predictions
   */
  calculateGiftProbability(features) {
    let probability = 0.1; // Base probability
    
    // Time of day factor
    if (features.time_of_day >= 19 && features.time_of_day <= 23) {
      probability += 0.3; // Evening peak
    }
    
    // Day of week factor
    if (features.day_of_week >= 5) { // Weekend
      probability += 0.2;
    }
    
    // Viewer count factor
    if (features.viewer_count > 100) {
      probability += 0.2;
    }
    
    // Stream duration factor
    if (features.stream_duration > 3600) { // > 1 hour
      probability += 0.1;
    }
    
    return Math.min(probability, 0.95); // Cap at 95%
  }

  calculateGiftValue(features) {
    let baseValue = 10; // Base gift value
    
    // Viewer count factor
    if (features.viewer_count > 100) {
      baseValue *= 1.5;
    }
    
    // Time factor
    if (features.time_of_day >= 19 && features.time_of_day <= 23) {
      baseValue *= 1.3;
    }
    
    return Math.round(baseValue);
  }

  predictGiftType(features) {
    const giftTypes = ['Rose', 'Heart', 'Star', 'Crown', 'Diamond'];
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < giftTypes.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return giftTypes[i];
      }
    }
    
    return giftTypes[0];
  }

  getTimeMultiplier(timeSlot) {
    const multipliers = {
      'morning': 0.8,
      'afternoon': 1.0,
      'evening': 1.5,
      'night': 1.2
    };
    return multipliers[timeSlot] || 1.0;
  }

  getDayMultiplier(dayOfWeek) {
    const multipliers = {
      0: 1.2, // Sunday
      1: 0.8, // Monday
      2: 0.9, // Tuesday
      3: 1.0, // Wednesday
      4: 1.1, // Thursday
      5: 1.3, // Friday
      6: 1.4  // Saturday
    };
    return multipliers[dayOfWeek] || 1.0;
  }

  classifyViewerType(viewerData) {
    if (viewerData.gift_frequency > 0.1) return 'high_value';
    if (viewerData.return_visits > 5) return 'loyal';
    if (viewerData.session_duration > 1800) return 'engaged';
    return 'casual';
  }

  calculateEngagementLevel(viewerData) {
    const score = (viewerData.session_duration / 3600) * 0.4 + 
                  viewerData.interaction_rate * 0.3 + 
                  (viewerData.return_visits / 10) * 0.3;
    return Math.min(score, 1.0);
  }

  calculateLoyaltyScore(viewerData) {
    return Math.min(viewerData.return_visits / 10, 1.0);
  }

  generateContentRecommendations(userData) {
    return [
      "Stream during evening hours (7-11 PM) for higher engagement",
      "Focus on interactive content to increase viewer retention",
      "Consider longer streams (2+ hours) for better revenue",
      "Weekend streams tend to perform better"
    ];
  }

  generateTimingRecommendations(userData) {
    return [
      "Best streaming time: 7-9 PM",
      "Avoid Monday and Tuesday mornings",
      "Weekend streams get 30% more viewers",
      "Stream for at least 1 hour for optimal results"
    ];
  }

  generateGiftRecommendations(userData) {
    return [
      "Encourage viewers to send gifts during peak hours",
      "Acknowledge gift senders to encourage more gifts",
      "Create gift goals to motivate viewers",
      "Thank viewers personally for larger gifts"
    ];
  }

  generateGeneralRecommendations(userData) {
    return [
      "Maintain consistent streaming schedule",
      "Engage with chat regularly",
      "Create unique content to stand out",
      "Build a community around your content"
    ];
  }

  async getViewerData(accountId, viewerId) {
    // Simulate getting viewer data from Redis
    return {
      session_duration: Math.random() * 3600,
      gift_frequency: Math.random() * 0.2,
      interaction_rate: Math.random(),
      return_visits: Math.floor(Math.random() * 20)
    };
  }

  async getUserData(userId) {
    // Simulate getting user data from Redis
    return {
      total_streams: Math.floor(Math.random() * 100),
      total_revenue: Math.random() * 1000,
      avg_viewers: Math.floor(Math.random() * 500),
      best_performing_time: 'evening'
    };
  }

  /**
   * Lấy trạng thái models
   */
  getModelsStatus() {
    const status = {};
    for (const [key, model] of this.models) {
      status[key] = {
        name: model.name,
        type: model.type,
        trained: model.trained,
        accuracy: model.accuracy,
        lastTraining: model.lastTraining
      };
    }
    return status;
  }

  /**
   * Lấy thống kê ML
   */
  async getMLStats() {
    try {
      const stats = {
        totalModels: this.models.size,
        trainedModels: Array.from(this.models.values()).filter(m => m.trained).length,
        totalPredictions: 0,
        totalTrainingData: 0
      };

      // Count predictions and training data
      const predictionKeys = await redis.keys('ml:predictions:*');
      const trainingKeys = await redis.keys('ml:training:*');
      
      stats.totalPredictions = predictionKeys.length;
      stats.totalTrainingData = trainingKeys.length;

      return stats;
    } catch (error) {
      return {
        totalModels: 0,
        trainedModels: 0,
        totalPredictions: 0,
        totalTrainingData: 0
      };
    }
  }
}

export const machineLearningService = new MachineLearningService();
