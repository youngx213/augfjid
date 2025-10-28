import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient.js';
import { useToast } from './Toast.jsx';
import { useTheme } from './ThemeToggle.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

const I18nIntegration = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentCurrency, setCurrentCurrency] = useState('USD');
  const [currentTimezone, setCurrentTimezone] = useState('UTC');
  const [languages, setLanguages] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();
  const [theme] = useTheme();

  useEffect(() => {
    fetchI18nData();
    loadUserPreferences();
  }, []);

  const fetchI18nData = async () => {
    setLoading(true);
    try {
      const [languagesRes, currenciesRes, timezonesRes] = await Promise.all([
        api.get('/api/i18n/languages'),
        api.get('/api/i18n/currencies'),
        api.get('/api/i18n/timezones')
      ]);

      setLanguages(languagesRes.data);
      setCurrencies(currenciesRes.data);
      setTimezones(timezonesRes.data);
    } catch (err) {
      error('Lỗi tải dữ liệu', 'Không thể tải cài đặt i18n');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await api.get('/api/i18n/preferences');
      const prefs = response.data;
      setCurrentLanguage(prefs.language);
      setCurrentCurrency(prefs.currency);
      setCurrentTimezone(prefs.timezone);
    } catch (err) {
      console.error('Failed to load user preferences:', err);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/api/i18n/preferences', {
        language: currentLanguage,
        currency: currentCurrency,
        timezone: currentTimezone
      });
      success('Cài đặt đã lưu', 'Tùy chọn ngôn ngữ và khu vực đã được cập nhật');
    } catch (err) {
      error('Lỗi lưu cài đặt', 'Không thể lưu tùy chọn');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat(currentLanguage, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (err) {
      return `${amount} ${currency}`;
    }
  };

  const formatDate = (date, timezone) => {
    try {
      return new Date(date).toLocaleDateString(currentLanguage, {
        timeZone: timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return date;
    }
  };

  const formatNumber = (number) => {
    try {
      return new Intl.NumberFormat(currentLanguage).format(number);
    } catch (err) {
      return number.toString();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🌐 Cài đặt Ngôn ngữ & Khu vực
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Tùy chỉnh ngôn ngữ, tiền tệ và múi giờ cho ứng dụng
          </p>
        </div>

        <div className="space-y-8">
          {/* Language Selection */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              🗣️ Ngôn ngữ
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setCurrentLanguage(lang.code)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{lang.flag}</div>
                  <div className="font-medium">{lang.name}</div>
                  <div className="text-sm opacity-75">{lang.nativeName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              💰 Tiền tệ
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => setCurrentCurrency(currency.code)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentCurrency === currency.code
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-lg mb-1">{currency.symbol}</div>
                  <div className="font-medium">{currency.code}</div>
                  <div className="text-sm opacity-75">{currency.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Timezone Selection */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              🕐 Múi giờ
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {timezones.map((tz) => (
                <button
                  key={tz.code}
                  onClick={() => setCurrentTimezone(tz.code)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    currentTimezone === tz.code
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{tz.name}</div>
                  <div className="text-sm opacity-75">{tz.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              👀 Xem trước
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Số tiền
                </h3>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(1234.56, currentCurrency)}
                </p>
              </div>
              <div className="text-center">
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ngày giờ
                </h3>
                <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatDate(new Date(), currentTimezone)}
                </p>
              </div>
              <div className="text-center">
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Số
                </h3>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatNumber(1234567)}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default I18nIntegration;
