import express from "express";
import { body } from "express-validator";
import dayjs from "dayjs";
import { handleValidation } from "../middleware/validate.js";
import axios from "axios";
import { config } from "../config.js";
import { generateKey, addKey, verifyAdminToken } from "../auth.js";
import { createOrder, updateOrder, getOrder, listOrders } from "../services/orderService.js";
import { emitOrderPaid } from "../socketServer.js";

const PLAN_PRICING = {
  game: 2500000,
  bot: 3000000
};

function ensureSepayConfig() {
  const { accountNumber, bankCode } = config.sepay;
  return accountNumber && bankCode;
}

function buildQrImage(amount, orderCode) {
  const { accountNumber, bankCode, template, accountName } = config.sepay;
  const params = new URLSearchParams({
    acc: accountNumber,
    bank: bankCode,
    amount: String(amount),
    des: orderCode,
    template: template || "compact",
    download: "false"
  });
  if (accountName) params.append("accountName", accountName);
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

async function searchTransactionByAddInfo(addInfo) {
  if (!config.sepay.apiKey) return null;
  try {
    const { data } = await axios.get("https://my.sepay.vn/userapi/transactions/list", {
      params: { addInfo, limit: 1 },
      headers: { Authorization: `Bearer ${config.sepay.apiKey}` }
    });
    if (data?.messages?.success && Array.isArray(data.data) && data.data.length) {
      return data.data[0];
    }
  } catch (err) {
    console.error("SePay search error", err.response?.data || err.message);
  }
  return null;
}

export const router = express.Router();

router.post(
  "/create",
  body("plan").isIn(Object.keys(PLAN_PRICING)),
  body("customer.name").optional().isString().trim(),
  body("customer.email").optional().isString().trim(),
  body("customer.phone").optional().isString().trim(),
  handleValidation,
  async (req, res) => {
    if (!ensureSepayConfig()) {
      return res.status(503).json({ ok: false, error: "Payment gateway unavailable" });
    }

    const { plan, customer = {} } = req.body;
    const amount = PLAN_PRICING[plan];
    const orderCode = `TTK-${plan}-${dayjs().format("YYYYMMDD-HHmmss")}`;
    const description = `ToolTikTok ${plan.toUpperCase()} plan`;

    try {
      const qrImage = buildQrImage(amount, orderCode);
      const qrData = orderCode;
      const checkoutUrl = null;

      const record = await createOrder({
        orderCode,
        plan,
        amount,
        status: "pending",
        qrImage,
        qrData,
        checkoutUrl,
        rawResponse: { description },
        customer,
        createdAt: Date.now()
      });

      res.json({ ok: true, payment: record });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || "Payment service error" });
    }
  }
);

router.post(
  "/callback",
  body("order_code").isString().trim().notEmpty(),
  body("amount").optional().isNumeric(),
  body("status").optional().isString(),
  body("note").optional().isString(),
  handleValidation,
  async (req, res) => {
    if (!ensureSepayConfig()) return res.status(503).json({ ok: false, error: "Payment gateway unavailable" });

    const signature = req.headers["x-signature"] || req.headers["x-webhook-sign"];
    if (config.sepay.webhookToken && signature && signature !== config.sepay.webhookToken) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const { order_code: orderCode, status, amount, addInfo, transferAmount, data: inner, description } = req.body;
    const existing = await getOrder(orderCode);
    if (!existing) {
      await createOrder({
        orderCode,
        plan: req.body.plan || req.body.package || extractPlan(description || addInfo || "unknown"),
        amount: Number(amount || transferAmount || inner?.amount || 0),
        status: status || "unknown",
        rawResponse: req.body,
        createdAt: Date.now()
      });
      return res.json({ ok: true });
    }

    const updated = await updateOrder(orderCode, {
      status: status || existing.status,
      amount: Number(amount || transferAmount || inner?.amount || existing.amount || 0),
      rawCallback: req.body
    });

    const finalStatus = status || existing.status;
    if (finalStatus === "success" || finalStatus === "paid" || finalStatus === "PAID") {
      if (!existing.activatedKey) {
        const newKey = generateKey();
        await addKey(newKey, existing.plan === "bot" ? "bot" : "game");
        await updateOrder(orderCode, { activatedKey: newKey, activatedAt: Date.now() });
      }
      emitOrderPaid(orderCode);
    }

    res.json({ ok: true });
  }
);

router.post(
  "/lookup",
  body("orderCode").isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    if (!config.sepay.apiKey) return res.status(503).json({ ok: false, error: "API key not configured" });
    const tx = await searchTransactionByAddInfo(req.body.orderCode);
    if (!tx) return res.status(404).json({ ok: false, error: "Transaction not found" });
    res.json({ ok: true, transaction: tx });
  }
);

function extractPlan(info = "") {
  if (info.toLowerCase().includes("bot")) return "bot";
  if (info.toLowerCase().includes("game")) return "game";
  return "unknown";
}

router.get("/:orderCode", async (req, res) => {
  const order = await getOrder(req.params.orderCode);
  if (!order) return res.status(404).json({ ok: false, error: "Order not found" });
  res.json({ ok: true, order });
});

router.get("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ ok: false, error: "Missing token" });
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const admin = verifyAdminToken(token);
  if (!admin) return res.status(403).json({ ok: false, error: "Forbidden" });

  const limit = Number(req.query.limit) || 100;
  const orders = await listOrders(limit);
  res.json({ ok: true, orders });
});


