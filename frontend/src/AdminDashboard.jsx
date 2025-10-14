import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, tiktokAccounts: 0 });
  const [newRole, setNewRole] = useState("game");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("http://localhost:3001/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("http://localhost:3001/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateKey() {
    try {
      const res = await fetch("http://localhost:3001/api/admin/keys/gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!res.ok) throw new Error("Failed to generate key");
      
      const data = await res.json();
      setMessage(`New key generated: ${data.key}`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon="👥"
          />
          <StatCard
            title="Active Users"
            value={stats.active}
            icon="✅"
          />
          <StatCard
            title="TikTok Accounts"
            value={stats.tiktokAccounts}
            icon="📱"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Generate New Key</h2>
          <div className="flex gap-4">
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="game">Game</option>
              <option value="bot">Bot</option>
            </select>
            <button
              onClick={handleGenerateKey}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Generate Key
            </button>
          </div>
          {message && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Users Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.username}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'game' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'bot' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {user.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-blue-600">{value}</p>
    </div>
  );
}