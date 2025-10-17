import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { api, getApiUrl } from "./lib/apiClient.js";
import { decodeJwtPayload } from "./lib/tokenUtils.js";
import TokenStatus from "./components/TokenStatus.jsx";
import AppShell from "./components/AppShell.jsx";

const API_URL = getApiUrl();

export default function Dashboard({ onLogout }) {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [queue, setQueue] = useState([]);
  const [gifted, setGifted] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [pollInterval, setPollInterval] = useState(3000);
  const pollRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

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
    if (payload.role === "game") {
      navigate("/minecraft");
      return;
    }
    fetchAccounts();
    // connect socket for logs
    connectSocket();
    return () => {
      disconnectSocket();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeAccount) {
      startPolling();
    } else {
      stopPolling();
      setQueue([]);
      setGifted([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, pollInterval]);

  function connectSocket() {
    try {
      socketRef.current = io(API_URL, { auth: { token } });
      socketRef.current.on("connect", () => {
        setLogs((l) => [`[ws] connected ${new Date().toLocaleTimeString()}`, ...l].slice(0, 200));
      });
      socketRef.current.on("log", (msg) => {
        setLogs((l) => [typeof msg === "string" ? msg : JSON.stringify(msg), ...l].slice(0, 200));
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

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
        const { data } = await api.get(`/api/accounts/${activeAccount}/queue`);
        setQueue(Array.isArray(data) ? data : []);
        const { data: giftedData } = await api.get(`/api/accounts/${activeAccount}/gifted`);
        setGifted(Array.isArray(giftedData) ? giftedData : []);
      } catch (err) {
        // ignore polling errors
      }
    }, pollInterval);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function fetchAccounts() {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      const { data } = await api.get(`/api/accounts`);
      if (data?.ok && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else if (Array.isArray(data)) {
        // fallback for legacy response shape
        setAccounts(data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function createAccount() {
    if (!newAccountName.trim()) return;
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      const { data } = await api.post(`/api/accounts`, { username: newAccountName.trim() });
      if (data?.ok) {
        setNewAccountName("");
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function startAccount(id) {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      await api.post(`/api/accounts/${id}/start`);
      fetchAccounts();
    } catch {}
  }

  async function stopAccount(id) {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      await api.post(`/api/accounts/${id}/stop`);
      fetchAccounts();
    } catch {}
  }

  function handleLogout() {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  }

  return (
    <AppShell
      title="TikTok Bot Dashboard"
      subtitle="Quản lý listener, hàng đợi và log realtime"
      actions={
        <>
          <TokenStatus />
          <button onClick={handleLogout} className="px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg transition">Đăng xuất</button>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white/95">TikTok Accounts</h2>
              <p className="text-cyan-200/70 text-sm">Theo dõi trạng thái và điều khiển worker</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Username mới" className="px-4 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              <button onClick={createAccount} className="px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition">Thêm</button>
              <button onClick={fetchAccounts} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Làm mới</button>
            </div>
          </div>

          <div className="overflow-hidden border border-white/10 rounded-xl">
            <table className="w-full text-sm text-white/90">
              <thead className="bg-white/10 text-cyan-200 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-black/30 divide-y divide-white/5">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-white/10 transition">
                    <td className="px-4 py-3 font-mono text-xs text-cyan-200/80">{acc.id}</td>
                    <td className="px-4 py-3 font-medium">{acc.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        acc.status === "running"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : acc.status === "stopped"
                          ? "bg-white/10 text-white/70"
                          : "bg-amber-500/20 text-amber-200"
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => { setActiveAccount(acc.id); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeAccount === acc.id ? "bg-indigo-500 text-white" : "bg-white/10 hover:bg-white/20"}`}>Xem</button>
                      {acc.status !== "running" ? (
                        <button onClick={() => startAccount(acc.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/90 text-black hover:bg-emerald-400 transition">Start</button>
                      ) : (
                        <button onClick={() => stopAccount(acc.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/80 text-white hover:bg-red-500 transition">Stop</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Thông tin queue</h3>
            <p className="text-cyan-200/70 text-sm">{activeAccount ? `Account ID: ${activeAccount}` : "Chưa chọn account"}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-cyan-200 tracking-wide uppercase mb-2">Queue</h4>
            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {queue.length === 0 && <div className="text-white/60 text-sm">Queue trống</div>}
              {queue.map(q => (
                <div key={q.jobId} className="p-3 bg-black/30 border border-white/10 rounded-lg text-sm">
                  <div className="font-semibold text-white">@{q.user}</div>
                  <div className="text-cyan-200/70 text-xs">{q.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-cyan-200 tracking-wide uppercase mb-2">Gifted</h4>
            <div className="space-y-2 max-h-40 overflow-auto pr-1">
              {gifted.length === 0 && <div className="text-white/60 text-sm">Chưa có dữ liệu</div>}
              {gifted.map((name) => (
                <div key={name} className="p-2 bg-black/30 border border-white/10 rounded-lg text-sm">@{name}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
        <h3 className="text-lg font-semibold text-white/90 mb-3">Realtime Logs</h3>
        <div className="max-h-64 overflow-auto bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-cyan-200/80 space-y-2">
          {logs.map((l, i) => (
            <div key={i} className="py-1 border-b border-white/5 last:border-b-0">{l}</div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}