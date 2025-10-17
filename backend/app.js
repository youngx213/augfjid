import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, requireProdSecret } from "./config.js";
import { router as paymentsRouter } from "./routes/payments.js";

requireProdSecret();

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  app.use("/api/payments", paymentsRouter);

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

