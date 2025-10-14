import { create } from "zustand";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: null,
  setToken: (token) => {
    if (token) localStorage.setItem("token", token); else localStorage.removeItem("token");
    const payload = token ? decodeJwt(token) : null;
    set({ token, user: payload ? { username: payload.username, role: payload.role } : null });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  }
}));


