import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './lib/apiClient.js';
import { useAuthStore } from './store/useAuthStore.js';
import toast from 'react-hot-toast';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useAuthStore(s => s.setToken);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      if (data.ok) {
        setToken(data.token);
        onLogin?.(data);
        toast.success('Logged in successfully');
        if (data.role === 'admin') navigate('/admin');
        else if (data.role === 'game') navigate('/minecraft');
        else navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
        toast.error(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || "Connection error");
      toast.error(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Login</h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          

          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white bg-blue-600 rounded-lg transition duration-200 
              ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 transform hover:scale-105'}`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition duration-200"
          >
            Back to Home
          </button>
        </form>
      </div>
    </div>
  );
}