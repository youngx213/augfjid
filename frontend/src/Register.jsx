import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "./lib/apiClient.js";
import { useToast } from "./components/Toast.jsx";
import { FormCard, FormField, FormButton, FormError, FormSuccess, FormIcons } from "./components/FormComponents.jsx";
import AppShell from "./components/AppShell.jsx";

export default function Register({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [role] = useState("bot");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const body = { username, password };
      if (key.trim()) body.key = key.trim();
      if (role) body.role = role;
      
      const { data } = await api.post(`/api/auth/register`, body);

      if (data && data.ok) {
        // if backend returns token, store and use it (behave like login)
        if (data.token) {
          localStorage.setItem("token", data.token);
          if (onLogin) onLogin(data);
          showSuccess('Đăng ký thành công', 'Chào mừng bạn đến với hệ thống!');
          
          // navigate according to role if provided
          setTimeout(() => {
            const r = data.role || (data.user && data.user.role);
            if (r === "admin") navigate("/admin");
            else if (r === "game") navigate("/minecraft");
            else navigate("/dashboard");
          }, 1000);
          return;
        }

        // no token: show success and redirect to login
        setSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
        showSuccess('Đăng ký thành công', 'Vui lòng đăng nhập để tiếp tục');
        
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        const errorMsg = data.error || "Đăng ký thất bại";
        setError(errorMsg);
        showError('Lỗi đăng ký', errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Lỗi kết nối tới server";
      setError(errorMsg);
      showError('Lỗi kết nối', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Đăng ký"
      subtitle="Tạo tài khoản mới để bắt đầu"
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
          title="Đăng ký tài khoản" 
          subtitle="Điền thông tin để tạo tài khoản mới"
          className="w-full max-w-md"
        >
          <form onSubmit={handleRegister} className="space-y-6">
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
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              required
              icon={FormIcons.lock}
              error={error && error.includes('password') ? error : null}
            />

            <FormField
              label="Mã đăng ký"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Nhập mã đăng ký (tùy chọn)"
              icon={FormIcons.key}
              error={error && error.includes('key') ? error : null}
            />
            
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-cyan-200/80 text-sm">
                <strong>Lưu ý:</strong> Mã đăng ký là bắt buộc để tạo tài khoản. 
                Không có mã đăng ký hợp lệ sẽ không thể đăng ký.
              </p>
            </div>

            <FormSuccess message={success} />
            <FormError error={error} />

            <FormButton
              type="submit"
              loading={loading}
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </FormButton>

            <div className="text-center">
              <p className="text-cyan-200/80 text-sm">
                Đã có tài khoản?{' '}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/login')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                >
                  Đăng nhập ngay
                </motion.button>
              </p>
            </div>
          </form>
        </FormCard>
      </div>
    </AppShell>
  );
}