import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";

export const config = {
  env,
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || (env === "production" ? null : "dev-secret-change-in-production"),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "120", 10)
  },
  redis: {
    url: process.env.REDIS_URL || undefined
  },
  pluginKey: process.env.PLUGIN_KEY || (env === "production" ? null : "dev-plugin-key"),
  sepay: {
    apiKey: process.env.SEPAY_API_KEY || null,
    accountNumber: process.env.SEPAY_ACCOUNT_NO || null,
    bankCode: process.env.SEPAY_BANK_CODE || "Mbbank",
    template: process.env.SEPAY_QR_TEMPLATE || "compact",
    accountName: process.env.SEPAY_ACCOUNT_NAME || null,
    returnUrl: process.env.SEPAY_RETURN_URL || null,
    callbackUrl: process.env.SEPAY_CALLBACK_URL || null,
    webhookToken: process.env.SEPAY_WEBHOOK_TOKEN || null
  }
};

export function requireProdSecret() {
  if (env === "production") {
    const requiredSecrets = [
      { key: "JWT_SECRET", value: process.env.JWT_SECRET },
      { key: "REDIS_URL", value: process.env.REDIS_URL },
      { key: "SEPAY_API_KEY", value: process.env.SEPAY_API_KEY },
      { key: "SEPAY_ACCOUNT_NO", value: process.env.SEPAY_ACCOUNT_NO },
      { key: "SEPAY_WEBHOOK_TOKEN", value: process.env.SEPAY_WEBHOOK_TOKEN }
    ];
    
    const missingSecrets = requiredSecrets.filter(secret => !secret.value);
    
    if (missingSecrets.length > 0) {
      console.error("Missing required environment variables in production:");
      missingSecrets.forEach(secret => console.error(`  - ${secret.key}`));
      process.exit(1);
    }
  }
}


