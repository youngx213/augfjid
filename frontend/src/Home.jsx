import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "./assets/logo.png";

// Floating particles background
function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.8 + 0.6,
        dx: (Math.random() - 0.5) * 0.25,
        dy: (Math.random() - 0.5) * 0.25,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 255, 0.35)";
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  );
}

export default function Home() {
  const navigate = useNavigate();

  // ✅ Tự phát hiện thiết bị
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b15] text-white relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900 via-[#0b0b15] to-black"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Neon lights & particles */}
      <ParticleBackground />
      <div className="absolute w-96 h-96 bg-cyan-500/20 blur-[160px] rounded-full -top-32 -left-32" />
      <div className="absolute w-96 h-96 bg-fuchsia-500/20 blur-[160px] rounded-full bottom-0 right-0" />

      {/* Header */}
      <header className="sticky top-0 backdrop-blur-md bg-white/5 border-b border-cyan-500/20 z-50">
        <div className={`max-w-7xl mx-auto px-6 ${isMobile ? "py-3" : "py-4"} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src={logo}
                alt="EricSoft Logo"
                className={`w-10 h-10 object-contain transition-transform duration-300 ${
                  isMobile
                    ? "drop-shadow-[0_0_3px_rgba(0,255,255,0.3)]"
                    : "drop-shadow-[0_0_6px_rgba(0,255,255,0.6)] hover:scale-105"
                }`}
              />
            </div>
            <div>
              <h1 className={`font-extrabold ${isMobile ? "text-base" : "text-lg"}`}>EricSoftware</h1>
              <p className="text-cyan-300/80 text-xs">
                Automate • Manage • Monetize
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className={`px-4 py-2 bg-cyan-400 text-black rounded-md font-medium shadow hover:shadow-cyan-400/40 hover:-translate-y-0.5 transition ${
                isMobile ? "text-sm px-3 py-1.5" : ""
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => navigate("/register")}
              className={`px-4 py-2 border border-cyan-400/30 text-cyan-200 rounded-md font-medium hover:bg-cyan-400/10 transition ${
                isMobile ? "text-sm px-3 py-1.5" : ""
              }`}
            >
              Đăng ký
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className={`max-w-7xl mx-auto px-6 ${isMobile ? "py-8" : "py-16"} relative z-10`}>
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2
              className={`${
                isMobile ? "text-3xl" : "text-5xl"
              } font-extrabold leading-tight bg-gradient-to-r from-cyan-200 via-fuchsia-300 to-white bg-clip-text text-transparent`}
            >
              Quản lý TikTok chuyên nghiệp — tự động hóa gift & chat
            </h2>
            <p
              className={`mt-6 text-cyan-100/90 ${
                isMobile ? "text-sm" : "text-base"
              } max-w-xl leading-relaxed`}
            >
              EricSoftware giúp bạn triển khai hệ thống tự động nhận diện phần
              quà, quản lý nhiều tài khoản. Dùng được cho Game, Bot, Minecraft —
              triển khai nhanh, bảo mật và dễ dùng.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/register")}
                className="px-6 py-3 bg-cyan-400 text-black rounded-xl font-semibold shadow-lg hover:shadow-cyan-400/50 hover:-translate-y-0.5 transition"
              >
                Bắt đầu (Dùng thử)
              </button>

              <button
                onClick={() => navigate("/pricing")}
                className="px-6 py-3 border border-cyan-400/40 text-cyan-200 rounded-xl hover:bg-cyan-400/10 transition"
              >
                Xem bảng giá
              </button>

              <a
                href="mailto:sales@tooltiktok.example?subject=Contact%20Sales"
                className="px-6 py-3 border border-cyan-400/40 text-cyan-200 rounded-xl hover:bg-cyan-400/10 transition flex items-center gap-2"
              >
                Liên hệ mua hàng
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 text-white/90">
              {[
                { label: "Uptime", value: "99%" },
                { label: "Multiple Roles", value: "Multi" },
                { label: "Real-time", value: "Fast" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-sm text-cyan-100">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Dashboard Mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,255,255,0.15)]">
              <div className="text-sm text-cyan-300 mb-3">Live preview</div>
              <div className="bg-cyan-400/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 text-xs text-cyan-200">
                  <span>Dashboard • Bot</span>
                  <span className="text-green-400">Online</span>
                </div>
                <div className="bg-black/40 p-3 rounded">
                  <div className="flex justify-between text-sm mb-2">
                    <span>acc_tiktok_01</span>
                    <span className="font-mono text-xs text-green-300">
                      running
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-cyan-400/10 rounded">
                      <div className="text-xs text-cyan-200">Queue</div>
                      <div className="font-medium">3 items</div>
                    </div>
                    <div className="p-2 bg-fuchsia-400/10 rounded">
                      <div className="text-xs text-fuchsia-200">Gifts</div>
                      <div className="font-medium">12</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-cyan-200">
                  Admin: user management • stats
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Feature Cards */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Auto Gift Detection",
              desc: "Nhận diện gift & chat chứa ảnh, tự push job vào xử lý.",
            },
            {
              title: "Tối ưu hoá chạy MMO",
              desc: "Tool tự động hóa quy trình, giúp bạn tập trung vào việc thu thập Quà và Tăng Follow.",
            },
            {
              title: "Extensible",
              desc: "Giao diện plugin cho Bot / Minecraft / Game — mở rộng dễ dàng.",
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ scale: 1.03 }}
              className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-cyan-400/20 shadow-md hover:shadow-cyan-400/40 transition"
            >
              <h3 className="text-lg font-semibold text-cyan-200">
                {item.title}
              </h3>
              <p className="mt-2 text-cyan-100/80 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Pricing / CTA */}
        <section className="mt-20 bg-black/40 backdrop-blur-md rounded-xl p-8 flex flex-col md:flex-row items-center justify-between border border-cyan-400/20 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
          <div>
            <h4 className="text-xl font-bold text-cyan-100">
              Gói bản quyền & Hỗ trợ
            </h4>
            <p className="mt-2 text-cyan-200/80 max-w-xl">
              Bán kèm cài đặt, hỗ trợ tích hợp và cập nhật. Liên hệ để nhận báo
              giá theo yêu cầu.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-3">
            <a
              href="mailto:sales@tooltiktok.example?subject=Request%20Quote"
              className="px-5 py-3 bg-cyan-400 text-black rounded-lg font-semibold hover:shadow-cyan-400/50 hover:-translate-y-0.5 transition"
            >
              Yêu cầu báo giá
            </a>
            <a
              href="/register"
              className="px-5 py-3 border border-cyan-400/30 text-cyan-200 rounded-lg hover:bg-cyan-400/10 transition"
            >
              Dùng thử
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-cyan-400/20 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-cyan-200/80">
            <div className="text-sm">
              © {new Date().getFullYear()} EricSoftware — All rights reserved.
            </div>
            <div className="flex gap-4 mt-3 md:mt-0 text-sm">
              <a className="hover:text-cyan-300" href="/privacy">
                Privacy
              </a>
              <a
                className="hover:text-cyan-300"
                href="mailto:sales@tooltiktok.example"
              >
                Contact
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
