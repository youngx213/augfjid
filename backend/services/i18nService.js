import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Internationalization (i18n) cho hệ thống
 */
class I18nService extends EventEmitter {
  constructor() {
    super();
    this.languages = new Map();
    this.translations = new Map();
    this.currencies = new Map();
    this.timezones = new Map();
    this.initializeLanguages();
    this.initializeCurrencies();
    this.initializeTimezones();
  }

  /**
   * Khởi tạo languages
   */
  initializeLanguages() {
    this.languages.set('en', {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      rtl: false,
      enabled: true,
      isDefault: true
    });

    this.languages.set('vi', {
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
      flag: '🇻🇳',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('zh', {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      flag: '🇨🇳',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('ja', {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flag: '🇯🇵',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('ko', {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flag: '🇰🇷',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('th', {
      code: 'th',
      name: 'Thai',
      nativeName: 'ไทย',
      flag: '🇹🇭',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('es', {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('fr', {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('de', {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
      rtl: false,
      enabled: true,
      isDefault: false
    });

    this.languages.set('ar', {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇸🇦',
      rtl: true,
      enabled: true,
      isDefault: false
    });
  }

  /**
   * Khởi tạo currencies
   */
  initializeCurrencies() {
    this.currencies.set('USD', {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      symbolPosition: 'before',
      decimalPlaces: 2,
      enabled: true,
      isDefault: true
    });

    this.currencies.set('VND', {
      code: 'VND',
      name: 'Vietnamese Dong',
      symbol: '₫',
      symbolPosition: 'after',
      decimalPlaces: 0,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('CNY', {
      code: 'CNY',
      name: 'Chinese Yuan',
      symbol: '¥',
      symbolPosition: 'before',
      decimalPlaces: 2,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('JPY', {
      code: 'JPY',
      name: 'Japanese Yen',
      symbol: '¥',
      symbolPosition: 'before',
      decimalPlaces: 0,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('KRW', {
      code: 'KRW',
      name: 'South Korean Won',
      symbol: '₩',
      symbolPosition: 'before',
      decimalPlaces: 0,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('THB', {
      code: 'THB',
      name: 'Thai Baht',
      symbol: '฿',
      symbolPosition: 'before',
      decimalPlaces: 2,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('EUR', {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      symbolPosition: 'after',
      decimalPlaces: 2,
      enabled: true,
      isDefault: false
    });

    this.currencies.set('GBP', {
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      symbolPosition: 'before',
      decimalPlaces: 2,
      enabled: true,
      isDefault: false
    });
  }

  /**
   * Khởi tạo timezones
   */
  initializeTimezones() {
    this.timezones.set('UTC', {
      code: 'UTC',
      name: 'Coordinated Universal Time',
      offset: '+00:00',
      enabled: true,
      isDefault: true
    });

    this.timezones.set('Asia/Ho_Chi_Minh', {
      code: 'Asia/Ho_Chi_Minh',
      name: 'Vietnam Time',
      offset: '+07:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Asia/Shanghai', {
      code: 'Asia/Shanghai',
      name: 'China Standard Time',
      offset: '+08:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Asia/Tokyo', {
      code: 'Asia/Tokyo',
      name: 'Japan Standard Time',
      offset: '+09:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Asia/Seoul', {
      code: 'Asia/Seoul',
      name: 'Korea Standard Time',
      offset: '+09:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Asia/Bangkok', {
      code: 'Asia/Bangkok',
      name: 'Indochina Time',
      offset: '+07:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('America/New_York', {
      code: 'America/New_York',
      name: 'Eastern Time',
      offset: '-05:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Europe/London', {
      code: 'Europe/London',
      name: 'Greenwich Mean Time',
      offset: '+00:00',
      enabled: true,
      isDefault: false
    });

    this.timezones.set('Europe/Paris', {
      code: 'Europe/Paris',
      name: 'Central European Time',
      offset: '+01:00',
      enabled: true,
      isDefault: false
    });
  }

  /**
   * Lấy user preferences
   */
  async getUserPreferences(userId) {
    try {
      const preferences = await redis.hgetall(`user:${userId}:i18n`);
      return {
        language: preferences.language || 'en',
        currency: preferences.currency || 'USD',
        timezone: preferences.timezone || 'UTC',
        dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
        timeFormat: preferences.timeFormat || '12h'
      };
    } catch (error) {
      console.error("Failed to get user preferences:", error.message);
      return {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      };
    }
  }

  /**
   * Cập nhật user preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      await redis.hset(`user:${userId}:i18n`, preferences);
      this.emit('user:preferences:updated', { userId, preferences });
      return preferences;
    } catch (error) {
      console.error("Failed to update user preferences:", error.message);
      throw error;
    }
  }

  /**
   * Lấy translation
   */
  async getTranslation(key, language = 'en', fallback = true) {
    try {
      // Try to get from cache first
      const cacheKey = `translation:${language}:${key}`;
      let translation = await redis.get(cacheKey);
      
      if (translation) {
        return translation;
      }

      // Load translation from storage
      const translationData = await redis.hgetall(`translations:${language}`);
      translation = translationData[key];

      if (!translation && fallback && language !== 'en') {
        // Fallback to English
        const fallbackData = await redis.hgetall(`translations:en`);
        translation = fallbackData[key];
      }

      if (translation) {
        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, translation);
      }

      return translation || key;
    } catch (error) {
      console.error("Failed to get translation:", error.message);
      return key;
    }
  }

  /**
   * Lấy multiple translations
   */
  async getTranslations(keys, language = 'en') {
    try {
      const translations = {};
      
      for (const key of keys) {
        translations[key] = await this.getTranslation(key, language);
      }
      
      return translations;
    } catch (error) {
      console.error("Failed to get translations:", error.message);
      return keys.reduce((acc, key) => ({ ...acc, [key]: key }), {});
    }
  }

  /**
   * Tạo translation
   */
  async createTranslation(translationData) {
    try {
      const translation = {
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        key: translationData.key,
        language: translationData.language,
        value: translationData.value,
        context: translationData.context || '',
        category: translationData.category || 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: translationData.metadata || {}
      };

      await redis.hset(`translations:${translation.language}`, translation.key, translation.value);
      await redis.hset(`translation:${translation.id}`, translation);
      
      // Clear cache
      await redis.del(`translation:${translation.language}:${translation.key}`);
      
      this.emit('translation:created', translation);
      return translation;
    } catch (error) {
      console.error("Failed to create translation:", error.message);
      throw error;
    }
  }

  /**
   * Cập nhật translation
   */
  async updateTranslation(translationId, updates) {
    try {
      const translation = await redis.hgetall(`translation:${translationId}`);
      if (!translation || !translation.id) {
        throw new Error("Translation not found");
      }

      Object.assign(translation, updates);
      translation.updatedAt = new Date().toISOString();

      await redis.hset(`translation:${translationId}`, translation);
      await redis.hset(`translations:${translation.language}`, translation.key, translation.value);
      
      // Clear cache
      await redis.del(`translation:${translation.language}:${translation.key}`);
      
      this.emit('translation:updated', translation);
      return translation;
    } catch (error) {
      console.error("Failed to update translation:", error.message);
      throw error;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currencyCode = 'USD', language = 'en') {
    try {
      const currency = this.currencies.get(currencyCode);
      if (!currency) {
        return `${amount} ${currencyCode}`;
      }

      const formatter = new Intl.NumberFormat(language, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces
      });

      return formatter.format(amount);
    } catch (error) {
      console.error("Failed to format currency:", error.message);
      return `${amount} ${currencyCode}`;
    }
  }

  /**
   * Format date
   */
  formatDate(date, format = 'MM/DD/YYYY', timezone = 'UTC') {
    try {
      const dateObj = new Date(date);
      
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };

      if (format.includes('HH:mm') || format.includes('h:mm')) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }

      if (format.includes('h:mm')) {
        options.hour12 = true;
      }

      return dateObj.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error("Failed to format date:", error.message);
      return date;
    }
  }

  /**
   * Format number
   */
  formatNumber(number, language = 'en', options = {}) {
    try {
      const formatter = new Intl.NumberFormat(language, options);
      return formatter.format(number);
    } catch (error) {
      console.error("Failed to format number:", error.message);
      return number.toString();
    }
  }

  /**
   * Detect language from request
   */
  detectLanguage(req) {
    try {
      // Check query parameter
      if (req.query.lang) {
        return req.query.lang;
      }

      // Check header
      const acceptLanguage = req.headers['accept-language'];
      if (acceptLanguage) {
        const languages = acceptLanguage.split(',').map(lang => {
          const [code, quality] = lang.trim().split(';q=');
          return {
            code: code.split('-')[0],
            quality: quality ? parseFloat(quality) : 1.0
          };
        });

        // Sort by quality
        languages.sort((a, b) => b.quality - a.quality);

        // Find first supported language
        for (const lang of languages) {
          if (this.languages.has(lang.code)) {
            return lang.code;
          }
        }
      }

      // Default to English
      return 'en';
    } catch (error) {
      console.error("Failed to detect language:", error.message);
      return 'en';
    }
  }

  /**
   * Lấy tất cả languages
   */
  getLanguages() {
    return Array.from(this.languages.values());
  }

  /**
   * Lấy enabled languages
   */
  getEnabledLanguages() {
    return Array.from(this.languages.values()).filter(lang => lang.enabled);
  }

  /**
   * Lấy tất cả currencies
   */
  getCurrencies() {
    return Array.from(this.currencies.values());
  }

  /**
   * Lấy enabled currencies
   */
  getEnabledCurrencies() {
    return Array.from(this.currencies.values()).filter(currency => currency.enabled);
  }

  /**
   * Lấy tất cả timezones
   */
  getTimezones() {
    return Array.from(this.timezones.values());
  }

  /**
   * Lấy enabled timezones
   */
  getEnabledTimezones() {
    return Array.from(this.timezones.values()).filter(tz => tz.enabled);
  }

  /**
   * Tạo language mới
   */
  async createLanguage(languageData) {
    try {
      const language = {
        code: languageData.code,
        name: languageData.name,
        nativeName: languageData.nativeName,
        flag: languageData.flag,
        rtl: languageData.rtl || false,
        enabled: languageData.enabled !== false,
        isDefault: languageData.isDefault || false,
        createdAt: new Date().toISOString()
      };

      this.languages.set(language.code, language);
      await redis.hset(`language:${language.code}`, language);
      
      this.emit('language:created', language);
      return language;
    } catch (error) {
      console.error("Failed to create language:", error.message);
      throw error;
    }
  }

  /**
   * Tạo currency mới
   */
  async createCurrency(currencyData) {
    try {
      const currency = {
        code: currencyData.code,
        name: currencyData.name,
        symbol: currencyData.symbol,
        symbolPosition: currencyData.symbolPosition || 'before',
        decimalPlaces: currencyData.decimalPlaces || 2,
        enabled: currencyData.enabled !== false,
        isDefault: currencyData.isDefault || false,
        createdAt: new Date().toISOString()
      };

      this.currencies.set(currency.code, currency);
      await redis.hset(`currency:${currency.code}`, currency);
      
      this.emit('currency:created', currency);
      return currency;
    } catch (error) {
      console.error("Failed to create currency:", error.message);
      throw error;
    }
  }

  /**
   * Tạo timezone mới
   */
  async createTimezone(timezoneData) {
    try {
      const timezone = {
        code: timezoneData.code,
        name: timezoneData.name,
        offset: timezoneData.offset,
        enabled: timezoneData.enabled !== false,
        isDefault: timezoneData.isDefault || false,
        createdAt: new Date().toISOString()
      };

      this.timezones.set(timezone.code, timezone);
      await redis.hset(`timezone:${timezone.code}`, timezone);
      
      this.emit('timezone:created', timezone);
      return timezone;
    } catch (error) {
      console.error("Failed to create timezone:", error.message);
      throw error;
    }
  }

  /**
   * Lấy i18n statistics
   */
  async getI18nStats() {
    try {
      const stats = {
        totalLanguages: this.languages.size,
        enabledLanguages: this.getEnabledLanguages().length,
        totalCurrencies: this.currencies.size,
        enabledCurrencies: this.getEnabledCurrencies().length,
        totalTimezones: this.timezones.size,
        enabledTimezones: this.getEnabledTimezones().length,
        totalTranslations: 0,
        translationsByLanguage: {}
      };

      // Count translations
      const languageKeys = await redis.keys(`translations:*`);
      for (const key of languageKeys) {
        const language = key.split(':')[1];
        const translations = await redis.hgetall(key);
        const count = Object.keys(translations).length;
        
        stats.totalTranslations += count;
        stats.translationsByLanguage[language] = count;
      }

      return stats;
    } catch (error) {
      console.error("Failed to get i18n stats:", error.message);
      return {
        totalLanguages: 0,
        enabledLanguages: 0,
        totalCurrencies: 0,
        enabledCurrencies: 0,
        totalTimezones: 0,
        enabledTimezones: 0,
        totalTranslations: 0,
        translationsByLanguage: {}
      };
    }
  }

  /**
   * Bulk import translations
   */
  async bulkImportTranslations(translations) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const translation of translations) {
        try {
          await this.createTranslation(translation);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            translation,
            error: error.message
          });
        }
      }

      this.emit('translations:bulk:imported', results);
      return results;
    } catch (error) {
      console.error("Failed to bulk import translations:", error.message);
      throw error;
    }
  }

  /**
   * Export translations
   */
  async exportTranslations(language = null, format = 'json') {
    try {
      const translations = {};

      if (language) {
        const languageTranslations = await redis.hgetall(`translations:${language}`);
        translations[language] = languageTranslations;
      } else {
        const languageKeys = await redis.keys(`translations:*`);
        for (const key of languageKeys) {
          const lang = key.split(':')[1];
          const langTranslations = await redis.hgetall(key);
          translations[lang] = langTranslations;
        }
      }

      if (format === 'json') {
        return JSON.stringify(translations, null, 2);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csv = [];
        csv.push('Language,Key,Value');
        
        for (const [lang, langTranslations] of Object.entries(translations)) {
          for (const [key, value] of Object.entries(langTranslations)) {
            csv.push(`${lang},"${key}","${value}"`);
          }
        }
        
        return csv.join('\n');
      }

      return translations;
    } catch (error) {
      console.error("Failed to export translations:", error.message);
      throw error;
    }
  }
}

export const i18nService = new I18nService();
