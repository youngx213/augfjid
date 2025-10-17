import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './lib/apiClient.js';
import TokenStatus from './components/TokenStatus.jsx';
import AppShell from './components/AppShell.jsx';
import { formatCurrency } from './lib/formatters.js';
import PurchasePlan from './components/PurchasePlan.jsx';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, tiktokAccounts: 0 });
  const [orders, setOrders] = useState([]);
  const [newRole, setNewRole] = useState("game");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) api.defaults.headers.Authorization = `Bearer ${token}`;
    fetchUsers();
    fetchStats();
    fetchOrders();
  }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get(`/api/admin/users`);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchStats() {
    try {
      const { data } = await api.get(`/api/admin/stats`);
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateKey() {
    try {
      const { data } = await api.post(`/api/admin/keys/gen`, { role: newRole });
      setMessage(`New key generated: ${data.key}`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(username) {
    try {
      await api.post(`/api/admin/users/delete`, { username });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchOrders() {
    try {
      const { data } = await api.get('/api/payments', { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      if (data?.ok) setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell
      title="Admin Control Center"
      subtitle="Quản lý user, key và thống kê hệ thống"
      actions={<TokenStatus />}
    >
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Users" value={stats.total} icon="👥" />
        <StatCard title="Active Users" value={stats.active} icon="✅" />
        <StatCard title="TikTok Accounts" value={stats.tiktokAccounts} icon="📱" />
      </section>

      <section className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
        <h2 className="text-xl font-semibold text-white/95 mb-4">Tạo key mới</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="px-4 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
            <option value="game">Game - 2.500.000 VND</option>
            <option value="bot">Bot - 3.000.000 VND</option>
          </select>
          <button onClick={handleGenerateKey} className="px-5 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition">
            Generate Key
          </button>
        </div>
        {message && <div className="mt-4 p-4 bg-emerald-500/10 text-emerald-200 rounded-lg border border-emerald-400/30">{message}</div>}
        {error && <div className="mt-4 p-4 bg-red-500/10 text-red-200 rounded-lg border border-red-400/30">{error}</div>}
      </section>

      <section className="bg-white/5 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/10">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white/95">Danh sách người dùng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-white/90">
            <thead className="bg-white/10 text-cyan-200 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Username</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Key</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-black/30 divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.username} className="hover:bg-white/10 transition">
                  <td className="px-6 py-4 font-semibold">{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'admin'
                        ? 'bg-red-500/20 text-red-200'
                        : user.role === 'game'
                        ? 'bg-blue-500/20 text-blue-200'
                        : user.role === 'bot'
                        ? 'bg-yellow-500/20 text-yellow-200'
                        : 'bg-emerald-500/20 text-emerald-200'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-cyan-200/80">{user.key || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteUser(user.username)} className="text-red-400 hover:text-red-200 text-sm font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
        <h2 className="text-xl font-semibold text-white mb-4">Bán hàng nhanh</h2>
        <PurchasePlan onOrderCreated={fetchOrders} />
      </section>

      <section className="bg-white/5 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/10">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white/95">Đơn hàng gần đây</h2>
          <button onClick={fetchOrders} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-white text-sm">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-white/90">
            <thead className="bg-white/10 text-cyan-200 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Order code</th>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Key</th>
                <th className="px-6 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="bg-black/30 divide-y divide-white/5">
              {orders.map((order) => (
                <tr key={order.orderCode} className="hover:bg-white/10 transition">
                  <td className="px-6 py-4 font-mono text-xs text-cyan-200/80">{order.orderCode}</td>
                  <td className="px-6 py-4 capitalize">{order.plan}</td>
                  <td className="px-6 py-4">{formatCurrency(order.amount || 0)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {order.activatedKey ? (
                      <code className="px-2 py-1 bg-black/40 border border-white/10 rounded text-xs">{order.activatedKey}</code>
                    ) : (
                      <span className="text-white/50 text-xs">Chưa</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-white/70">{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-cyan-200/60">Chưa có đơn hàng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-5 shadow-lg shadow-cyan-500/10">
      <div className="flex items-center justify-between text-white/90">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-cyan-300">{value}</p>
    </div>
  );
}