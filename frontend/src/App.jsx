import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import Dashboard from "./Dashboard.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import MinecraftDashboard from "./MinecraftDashboard.jsx";
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from "./store/useAuthStore.js";

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

export default function App() {
  const [user, setUser] = useState(null);
  const setToken = useAuthStore(s => s.setToken);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload) {
      localStorage.removeItem("token");
      return;
    }
    setUser({ username: payload.username, role: payload.role });
    setToken(token);
  }, []);

  function handleLogin(data) {
    if (data.token) localStorage.setItem("token", data.token);
    setUser({ username: data.username, role: data.role });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/";
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin"
        element={user && user.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/minecraft"
        element={
          user && user.role === "minecraft" ? (
            <MinecraftDashboard onLogout={handleLogout} />
          ) : (
            <Navigate to={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"} replace />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          user && user.role !== "minecraft" && user.role !== "admin" ? (
            <Dashboard onLogout={handleLogout} />
          ) : user && user.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}