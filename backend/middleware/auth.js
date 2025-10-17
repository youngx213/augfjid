import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { username: decoded.username, role: decoded.role, userId: decoded.userId };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthenticated" });
    if (req.user.role !== role) return res.status(403).json({ ok: false, error: "Forbidden" });
    return next();
  };
}


