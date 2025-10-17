import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import Dashboard from "./Dashboard.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import MinecraftDashboard from "./MinecraftDashboard.jsx";
import PurchasePlan from "./components/PurchasePlan.jsx";
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from "./store/useAuthStore.js";
import { getActiveUser } from "./getActiveUser";

export default function App() {
  const { token, setToken, logout } = useAuthStore((s) => ({ token: s.token, setToken: s.setToken, logout: s.logout }));
  const user = getActiveUser();

  function handleLogin(data) {
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
  }

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  function handlePurchaseCreated(order) {
    localStorage.setItem("pendingPayment", JSON.stringify(order));
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<PurchasePlan onOrderCreated={handlePurchaseCreated} />} />

      <Route
        path="/admin"
        element={user && user.role === "admin" ? <AdminDashboard /> : <Navigate to={user ? (user.role === "game" ? "/minecraft" : "/dashboard") : "/login"} replace />}
      />

      <Route
        path="/minecraft"
        element={
          user && user.role === "game" ? (
            <MinecraftDashboard onLogout={handleLogout} />
          ) : user && user.role === "bot" ? (
            <Navigate to="/dashboard" replace />
          ) : user && user.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          user && user.role === "bot" ? (
            <Dashboard onLogout={handleLogout} />
          ) : user && user.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user && user.role === "game" ? (
            <Navigate to="/minecraft" replace />
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