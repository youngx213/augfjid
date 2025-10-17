import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { api, getApiUrl } from "./lib/apiClient.js";
import { decodeJwtPayload } from "./lib/tokenUtils.js";
import TokenStatus from "./components/TokenStatus.jsx";
import AppShell from "./components/AppShell.jsx";
import toast from "react-hot-toast";

const API_URL = getApiUrl();

export default function MinecraftDashboard({ onLogout }) {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [presets, setPresets] = useState([]);
  const [overlay, setOverlay] = useState({});
  const [stats, setStats] = useState({ coins: 0, viewers: 0, winGoal: 100, timer: 0 });
  const [newPreset, setNewPreset] = useState({ giftName: "", coinsPerUnit: 1, commands: [""], soundFile: "default.mp3", imageUrl: "", enabled: true });
  const [editingPreset, setEditingPreset] = useState(null);
  const [overlayUrls, setOverlayUrls] = useState({ goalLikes: "", smartBar: "", topGifters: "" });
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== "game") {
      navigate(payload ? (payload.role === "admin" ? "/admin" : "/dashboard") : "/login");
      return;
    }
    setAuthorized(true);
    setUsername(payload.username || "");
    fetchData();
    connectSocket();
    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (socketRef.current && username) {
      socketRef.current.emit("join:game");
    }
  }, [username]);

  function connectSocket() {
    try {
      socketRef.current = io(API_URL, { auth: { token } });
      socketRef.current.on("connect", () => {
        console.log("Connected to socket");
      });
      socketRef.current.on("stats:update", (newStats) => {
        setStats(newStats);
      });
    } catch (err) {
      console.error("Socket connect error", err);
    }
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  async function fetchData() {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      
      // Fetch presets
      const { data: presetsData } = await api.get("/api/game/presets");
      if (presetsData.ok && Array.isArray(presetsData.presets)) {
        setPresets(presetsData.presets);
      }
      
      // Fetch overlay
      const { data: overlayData } = await api.get("/api/game/overlay");
      if (overlayData.ok) {
        const data = overlayData.overlay || {};
        setOverlay(data);
        setOverlayUrls(data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load data");
    }
  }

  async function addPreset() {
    if (!newPreset.giftName.trim()) {
      toast.error("Please enter a gift name");
      return;
    }

    try {
      const preset = {
        id: Date.now().toString(),
        ...newPreset,
        giftName: newPreset.giftName.trim(),
        commands: (newPreset.commands || []).map((cmd) => cmd.trim()).filter(Boolean)
      };

      const updatedPresets = [...presets, preset];
      await api.post("/api/game/presets", { presets: updatedPresets });
      setPresets(updatedPresets);
      setNewPreset({ giftName: "", coinsPerUnit: 1, commands: [""], soundFile: "default.mp3", imageUrl: "", enabled: true });
      toast.success("Preset added successfully");
    } catch (err) {
      console.error("Failed to add preset:", err);
      toast.error("Failed to add preset");
    }
  }

  async function updatePreset(preset) {
    try {
      const payload = {
        ...preset,
        commands: (preset.commands || []).map((cmd) => cmd.trim()).filter(Boolean)
      };
      await api.patch(`/api/game/presets/${preset.id}`, payload);
      const updatedPresets = presets.map((p) => (p.id === preset.id ? payload : p));
      setPresets(updatedPresets);
      setEditingPreset(null);
      toast.success("Preset updated successfully");
    } catch (err) {
      console.error("Failed to update preset:", err);
      toast.error("Failed to update preset");
    }
  }

  async function deletePreset(id) {
    try {
      await api.delete(`/api/game/presets/${id}`);
      const updatedPresets = presets.filter((p) => p.id !== id);
      setPresets(updatedPresets);
      toast.success("Preset deleted successfully");
    } catch (err) {
      console.error("Failed to delete preset:", err);
      toast.error("Failed to delete preset");
    }
  }

  async function updateOverlay() {
    try {
      await api.post("/api/game/overlay", overlayUrls);
      setOverlay(overlayUrls);
      toast.success("Overlay URLs updated successfully");
    } catch (err) {
      console.error("Failed to update overlay:", err);
      toast.error("Failed to update overlay");
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toast.success("URL copied to clipboard");
  }

  function testSound(soundFile) {
    // In a real implementation, this would play the sound
    toast.success(`Playing sound: ${soundFile}`);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  }

  if (!authorized) {
    return null;
  }

  return (
    <AppShell
      title="Minecraft Dashboard"
      subtitle={`User: ${username}`}
      actions={
        <div className="flex items-center gap-3">
          <TokenStatus />
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            TikTok Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-yellow-300 text-2xl font-bold">{stats.coins}</div>
          <div className="text-cyan-200/80 text-sm">Coins</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-green-300 text-2xl font-bold">{stats.viewers}</div>
          <div className="text-cyan-200/80 text-sm">Viewers</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-purple-300 text-2xl font-bold">{stats.winGoal}</div>
          <div className="text-cyan-200/80 text-sm">Win Goal</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-orange-300 text-2xl font-bold">{stats.timer}s</div>
          <div className="text-cyan-200/80 text-sm">Timer</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-bold text-white mb-4">Bedrock Box Presets</h2>

          <div className="bg-black/30 border border-white/10 p-4 rounded-lg mb-4">
            <h3 className="text-white font-semibold mb-3">Add New Preset</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newPreset.giftName}
                onChange={(e) => setNewPreset({ ...newPreset, giftName: e.target.value })}
                placeholder="Gift Name (e.g., Rose)"
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
              />
              <input
                type="number"
                value={newPreset.coinsPerUnit}
                onChange={(e) => setNewPreset({ ...newPreset, coinsPerUnit: parseInt(e.target.value, 10) || 1 })}
                placeholder="Coins per unit"
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
              />
              <input
                value={newPreset.soundFile}
                onChange={(e) => setNewPreset({ ...newPreset, soundFile: e.target.value })}
                placeholder="Sound File"
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
              />
              <input
                value={newPreset.imageUrl}
                onChange={(e) => setNewPreset({ ...newPreset, imageUrl: e.target.value })}
                placeholder="Image URL"
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
              />
              <input
                value={(newPreset.commands && newPreset.commands.join(";")) || ""}
                onChange={(e) => setNewPreset({ ...newPreset, commands: e.target.value.split(";").map((cmd) => cmd.trim()).filter(Boolean) })}
                placeholder="Commands (separated by ;)"
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
              />
            </div>
            <button
              onClick={addPreset}
              className="mt-3 px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition"
            >
              Add Preset
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {presets.map((preset) => (
              <div key={preset.id} className="bg-black/30 border border-white/10 p-4 rounded-lg">
                {editingPreset?.id === preset.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editingPreset.giftName}
                        onChange={(e) => setEditingPreset({ ...editingPreset, giftName: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        type="number"
                        value={editingPreset.coinsPerUnit}
                        onChange={(e) => setEditingPreset({ ...editingPreset, coinsPerUnit: parseInt(e.target.value, 10) || 1 })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={editingPreset.soundFile}
                        onChange={(e) => setEditingPreset({ ...editingPreset, soundFile: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={editingPreset.imageUrl}
                        onChange={(e) => setEditingPreset({ ...editingPreset, imageUrl: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={(editingPreset.commands || []).join(";")}
                        onChange={(e) => setEditingPreset({ ...editingPreset, commands: e.target.value.split(";").map((cmd) => cmd.trim()).filter(Boolean) })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        placeholder="Commands separated by ;"
                      />
                      <label className="flex items-center gap-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={editingPreset.enabled !== false}
                          onChange={(e) => setEditingPreset({ ...editingPreset, enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePreset(editingPreset)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPreset(null)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-semibold">{preset.giftName}</div>
                    <div className="text-cyan-200/80 text-sm space-y-1">
                      <div>Coins/unit: {preset.coinsPerUnit || 1}</div>
                      {preset.soundFile && <div>Sound: {preset.soundFile}</div>}
                      {preset.imageUrl && <div>Image: {preset.imageUrl}</div>}
                      {Array.isArray(preset.commands) && preset.commands.length > 0 && (
                        <div>Commands: {preset.commands.join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <button
                        onClick={() => preset.soundFile && testSound(preset.soundFile)}
                        className="px-2 py-1 bg-amber-500/80 text-black rounded text-xs hover:bg-amber-400 disabled:opacity-50"
                        disabled={!preset.soundFile}
                      >
                        ▶️
                      </button>
                    <button
                      onClick={() =>
                        setEditingPreset({
                          ...preset,
                          commands: Array.isArray(preset.commands) ? [...preset.commands] : []
                        })
                      }
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  </div>
                )}
              </div>
            ))}
            {presets.length === 0 && (
              <div className="text-center text-cyan-200/70 py-8">No presets configured. Add your first preset above.</div>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-bold text-white mb-4">Overlay URLs</h2>

          <div className="space-y-4">
            {/* Goal Likes Bar */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Goal Likes Bar</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.goalLikes || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, goalLikes: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../goal-likes"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.goalLikes)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Smart Bar */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Smart Bar</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.smartBar || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, smartBar: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../smart-bar"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.smartBar)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Top Gifters */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Top Gifters</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.topGifters || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, topGifters: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../top-gifters"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.topGifters)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={updateOverlay}
            className="mt-4 w-full px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition"
          >
            Save Overlay URLs
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
        <h2 className="text-xl font-bold text-white mb-4">Plugin Integration</h2>
        <div className="text-cyan-200 space-y-2">
          <p><strong>API Endpoint:</strong> <code className="bg-black/30 px-2 py-1 rounded">{API_URL}/api/plugin/config/{username}</code></p>
          <p><strong>Socket.IO:</strong> Connect to <code className="bg-black/30 px-2 py-1 rounded">{API_URL}</code> và join room <code className="bg-black/30 px-2 py-1 rounded">plugin:{username}</code></p>
          <p><strong>Events:</strong> Nghe event <code className="bg-black/30 px-2 py-1 rounded">plugin:trigger</code></p>
        </div>
      </div>
    </AppShell>
  );
}