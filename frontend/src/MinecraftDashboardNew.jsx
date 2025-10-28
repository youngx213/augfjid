import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { api, getApiUrl } from "./lib/apiClient.js";
import { decodeJwtPayload } from "./lib/tokenUtils.js";
import TokenStatus from "./components/TokenStatus.jsx";
import AppShell from "./components/AppShell.jsx";
import { useToast } from "./components/Toast.jsx";
import { useTheme } from "./components/ThemeToggle.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { 
  StatsCard, 
  PresetCard, 
  PresetForm, 
  GiftSelector,
  StatsIcons 
} from "./components/MinecraftComponents.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";

const API_URL = getApiUrl();

export default function MinecraftDashboard({ onLogout }) {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [presets, setPresets] = useState([]);
  const [overlay, setOverlay] = useState({});
  const [stats, setStats] = useState({ coins: 0, viewers: 0, winGoal: 100, timer: 0 });
  const [newPreset, setNewPreset] = useState({ 
    giftName: "", 
    coinsPerUnit: 1, 
    commands: [""], 
    soundFile: "default.mp3", 
    imageUrl: "", 
    enabled: true 
  });
  const [editingPreset, setEditingPreset] = useState(null);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [pluginKey, setPluginKey] = useState("");
  const [loading, setLoading] = useState(true);
  
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { success, error, info } = useToast();
  const [theme, setTheme] = useTheme();

  // TikTok Gifts có sẵn (rút gọn)
  const availableGifts = [
    { name: "Rose", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" },
    { name: "Heart", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/dd300fd35a757d751301fba862a258f1~tplv-obj.webp" },
    { name: "Thumbs Up", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/570a663e27bdc460e05556fd1596771a~tplv-obj.webp" },
    { name: "Finger Heart", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.webp" },
    { name: "Phoenix Flower", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/90a405cf917cce27a8261739ecd84b89.png~tplv-obj.webp" },
    { name: "Rosa", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eb77ead5c3abb6da6034d3cf6cfeb438~tplv-obj.webp" },
    { name: "Little Crown", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/cf3db11b94a975417043b53401d0afe1~tplv-obj.webp" },
    { name: "Love Painting", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/de6f01cb2a0deb2da24cb5d1ecf9a23b.png~tplv-obj.webp" }
  ];

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    
    const payload = decodeJwtPayload(token);
    if (!payload) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }
    
    if (payload.role !== "game") {
      navigate("/dashboard");
      return;
    }
    
    setUsername(payload.username);
    setAuthorized(true);
    initializeDashboard();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, navigate]);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPresets(),
        fetchOverlay(),
        fetchStats(),
        generatePluginKey()
      ]);
      connectSocket();
      success("Dashboard", "Đã kết nối thành công!");
    } catch (err) {
      error("Lỗi khởi tạo", "Không thể tải dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.get("/api/game/presets");
      if (data?.ok && Array.isArray(data.presets)) {
        setPresets(data.presets);
      }
    } catch (err) {
      console.error("Error fetching presets:", err);
    }
  };

  const fetchOverlay = async () => {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.get("/api/game/overlay");
      if (data?.ok && data.overlay) {
        setOverlay(data.overlay);
      }
    } catch (err) {
      console.error("Error fetching overlay:", err);
    }
  };

  const fetchStats = async () => {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.get("/api/game/stats");
      if (data?.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const generatePluginKey = async () => {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.post("/api/game/plugin-key");
      if (data?.ok && data.key) {
        setPluginKey(data.key);
      }
    } catch (err) {
      console.error("Error generating plugin key:", err);
    }
  };

  const connectSocket = () => {
    try {
      socketRef.current = io(API_URL, { auth: { token } });
      socketRef.current.on("connect", () => {
        info("WebSocket", "Đã kết nối real-time");
      });
      
      socketRef.current.on("overlay:update", (data) => {
        if (data.type === "gift") {
          setStats(prev => ({
            ...prev,
            coins: (prev.coins || 0) + (data.coinsAdded || 0)
          }));
        }
      });
    } catch (err) {
      console.error("Socket connection error:", err);
    }
  };

  const handleSavePreset = async (presetData) => {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.post("/api/game/presets", {
        presets: [...presets, { ...presetData, id: Date.now().toString() }]
      });
      
      if (data?.ok) {
        await fetchPresets();
        setShowPresetForm(false);
        setEditingPreset(null);
        success("Thành công", "Đã lưu preset");
      }
    } catch (err) {
      error("Lỗi", "Không thể lưu preset");
    }
  };

  const handleEditPreset = (preset) => {
    setEditingPreset(preset);
    setShowPresetForm(true);
  };

  const handleDeletePreset = async (presetId) => {
    try {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.post("/api/game/presets", { presets: updatedPresets });
      
      if (data?.ok) {
        setPresets(updatedPresets);
        success("Thành công", "Đã xóa preset");
      }
    } catch (err) {
      error("Lỗi", "Không thể xóa preset");
    }
  };

  const handleTogglePreset = async (presetId) => {
    try {
      const updatedPresets = presets.map(p => 
        p.id === presetId ? { ...p, enabled: !p.enabled } : p
      );
      api.defaults.headers.Authorization = `Bearer ${token}`;
      const { data } = await api.post("/api/game/presets", { presets: updatedPresets });
      
      if (data?.ok) {
        setPresets(updatedPresets);
      }
    } catch (err) {
      error("Lỗi", "Không thể cập nhật preset");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  };

  if (loading) {
    return (
      <AppShell
        title="Minecraft Dashboard"
        subtitle="Đang tải..."
        actions={
          <>
            <ThemeToggle theme={theme} onThemeChange={setTheme} />
            <TokenStatus />
            <button onClick={handleLogout} className="px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg transition">
              Đăng xuất
            </button>
          </>
        }
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="xl" text="Đang khởi tạo dashboard..." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Minecraft Dashboard"
      subtitle={`Chào mừng ${username} - Quản lý game integration`}
      actions={
        <>
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
          <TokenStatus />
          <button onClick={handleLogout} className="px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg transition">
            Đăng xuất
          </button>
        </>
      }
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Coins"
          value={stats.coins || 0}
          icon={StatsIcons.coins}
          color="emerald"
        />
        <StatsCard
          title="Viewers"
          value={stats.viewers || 0}
          icon={StatsIcons.viewers}
          color="cyan"
        />
        <StatsCard
          title="Win Goal"
          value={stats.winGoal || 100}
          icon={StatsIcons.goal}
          color="amber"
        />
        <StatsCard
          title="Timer"
          value={`${Math.floor((stats.timer || 0) / 60)}:${((stats.timer || 0) % 60).toString().padStart(2, '0')}`}
          icon={StatsIcons.timer}
          color="fuchsia"
        />
      </div>

      {/* Plugin Key */}
      <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Plugin Key</h3>
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={pluginKey}
            readOnly
            className="flex-1 px-4 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white font-mono text-sm"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(pluginKey);
              success("Đã copy", "Plugin key đã được sao chép");
            }}
            className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition"
          >
            Copy
          </button>
        </div>
        <p className="text-cyan-200/80 text-sm mt-2">
          Sử dụng key này để kết nối Minecraft plugin với hệ thống
        </p>
      </div>

      {/* Presets Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Gift Presets</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPresetForm(true)}
              className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition font-semibold"
            >
              + Tạo Preset
            </motion.button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onEdit={handleEditPreset}
                  onDelete={handleDeletePreset}
                  onToggle={handleTogglePreset}
                />
              ))}
            </AnimatePresence>
            
            {presets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎁</div>
                <h4 className="text-lg font-semibold text-white mb-2">Chưa có preset nào</h4>
                <p className="text-cyan-200/80 mb-4">Tạo preset đầu tiên để bắt đầu</p>
                <button
                  onClick={() => setShowPresetForm(true)}
                  className="px-6 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition font-semibold"
                >
                  Tạo Preset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Overlay URLs */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Overlay URLs</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Goal Likes
                </label>
                <input
                  type="url"
                  value={overlay.goalLikes || ""}
                  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Smart Bar
                </label>
                <input
                  type="url"
                  value={overlay.smartBar || ""}
                  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Top Gifters
                </label>
                <input
                  type="url"
                  value={overlay.topGifters || ""}
                  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Form Modal */}
      <AnimatePresence>
        {showPresetForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowPresetForm(false);
              setEditingPreset(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <PresetForm
                preset={editingPreset || newPreset}
                onSave={handleSavePreset}
                onCancel={() => {
                  setShowPresetForm(false);
                  setEditingPreset(null);
                }}
                gifts={availableGifts}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
