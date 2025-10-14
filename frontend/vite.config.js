import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép truy cập từ IP mạng nội bộ (ví dụ: 192.168.x.x)
    allowedHosts: [
      ".ngrok-free.app", // Cho phép tất cả các domain từ ngrok
      "localhost",
      "127.0.0.1"
    ],
    proxy: {
      "/api": {
        target: "http://localhost:3001", // backend port của bạn
        changeOrigin: true,
      },
    },
  },
});
