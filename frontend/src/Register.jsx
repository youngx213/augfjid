import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

export default function Register({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, key })
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        // if backend returns token, store and use it (behave like login)
        if (data.token) {
          localStorage.setItem("token", data.token);
          if (onLogin) onLogin(data);
          // navigate according to role if provided
          const role = data.role || (data.user && data.user.role);
          if (role === "admin") navigate("/admin");
          else if (role === "minecraft") navigate("/minecraft");
          else navigate("/dashboard");
          return;
        }

        // no token: show success and redirect to login
        setUsername("");
        setPassword("");
        setKey("");
        navigate("/login");
      } else {
        setError(data.error || "Đăng ký thất bại");
      }
    } catch (err) {
      setError("Lỗi kết nối tới server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Register</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="registration key"
            />
          </div>

          {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white bg-blue-600 rounded-lg transition duration-200 ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"}`}
          >
            {loading ? "Processing..." : "Register"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3 text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50"
          >
            Back to Home
          </button>
        </form>
      </div>
    </div>
  );
}