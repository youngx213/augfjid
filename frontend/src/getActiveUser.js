import { decodeJwtPayload } from "./lib/tokenUtils.js";

export function getActiveUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.removeItem("token");
    return null;
  }
  return { username: payload.username, role: payload.role };
}

