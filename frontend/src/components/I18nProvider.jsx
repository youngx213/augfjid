import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Internationalization (i18n) Provider và Components
 */

// I18n Context
const I18nContext = createContext();

// Default translations
const defaultTranslations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.retry': 'Retry',
    'common.more': 'More',
    'common.less': 'Less',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.accounts': 'Accounts',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',
    
    // Authentication
    'auth.login.title': 'Login',
    'auth.login.subtitle': 'Sign in to your account',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.remember': 'Remember me',
    'auth.login.forgot': 'Forgot password?',
    'auth.login.button': 'Sign In',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signUp': 'Sign up',
    
    'auth.register.title': 'Register',
    'auth.register.subtitle': 'Create your account',
    'auth.register.username': 'Username',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.confirmPassword': 'Confirm Password',
    'auth.register.agree': 'I agree to the Terms and Conditions',
    'auth.register.button': 'Create Account',
    'auth.register.haveAccount': 'Already have an account?',
    'auth.register.signIn': 'Sign in',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back!',
    'dashboard.overview': 'Overview',
    'dashboard.stats': 'Statistics',
    'dashboard.recent': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    
    // Accounts
    'accounts.title': 'TikTok Accounts',
    'accounts.add': 'Add Account',
    'accounts.status': 'Status',
    'accounts.followers': 'Followers',
    'accounts.following': 'Following',
    'accounts.videos': 'Videos',
    'accounts.likes': 'Likes',
    'accounts.start': 'Start Bot',
    'accounts.stop': 'Stop Bot',
    'accounts.delete': 'Delete Account',
    
    // Analytics
    'analytics.title': 'Analytics',
    'analytics.overview': 'Overview',
    'analytics.gifts': 'Gifts',
    'analytics.revenue': 'Revenue',
    'analytics.viewers': 'Viewers',
    'analytics.engagement': 'Engagement',
    'analytics.timeline': 'Timeline',
    'analytics.export': 'Export Data',
    
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.account': 'Account',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.security': 'Security',
    'settings.language': 'Language',
    'settings.currency': 'Currency',
    'settings.timezone': 'Timezone',
    'settings.theme': 'Theme',
    
    // Business
    'business.title': 'Business',
    'business.subscription': 'Subscription',
    'business.payment': 'Payment',
    'business.invoice': 'Invoice',
    'business.support': 'Support',
    'business.affiliate': 'Affiliate',
    
    // Errors
    'error.network': 'Network error. Please check your connection.',
    'error.unauthorized': 'You are not authorized to perform this action.',
    'error.forbidden': 'Access denied.',
    'error.notFound': 'The requested resource was not found.',
    'error.server': 'Server error. Please try again later.',
    'error.validation': 'Please check your input and try again.',
    'error.timeout': 'Request timeout. Please try again.',
    
    // Success messages
    'success.saved': 'Changes saved successfully!',
    'success.deleted': 'Item deleted successfully!',
    'success.created': 'Item created successfully!',
    'success.updated': 'Item updated successfully!',
    'success.sent': 'Message sent successfully!',
    'success.uploaded': 'File uploaded successfully!',
    
    // Form validation
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.password': 'Password must be at least 8 characters',
    'validation.confirmPassword': 'Passwords do not match',
    'validation.minLength': 'Minimum length is {min} characters',
    'validation.maxLength': 'Maximum length is {max} characters',
    'validation.numeric': 'Please enter a valid number',
    'validation.url': 'Please enter a valid URL',
    'validation.phone': 'Please enter a valid phone number',
  },
  
  vi: {
    // Common
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
    'common.cancel': 'Hủy',
    'common.save': 'Lưu',
    'common.delete': 'Xóa',
    'common.edit': 'Chỉnh sửa',
    'common.add': 'Thêm',
    'common.search': 'Tìm kiếm',
    'common.filter': 'Lọc',
    'common.sort': 'Sắp xếp',
    'common.refresh': 'Làm mới',
    'common.back': 'Quay lại',
    'common.next': 'Tiếp theo',
    'common.previous': 'Trước đó',
    'common.close': 'Đóng',
    'common.confirm': 'Xác nhận',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.ok': 'OK',
    'common.retry': 'Thử lại',
    'common.more': 'Thêm',
    'common.less': 'Ít hơn',
    
    // Navigation
    'nav.dashboard': 'Bảng điều khiển',
    'nav.accounts': 'Tài khoản',
    'nav.analytics': 'Phân tích',
    'nav.settings': 'Cài đặt',
    'nav.profile': 'Hồ sơ',
    'nav.logout': 'Đăng xuất',
    'nav.login': 'Đăng nhập',
    'nav.register': 'Đăng ký',
    
    // Authentication
    'auth.login.title': 'Đăng nhập',
    'auth.login.subtitle': 'Đăng nhập vào tài khoản của bạn',
    'auth.login.email': 'Email',
    'auth.login.password': 'Mật khẩu',
    'auth.login.remember': 'Ghi nhớ đăng nhập',
    'auth.login.forgot': 'Quên mật khẩu?',
    'auth.login.button': 'Đăng nhập',
    'auth.login.noAccount': 'Chưa có tài khoản?',
    'auth.login.signUp': 'Đăng ký',
    
    'auth.register.title': 'Đăng ký',
    'auth.register.subtitle': 'Tạo tài khoản của bạn',
    'auth.register.username': 'Tên người dùng',
    'auth.register.email': 'Email',
    'auth.register.password': 'Mật khẩu',
    'auth.register.confirmPassword': 'Xác nhận mật khẩu',
    'auth.register.agree': 'Tôi đồng ý với Điều khoản và Điều kiện',
    'auth.register.button': 'Tạo tài khoản',
    'auth.register.haveAccount': 'Đã có tài khoản?',
    'auth.register.signIn': 'Đăng nhập',
    
    // Dashboard
    'dashboard.title': 'Bảng điều khiển',
    'dashboard.welcome': 'Chào mừng trở lại!',
    'dashboard.overview': 'Tổng quan',
    'dashboard.stats': 'Thống kê',
    'dashboard.recent': 'Hoạt động gần đây',
    'dashboard.quickActions': 'Thao tác nhanh',
    
    // Accounts
    'accounts.title': 'Tài khoản TikTok',
    'accounts.add': 'Thêm tài khoản',
    'accounts.status': 'Trạng thái',
    'accounts.followers': 'Người theo dõi',
    'accounts.following': 'Đang theo dõi',
    'accounts.videos': 'Video',
    'accounts.likes': 'Lượt thích',
    'accounts.start': 'Bắt đầu Bot',
    'accounts.stop': 'Dừng Bot',
    'accounts.delete': 'Xóa tài khoản',
    
    // Analytics
    'analytics.title': 'Phân tích',
    'analytics.overview': 'Tổng quan',
    'analytics.gifts': 'Quà tặng',
    'analytics.revenue': 'Doanh thu',
    'analytics.viewers': 'Người xem',
    'analytics.engagement': 'Tương tác',
    'analytics.timeline': 'Timeline',
    'analytics.export': 'Xuất dữ liệu',
    
    // Settings
    'settings.title': 'Cài đặt',
    'settings.general': 'Chung',
    'settings.account': 'Tài khoản',
    'settings.notifications': 'Thông báo',
    'settings.privacy': 'Quyền riêng tư',
    'settings.security': 'Bảo mật',
    'settings.language': 'Ngôn ngữ',
    'settings.currency': 'Tiền tệ',
    'settings.timezone': 'Múi giờ',
    'settings.theme': 'Chủ đề',
    
    // Business
    'business.title': 'Kinh doanh',
    'business.subscription': 'Đăng ký',
    'business.payment': 'Thanh toán',
    'business.invoice': 'Hóa đơn',
    'business.support': 'Hỗ trợ',
    'business.affiliate': 'Tiếp thị liên kết',
    
    // Errors
    'error.network': 'Lỗi mạng. Vui lòng kiểm tra kết nối.',
    'error.unauthorized': 'Bạn không có quyền thực hiện hành động này.',
    'error.forbidden': 'Truy cập bị từ chối.',
    'error.notFound': 'Không tìm thấy tài nguyên được yêu cầu.',
    'error.server': 'Lỗi máy chủ. Vui lòng thử lại sau.',
    'error.validation': 'Vui lòng kiểm tra thông tin và thử lại.',
    'error.timeout': 'Hết thời gian chờ. Vui lòng thử lại.',
    
    // Success messages
    'success.saved': 'Lưu thay đổi thành công!',
    'success.deleted': 'Xóa thành công!',
    'success.created': 'Tạo thành công!',
    'success.updated': 'Cập nhật thành công!',
    'success.sent': 'Gửi tin nhắn thành công!',
    'success.uploaded': 'Tải lên file thành công!',
    
    // Form validation
    'validation.required': 'Trường này là bắt buộc',
    'validation.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'validation.password': 'Mật khẩu phải có ít nhất 8 ký tự',
    'validation.confirmPassword': 'Mật khẩu không khớp',
    'validation.minLength': 'Độ dài tối thiểu là {min} ký tự',
    'validation.maxLength': 'Độ dài tối đa là {max} ký tự',
    'validation.numeric': 'Vui lòng nhập số hợp lệ',
    'validation.url': 'Vui lòng nhập URL hợp lệ',
    'validation.phone': 'Vui lòng nhập số điện thoại hợp lệ',
  }
};

// I18n Provider
export const I18nProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState(defaultTranslations);
  const [isLoading, setIsLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  // Load user preferences from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    const savedPreferences = localStorage.getItem('userPreferences');
    
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        setUserPreferences(prefs);
        setCurrentLanguage(prefs.language);
      } catch (error) {
        console.error('Failed to parse user preferences:', error);
      }
    }
  }, []);

  // Load translations from API
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setIsLoading(true);
        // In a real app, you would fetch from your API
        // const response = await fetch(`/api/i18n/translations/${currentLanguage}`);
        // const data = await response.json();
        // setTranslations(prev => ({ ...prev, [currentLanguage]: data }));
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!translations[currentLanguage]) {
      loadTranslations();
    }
  }, [currentLanguage]);

  const changeLanguage = async (languageCode) => {
    if (languageCode === currentLanguage) return;
    
    setIsLoading(true);
    
    // Add transition delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setCurrentLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
    
    // Update user preferences
    const newPreferences = { ...userPreferences, language: languageCode };
    setUserPreferences(newPreferences);
    localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    
    setIsLoading(false);
  };

  const updatePreferences = (newPreferences) => {
    const updated = { ...userPreferences, ...newPreferences };
    setUserPreferences(updated);
    localStorage.setItem('userPreferences', JSON.stringify(updated));
  };

  const t = (key, params = {}) => {
    let translation = translations[currentLanguage]?.[key] || 
                     translations['en']?.[key] || 
                     key;

    // Replace parameters
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{${param}}`, value);
    });

    return translation;
  };

  const formatCurrency = (amount, currency = userPreferences.currency) => {
    try {
      return new Intl.NumberFormat(currentLanguage, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      return `${amount} ${currency}`;
    }
  };

  const formatDate = (date, options = {}) => {
    try {
      const defaultOptions = {
        timeZone: userPreferences.timezone,
        ...options
      };
      
      return new Date(date).toLocaleDateString(currentLanguage, defaultOptions);
    } catch (error) {
      return date;
    }
  };

  const formatNumber = (number, options = {}) => {
    try {
      return new Intl.NumberFormat(currentLanguage, options).format(number);
    } catch (error) {
      return number.toString();
    }
  };

  const value = {
    currentLanguage,
    translations,
    userPreferences,
    isLoading,
    changeLanguage,
    updatePreferences,
    t,
    formatCurrency,
    formatDate,
    formatNumber
  };

  return (
    <I18nContext.Provider value={value}>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-white text-xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              🌐
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </I18nContext.Provider>
  );
};

// I18n Hook
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Language Selector Component
export const LanguageSelector = ({ className = '' }) => {
  const { currentLanguage, changeLanguage, isLoading } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-opacity-80 transition-colors disabled:opacity-50"
      >
        <span className="text-lg">{currentLang?.flag || '🌐'}</span>
        <span className="text-sm text-text">{currentLang?.name || 'Language'}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    changeLanguage(language.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-2 ${
                    currentLanguage === language.code
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-opacity-10 hover:bg-primary'
                  }`}
                >
                  <span>{language.flag}</span>
                  <span>{language.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Currency Selector Component
export const CurrencySelector = ({ className = '' }) => {
  const { userPreferences, updatePreferences } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' }
  ];

  const currentCurrency = currencies.find(curr => curr.code === userPreferences.currency);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-opacity-80 transition-colors"
      >
        <span className="text-sm font-medium">{currentCurrency?.symbol || '$'}</span>
        <span className="text-sm text-text">{currentCurrency?.code || 'USD'}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    updatePreferences({ currency: currency.code });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-2 ${
                    userPreferences.currency === currency.code
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-opacity-10 hover:bg-primary'
                  }`}
                >
                  <span className="font-medium">{currency.symbol}</span>
                  <span>{currency.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Timezone Selector Component
export const TimezoneSelector = ({ className = '' }) => {
  const { userPreferences, updatePreferences } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const timezones = [
    { code: 'UTC', name: 'UTC (Coordinated Universal Time)' },
    { code: 'Asia/Ho_Chi_Minh', name: 'Vietnam Time (GMT+7)' },
    { code: 'Asia/Shanghai', name: 'China Standard Time (GMT+8)' },
    { code: 'Asia/Tokyo', name: 'Japan Standard Time (GMT+9)' },
    { code: 'Asia/Seoul', name: 'Korea Standard Time (GMT+9)' },
    { code: 'Asia/Bangkok', name: 'Indochina Time (GMT+7)' },
    { code: 'America/New_York', name: 'Eastern Time (GMT-5)' },
    { code: 'Europe/London', name: 'Greenwich Mean Time (GMT+0)' },
    { code: 'Europe/Paris', name: 'Central European Time (GMT+1)' }
  ];

  const currentTimezone = timezones.find(tz => tz.code === userPreferences.timezone);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-opacity-80 transition-colors"
      >
        <span className="text-sm text-text">{currentTimezone?.name || 'UTC'}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              {timezones.map((timezone) => (
                <button
                  key={timezone.code}
                  onClick={() => {
                    updatePreferences({ timezone: timezone.code });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    userPreferences.timezone === timezone.code
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-opacity-10 hover:bg-primary'
                  }`}
                >
                  {timezone.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Translation Component
export const T = ({ children, params = {} }) => {
  const { t } = useI18n();
  return t(children, params);
};

// Formatted Components
export const FormattedCurrency = ({ amount, currency, ...props }) => {
  const { formatCurrency, userPreferences } = useI18n();
  return formatCurrency(amount, currency || userPreferences.currency, props);
};

export const FormattedDate = ({ date, options = {}, ...props }) => {
  const { formatDate, userPreferences } = useI18n();
  return formatDate(date, { timeZone: userPreferences.timezone, ...options }, props);
};

export const FormattedNumber = ({ number, options = {}, ...props }) => {
  const { formatNumber } = useI18n();
  return formatNumber(number, options, props);
};

export default {
  I18nProvider,
  useI18n,
  LanguageSelector,
  CurrencySelector,
  TimezoneSelector,
  T,
  FormattedCurrency,
  FormattedDate,
  FormattedNumber
};
