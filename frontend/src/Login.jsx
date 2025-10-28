import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from './lib/apiClient.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useToast } from './components/Toast.jsx';
import { FormCard, FormField, FormButton, FormError, FormIcons } from './components/FormComponents.jsx';
import AppShell from './components/AppShell.jsx';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useAuthStore(s => s.setToken);
  const { success, error: showError } = useToast();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      if (data.ok) {
        setToken(data.token);
        onLogin?.(data);
        success('Đăng nhập thành công', 'Chào mừng bạn quay trở lại!');
        
        // Navigate based on role
        setTimeout(() => {
          if (data.role === 'admin') navigate('/admin');
          else if (data.role === 'game') navigate('/minecraft');
          else navigate('/dashboard');
        }, 1000);
      } else {
        const errorMsg = data.error || 'Đăng nhập thất bại';
        setError(errorMsg);
        showError('Lỗi đăng nhập', errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Lỗi kết nối";
      setError(errorMsg);
      showError('Lỗi kết nối', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay trở lại"
      actions={
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="px-4 py-2 text-cyan-200 hover:text-white transition"
        >
          ← Về trang chủ
        </motion.button>
      }
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <FormCard 
          title="Đăng nhập" 
          subtitle="Nhập thông tin để truy cập tài khoản của bạn"
          className="w-full max-w-md"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <FormField
              label="Tên đăng nhập"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              icon={FormIcons.user}
              error={error && error.includes('username') ? error : null}
            />

            <FormField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              icon={FormIcons.lock}
              error={error && error.includes('password') ? error : null}
            />

            <FormError error={error} />

            <FormButton
              type="submit"
              loading={loading}
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </FormButton>

            <div className="text-center">
              <p className="text-cyan-200/80 text-sm">
                Chưa có tài khoản?{' '}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/register')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                >
                  Đăng ký ngay
                </motion.button>
              </p>
            </div>
          </form>
        </FormCard>
      </div>
    </AppShell>
  );
}