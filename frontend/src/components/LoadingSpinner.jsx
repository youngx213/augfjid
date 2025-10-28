import React from "react";
import { motion } from "framer-motion";

function LoadingSpinnerDefault({ size = "md", text = "Loading...", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-cyan-400/30 border-t-cyan-400 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {text && (
        <motion.p
          className="text-cyan-200/80 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export function LoadingButton({ loading, children, className = "", ...props }) {
  return (
    <button
      className={`relative ${className}`}
      disabled={loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinnerDefault size="sm" text="" />
        </div>
      )}
      <span className={loading ? "opacity-0" : "opacity-100"}>
        {children}
      </span>
    </button>
  );
}

export function LoadingCard({ loading, children, className = "" }) {
  if (loading) {
    return (
      <div className={`bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10 ${className}`}>
        <LoadingSpinnerDefault size="lg" text="Đang tải dữ liệu..." />
      </div>
    );
  }
  
  return <div className={className}>{children}</div>;
}

// Export default component
export default LoadingSpinnerDefault;
