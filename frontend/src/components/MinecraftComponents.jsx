import React from "react";
import { motion } from "framer-motion";
import { LoadingButton } from "./LoadingSpinner.jsx";

// Stats Card Component
export function StatsCard({ title, value, icon, color = "cyan", className = "" }) {
  const colorClasses = {
    cyan: "bg-cyan-500/20 border-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/20 border-emerald-500/30 text-emerald-200",
    amber: "bg-amber-500/20 border-amber-500/30 text-amber-200",
    fuchsia: "bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-200"
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-white/5 border border-cyan-500/20 rounded-xl p-4 ${colorClasses[color]} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon && (
          <div className="text-3xl opacity-60">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Preset Card Component
export function PresetCard({ preset, onEdit, onDelete, onToggle, isEditing = false }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white/5 border rounded-xl p-4 transition ${
        preset.enabled 
          ? "border-emerald-500/30 bg-emerald-500/10" 
          : "border-gray-500/30 bg-gray-500/10"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {preset.imageUrl && (
            <img 
              src={preset.imageUrl} 
              alt={preset.giftName}
              className="w-8 h-8 rounded object-cover"
            />
          )}
          <div>
            <h3 className="font-semibold text-white">{preset.giftName}</h3>
            <p className="text-sm text-cyan-200/80">
              {preset.coinsPerUnit} coins per gift
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(preset.id)}
            className={`w-12 h-6 rounded-full transition ${
              preset.enabled 
                ? "bg-emerald-500" 
                : "bg-gray-500"
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition transform ${
              preset.enabled ? "translate-x-6" : "translate-x-0.5"
            }`} />
          </button>
          
          <button
            onClick={() => onEdit(preset)}
            className="p-2 text-cyan-400 hover:text-cyan-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDelete(preset.id)}
            className="p-2 text-red-400 hover:text-red-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {preset.commands && preset.commands.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-cyan-200/60 mb-1">Commands:</p>
          <div className="flex flex-wrap gap-1">
            {preset.commands.slice(0, 3).map((cmd, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 bg-black/30 rounded text-xs text-cyan-200/80"
              >
                {cmd}
              </span>
            ))}
            {preset.commands.length > 3 && (
              <span className="px-2 py-1 bg-black/30 rounded text-xs text-cyan-200/60">
                +{preset.commands.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Gift Selector Component
export function GiftSelector({ gifts, selectedGift, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Chọn Gift</h3>
          <button
            onClick={onClose}
            className="p-2 text-cyan-200/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gifts.map((gift) => (
            <motion.button
              key={gift.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(gift)}
              className={`p-3 rounded-lg border transition ${
                selectedGift?.name === gift.name
                  ? "border-cyan-400 bg-cyan-500/20"
                  : "border-white/20 bg-white/5 hover:bg-white/10"
              }`}
            >
              <img 
                src={gift.imageUrl} 
                alt={gift.name}
                className="w-12 h-12 mx-auto mb-2 rounded object-cover"
              />
              <p className="text-sm text-white font-medium">{gift.name}</p>
              <p className="text-xs text-cyan-200/80">{gift.price} coins</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Preset Form Component
export function PresetForm({ preset, onSave, onCancel, gifts, onGiftSelect }) {
  const [formData, setFormData] = React.useState(preset);
  const [showGiftSelector, setShowGiftSelector] = React.useState(false);

  React.useEffect(() => {
    setFormData(preset);
  }, [preset]);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleGiftSelect = (gift) => {
    setFormData(prev => ({
      ...prev,
      giftName: gift.name,
      imageUrl: gift.imageUrl
    }));
    setShowGiftSelector(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-cyan-500/20 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">
        {preset.id ? "Chỉnh sửa Preset" : "Tạo Preset mới"}
      </h3>
      
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cyan-200 mb-2">
            Gift Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.giftName}
              onChange={(e) => setFormData(prev => ({ ...prev, giftName: e.target.value }))}
              className="flex-1 px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Tên gift"
              required
            />
            <button
              type="button"
              onClick={() => setShowGiftSelector(true)}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-200 hover:bg-cyan-500/30 transition"
            >
              Chọn
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-200 mb-2">
            Coins per Unit
          </label>
          <input
            type="number"
            min="1"
            value={formData.coinsPerUnit}
            onChange={(e) => setFormData(prev => ({ ...prev, coinsPerUnit: parseInt(e.target.value) || 1 }))}
            className="w-full px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-200 mb-2">
            Commands (mỗi dòng một lệnh)
          </label>
          <textarea
            value={formData.commands?.join('\n') || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              commands: e.target.value.split('\n').filter(cmd => cmd.trim()) 
            }))}
            className="w-full px-3 py-2 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 h-24"
            placeholder="say Hello!&#10;give @p diamond 1"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 text-cyan-400 bg-black/30 border-cyan-500/30 rounded focus:ring-cyan-400"
            />
            <span className="text-cyan-200">Kích hoạt</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <LoadingButton
            type="submit"
            className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400 transition"
          >
            {preset.id ? "Cập nhật" : "Tạo mới"}
          </LoadingButton>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
          >
            Hủy
          </button>
        </div>
      </form>

      {showGiftSelector && (
        <GiftSelector
          gifts={gifts}
          selectedGift={formData}
          onSelect={handleGiftSelect}
          onClose={() => setShowGiftSelector(false)}
        />
      )}
    </motion.div>
  );
}

// Icons for stats
export const StatsIcons = {
  coins: "💰",
  viewers: "👥",
  timer: "⏱️",
  goal: "🎯"
};
