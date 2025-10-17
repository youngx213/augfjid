import React from "react";
import { motion } from "framer-motion";
import logo from "../assets/logo.png";

function ParticleBackground() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.6 + 0.6,
      dx: (Math.random() - 0.5) * 0.22,
      dy: (Math.random() - 0.5) * 0.22
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />;
}

export default function AppShell({ title, subtitle, actions, children }) {
  return (
    <div className="min-h-screen bg-[#0b0b15] text-white relative overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900/60 via-[#0b0b15] to-black"
        animate={{
          backgroundPosition: ["0% 0%", "80% 80%", "0% 0%"],
          backgroundSize: ["120% 120%", "140% 140%", "120% 120%"]
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <ParticleBackground />
      <div className="absolute w-80 h-80 bg-cyan-500/15 blur-[140px] rounded-full -top-24 -left-24" />
      <div className="absolute w-80 h-80 bg-fuchsia-500/15 blur-[140px] rounded-full bottom-10 right-10" />

      <header className="relative z-10 border-b border-cyan-500/20 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="EricSoftware" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
            <div>
              <h1 className="font-extrabold text-lg text-white/95">{title}</h1>
              {subtitle && <p className="text-cyan-200/80 text-sm">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">
        {children}
      </main>
    </div>
  );
}

