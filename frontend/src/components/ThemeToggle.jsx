import React from "react";
import { motion } from "framer-motion";

export default function ThemeToggle({ theme, onThemeChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cyan-200/80">Theme:</span>
      <div className="flex bg-white/10 rounded-lg p-1">
        <button
          onClick={() => onThemeChange("dark")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            theme === "dark"
              ? "bg-cyan-500 text-black"
              : "text-cyan-200/80 hover:text-white"
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => onThemeChange("light")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            theme === "light"
              ? "bg-cyan-500 text-black"
              : "text-cyan-200/80 hover:text-white"
          }`}
        >
          Light
        </button>
      </div>
    </div>
  );
}

// Hook để quản lý theme
export function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem("theme");
    return saved || "dark";
  });

  React.useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return [theme, setTheme];
}
