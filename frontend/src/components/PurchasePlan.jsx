import React, { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatters.js";
import AppShell from "./AppShell.jsx";

const PLANS = [
  {
    id: "game",
    title: "Minecraft/Game",
    price: 2500000,
    description: "Dành cho streamer tích hợp Minecraft plugin, overlay và preset tùy chỉnh",
    perks: ["Quản lý preset overlay", "Socket plugin realtime", "Update miễn phí 3 tháng"]
  },
  {
    id: "bot",
    title: "Bot Manager",
    price: 3000000,
    description: "Tự động hóa listener TikTok, queue job và quản lý nhiều account",
    perks: ["Quản lý nhiều account bot", "Realtime logs & queue", "Hỗ trợ ưu tiên"]
  }
];

export default function PurchasePlan({ onOrderCreated }) {
  const [selected, setSelected] = useState(() => localStorage.getItem("selectedPlan") || "game");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(() => {
    const saved = localStorage.getItem("pendingPayment");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState("" );

  function handleSelect(planId) {
    setSelected(planId);
    localStorage.setItem("selectedPlan", planId);
    setPayment(null);
    localStorage.removeItem("pendingPayment");
  }

  async function handlePurchase() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/payments/create", { plan: selected });
      if (!data?.ok) throw new Error(data?.error || "Không tạo được giao dịch");
      setPayment(data.payment);
      localStorage.setItem("pendingPayment", JSON.stringify(data.payment));
      onOrderCreated?.(data.payment);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="EricSoftware Pricing"
      subtitle="Chọn gói và thanh toán qua VietQR"
    >
      <div className="mt-8 flex flex-col items-center gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl grid lg:grid-cols-2 gap-6"
        >
        {PLANS.map((plan) => (
          <motion.button
            key={plan.id}
            whileHover={{ scale: 1.02 }}
              className={`text-left p-6 rounded-2xl border transition ${
                selected === plan.id ? "border-cyan-400 bg-white/10" : "border-white/10 bg-white/5 hover:border-cyan-300/40"
              }`}
              onClick={() => handleSelect(plan.id)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white/90">{plan.title}</h3>
              <span className="text-cyan-300 font-bold">{formatCurrency(plan.price)}</span>
            </div>
            <p className="text-cyan-200/80 text-sm mt-2">{plan.description}</p>
            <ul className="mt-4 space-y-1 text-sm text-white/70">
              {plan.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
          </motion.button>
        ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative w-full max-w-4xl"
        >
          <div className="bg-black/40 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-white/90">Tổng thanh toán</h4>
                <p className="text-cyan-200/70 text-sm">Plan: {PLANS.find((p) => p.id === selected)?.title}</p>
              </div>
              <div className="text-3xl font-bold text-cyan-300">
                {formatCurrency(PLANS.find((p) => p.id === selected)?.price || 0)}
              </div>
            </div>

            <div className="mt-6 flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <button
                  disabled={loading}
                  onClick={handlePurchase}
                  className="w-full bg-cyan-500 text-black font-semibold py-3 rounded-xl hover:bg-cyan-400 transition disabled:opacity-50"
                >
                  {loading ? "Đang tạo VietQR..." : "Thanh toán bằng VietQR"}
                </button>
                {error && <div className="p-3 bg-red-500/10 text-red-200 rounded-lg border border-red-500/30">{error}</div>}
                <div className="text-xs text-cyan-200/70">Sau khi thanh toán thành công, hệ thống sẽ tự động tạo key theo gói bạn chọn và hiển thị bên phải.</div>
              </div>

              <div className="flex-1 bg-black/30 border border-white/10 rounded-xl p-4 min-h-[260px] flex items-center justify-center">
                {payment ? (
                  <div className="w-full space-y-4 text-sm text-white/80">
                    <div>
                      <div className="text-xs uppercase text-cyan-200/70">Order Code</div>
                      <div className="font-semibold">{payment.orderCode}</div>
                    </div>
                    {payment.status && (
                      <div>
                        <div className="text-xs uppercase text-cyan-200/70">Trạng thái</div>
                        <div className={`font-semibold ${payment.status === "success" ? "text-emerald-300" : "text-cyan-300"}`}>{payment.status}</div>
                      </div>
                    )}
                    {payment.activatedKey && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded-lg space-y-2">
                        <div className="text-xs uppercase text-emerald-200/70">Key đã kích hoạt</div>
                        <div className="font-mono text-emerald-200 text-sm">{payment.activatedKey}</div>
                        <button
                          onClick={() => navigator.clipboard.writeText(payment.activatedKey)}
                          className="px-3 py-1 bg-emerald-500/80 text-black rounded text-xs hover:bg-emerald-400 transition"
                        >
                          Copy key
                        </button>
                        <div className="text-xs text-emerald-200/70">Hãy sử dụng key này để đăng ký hoặc gửi cho khách hàng của bạn.</div>
                      </div>
                    )}
                    {payment.qrData && (
                      <div>
                        <div className="text-xs uppercase text-cyan-200/70">QR Data</div>
                        <div className="font-mono break-all bg-black/40 p-3 rounded-lg border border-white/10 text-xs">{payment.qrData}</div>
                      </div>
                    )}
                    {payment.qrImage && (
                      <div className="flex justify-center">
                        <img
                          src={payment.qrImage}
                          alt="QR thanh toán"
                          className="max-w-xs rounded-xl border border-white/10 shadow-lg"
                        />
                      </div>
                    )}
                    {payment.checkoutUrl && (
                      <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition">
                        Mở trang thanh toán
                      </a>
                    )}
                    {!payment.activatedKey && (
                      <div className="text-xs text-cyan-200/60">Quét QR bằng app ngân hàng để thanh toán. Kiểm tra lại trang này sau vài giây để lấy key.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-cyan-200/60 text-sm">
                    Thực hiện thanh toán để xem thông tin QR và key kích hoạt tại đây.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

