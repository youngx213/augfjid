import React from "react";
import { motion } from "framer-motion";

export default function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (event) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return fallback || <DefaultErrorFallback error={error} />;
  }

  return children;
}

function DefaultErrorFallback({ error }) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-[#0b0b15] flex items-center justify-center p-6"
    >
      <div className="bg-white/5 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-white mb-2">Đã xảy ra lỗi</h2>
        <p className="text-cyan-200/80 text-sm mb-6">
          Có vẻ như đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
        </p>
        
        {error && (
          <details className="mb-6 text-left">
            <summary className="text-red-400 text-sm cursor-pointer mb-2">
              Chi tiết lỗi
            </summary>
            <pre className="bg-black/30 p-3 rounded text-xs text-red-300 overflow-auto">
              {error.message || error.toString()}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-semibold hover:bg-cyan-400 transition"
          >
            Tải lại trang
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    </motion.div>
  );
}