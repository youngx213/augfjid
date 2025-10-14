import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";

export const config = {
  env,
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "dev_insecure_change_me",
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "120", 10)
  },
  redis: {
    url: process.env.REDIS_URL || undefined
  }
};

export function requireProdSecret() {
  if (env === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev_insecure_change_me")) {
    // eslint-disable-next-line no-console
    console.error("JWT_SECRET must be set in production");
    process.exit(1);
  }
}


