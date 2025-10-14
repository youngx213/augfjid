import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export default function MinecraftDashboard({ onLogout }) {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [gifts, setGifts] = useState([]);
  const [newGiftName, setNewGiftName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== "minecraft") {
      navigate(payload ? (payload.role === "admin" ? "/admin" : "/dashboard") : "/login");
      return;
    }
    setAuthorized(true);
    setUsername(payload.username || "");
    fetchGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchGifts() {
    try {
      const res = await fetch(`${API_URL}/api/user/gifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // backend may not implement; fallback to localStorage
        const local = localStorage.getItem("mc_gifts");
        setGifts(local ? JSON.parse(local) : []);
        return;
      }
      const data = await res.json();
      setGifts(Array.isArray(data) ? data : []);
    } catch (err) {
      const local = localStorage.getItem("mc_gifts");
      setGifts(local ? JSON.parse(local) : []);
    }
  }

  function persistGifts(list) {
    localStorage.setItem("mc_gifts", JSON.stringify(list));
  }

  async function handleAddGift(e) {
    e.preventDefault();
    if (!newGiftName.trim()) return;
    const newGift = { id: Date.now().toString(36), name: newGiftName.trim(), action: "default" };
    const next = [...gifts, newGift];
    setGifts(next);
    persistGifts(next);
    setNewGiftName("");
    setMessage("Đã thêm quà (lưu local).");
    try {
      await fetch(`${API_URL}/api/user/gifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gift: newGift })
      });
    } catch {}
  }

  async function handleRemoveGift(id) {
    const next = gifts.filter(g => g.id !== id);
    setGifts(next);
    persistGifts(next);
    setMessage("Đã xóa quà.");
    try {
      await fetch(`${API_URL}/api/user/gifts/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
    } catch {}
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Minecraft Dashboard</h2>
            <p className="text-sm text-gray-600">User: <span className="font-mono">{username}</span></p>
          </div>
          <div>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded">Logout</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Cài đặt phần quà (gift)</h3>
          <form onSubmit={handleAddGift} className="flex gap-2 mb-4">
            <input value={newGiftName} onChange={(e) => setNewGiftName(e.target.value)} placeholder="Tên phần quà" className="flex-1 px-4 py-2 border rounded-lg" />
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Thêm</button>
          </form>

          {message && <div className="text-green-700 bg-green-50 p-2 rounded mb-4">{message}</div>}

          <div className="space-y-3">
            {gifts.length === 0 && <div className="text-sm text-gray-500">Chưa có phần quà nào.</div>}
            {gifts.map(g => (
              <div key={g.id} className="flex items-center justify-between border p-3 rounded">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">Action: {g.action}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRemoveGift(g.id)} className="text-red-600 hover:underline">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Hướng dẫn</h3>
          <ol className="list-decimal list-inside text-sm text-gray-600">
            <li>Thêm tên phần quà mà bạn muốn hệ thống nhận diện.</li>
            <li>Hệ thống sẽ sử dụng cấu hình để xử lý sự kiện tương ứng.</li>
            <li>Nếu muốn lưu vĩnh viễn, backend cần có endpoint /api/user/gifts.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}