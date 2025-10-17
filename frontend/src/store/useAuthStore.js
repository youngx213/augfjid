import { create } from "zustand";
import { decodeJwtPayload } from "../lib/tokenUtils.js";

const storedToken = localStorage.getItem("token");
let initialUser = null;
if (storedToken) {
  const payload = decodeJwtPayload(storedToken);
  if (payload) {
    initialUser = { username: payload.username, role: payload.role };
  } else {
    localStorage.removeItem("token");
  }
}

export const useAuthStore = create((set) => ({
  token: initialUser ? storedToken : null,
  setToken: (token) => {
    if (token) localStorage.setItem("token", token); else localStorage.removeItem("token");
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null });
  }
}));


