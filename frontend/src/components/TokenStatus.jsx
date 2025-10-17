import React, { useState, useEffect } from 'react';
import { formatTimeUntilExpiry, isTokenExpiringSoon } from '../lib/tokenUtils.js';
import toast from 'react-hot-toast';

export default function TokenStatus() {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setTimeLeft('');
        setIsExpiringSoon(false);
        return;
      }

      const timeUntilExpiry = formatTimeUntilExpiry(token);
      setTimeLeft(timeUntilExpiry);
      
      const expiringSoon = isTokenExpiringSoon(token, 30); // 30 phút trước khi hết hạn
      setIsExpiringSoon(expiringSoon);

      // Cảnh báo khi còn 30 phút
      if (expiringSoon && timeUntilExpiry !== 'Expired') {
        toast.error(`Token sẽ hết hạn trong ${timeUntilExpiry}! Vui lòng đăng nhập lại.`, {
          duration: 5000,
          id: 'token-expiry-warning' // Tránh spam toast
        });
      }
    };

    // Cập nhật ngay lập tức
    updateTimeLeft();

    // Cập nhật mỗi phút
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className={`text-xs px-2 py-1 rounded ${
      isExpiringSoon 
        ? 'bg-red-100 text-red-700 border border-red-300' 
        : 'bg-green-100 text-green-700 border border-green-300'
    }`}>
      Token: {timeLeft}
    </div>
  );
}
