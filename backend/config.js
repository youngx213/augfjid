import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";

export const config = {
  env,
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "453782thien",
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "120", 10)
  },
  redis: {
    url: process.env.REDIS_URL || undefined
  },
  pluginKey: process.env.PLUGIN_KEY || "453782thien",
  sepay: {
    apiKey: process.env.SEPAY_API_KEY || "DMGO7V5AM6RFCG9BPVHQP06RV8P3F4RLASZYYN31XIJLRJFWTOIXDEUUM7JWQXAE",
    accountNumber: process.env.SEPAY_ACCOUNT_NO || "9789422104",
    bankCode: process.env.SEPAY_BANK_CODE || "Mbbank",
    template: process.env.SEPAY_QR_TEMPLATE || "compact",
    accountName: process.env.SEPAY_ACCOUNT_NAME || "TRAN HUU THIEN",
    returnUrl: process.env.SEPAY_RETURN_URL || "https://be3bb967a6ed.ngrok-free.app/payment/success",
    callbackUrl: process.env.SEPAY_CALLBACK_URL || "https://be3bb967a6ed.ngrok-free.app/api/payments/callback",
    webhookToken: process.env.SEPAY_WEBHOOK_TOKEN || "huuthien453782@"
  }
};

export function requireProdSecret() {
  if (env === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "453782thien")) {
    // eslint-disable-next-line no-console
    console.error("JWT_SECRET must be set in production");
    process.exit(1);
  }
}


