import React from "react";
import { motion } from "framer-motion";
import { LoadingButton } from "./LoadingSpinner.jsx";

export function FormCard({ children, title, subtitle, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10 ${className}`}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-cyan-200/80">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export function FormField({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  error, 
  icon,
  className = "",
  ...props 
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-cyan-200">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-3 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition ${
            icon ? "pl-10" : ""
          } ${error ? "border-red-500 focus:ring-red-400 focus:border-red-400" : ""}`}
          {...props}
        />
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}
    </div>
  );
}

export function FormButton({ 
  children, 
  type = "button", 
  variant = "primary", 
  loading = false, 
  disabled = false,
  onClick,
  className = "",
  ...props 
}) {
  const baseClasses = "w-full py-3 px-6 rounded-lg font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent";
  
  const variants = {
    primary: "bg-cyan-500 text-black hover:bg-cyan-400 focus:ring-cyan-400 transform hover:scale-105",
    secondary: "bg-white/10 text-white border border-cyan-400/30 hover:bg-cyan-400/10 focus:ring-cyan-400",
    danger: "bg-red-500 text-white hover:bg-red-400 focus:ring-red-400",
    ghost: "text-cyan-200 hover:text-white hover:bg-white/10 focus:ring-cyan-400"
  };

  const disabledClasses = disabled || loading ? "opacity-50 cursor-not-allowed transform-none" : "";

  return (
    <LoadingButton
      type={type}
      loading={loading}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </LoadingButton>
  );
}

export function FormError({ error, className = "" }) {
  if (!error) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-red-500/20 border border-red-500/30 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-2 text-red-300">
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">{error}</span>
      </div>
    </motion.div>
  );
}

export function FormSuccess({ message, className = "" }) {
  if (!message) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-2 text-emerald-300">
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">{message}</span>
      </div>
    </motion.div>
  );
}

// Icons for form fields
export const FormIcons = {
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  lock: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  key: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
};
