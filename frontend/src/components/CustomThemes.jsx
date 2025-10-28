import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Custom Themes System
 */

// Theme Context
const ThemeContext = createContext();

// Predefined Themes
export const predefinedThemes = {
  default: {
    name: 'Default',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    fonts: {
      primary: 'Inter, sans-serif',
      secondary: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#fbbf24',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa'
    },
    fonts: {
      primary: 'Inter, sans-serif',
      secondary: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.4)'
    }
  },
  neon: {
    name: 'Neon',
    colors: {
      primary: '#00ff88',
      secondary: '#ff0080',
      accent: '#00d4ff',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#333333',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff0080',
      info: '#00d4ff'
    },
    fonts: {
      primary: 'Orbitron, sans-serif',
      secondary: 'Orbitron, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    shadows: {
      sm: '0 0 10px rgb(0 255 136 / 0.3)',
      md: '0 0 20px rgb(0 255 136 / 0.4)',
      lg: '0 0 30px rgb(0 255 136 / 0.5)',
      xl: '0 0 40px rgb(0 255 136 / 0.6)'
    }
  },
  pastel: {
    name: 'Pastel',
    colors: {
      primary: '#a78bfa',
      secondary: '#fbbf24',
      accent: '#f472b6',
      background: '#fefefe',
      surface: '#f8fafc',
      text: '#374151',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#a78bfa'
    },
    fonts: {
      primary: 'Poppins, sans-serif',
      secondary: 'Poppins, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem'
    },
    shadows: {
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      primary: '#ff0080',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#000000',
      surface: '#1a0033',
      text: '#ffffff',
      textSecondary: '#ff0080',
      border: '#ff0080',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff'
    },
    fonts: {
      primary: 'Orbitron, sans-serif',
      secondary: 'Orbitron, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    shadows: {
      sm: '0 0 10px rgb(255 0 128 / 0.5)',
      md: '0 0 20px rgb(255 0 128 / 0.6)',
      lg: '0 0 30px rgb(255 0 128 / 0.7)',
      xl: '0 0 40px rgb(255 0 128 / 0.8)'
    }
  }
};

// Theme Provider
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [customThemes, setCustomThemes] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    const savedCustomThemes = localStorage.getItem('customThemes');
    
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }
    
    if (savedCustomThemes) {
      setCustomThemes(JSON.parse(savedCustomThemes));
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const theme = getCurrentTheme();
    applyThemeToDocument(theme);
  }, [currentTheme, customThemes]);

  const getCurrentTheme = () => {
    if (customThemes[currentTheme]) {
      return customThemes[currentTheme];
    }
    return predefinedThemes[currentTheme] || predefinedThemes.default;
  };

  const applyThemeToDocument = (theme) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    // Apply fonts
    root.style.setProperty('--font-primary', theme.fonts.primary);
    root.style.setProperty('--font-secondary', theme.fonts.secondary);
    root.style.setProperty('--font-mono', theme.fonts.mono);
  };

  const changeTheme = async (themeName) => {
    if (themeName === currentTheme) return;
    
    setIsTransitioning(true);
    
    // Add transition delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setCurrentTheme(themeName);
    localStorage.setItem('selectedTheme', themeName);
    
    setIsTransitioning(false);
  };

  const createCustomTheme = (themeName, themeData) => {
    const newTheme = {
      ...themeData,
      name: themeName,
      isCustom: true
    };
    
    setCustomThemes(prev => ({
      ...prev,
      [themeName]: newTheme
    }));
    
    localStorage.setItem('customThemes', JSON.stringify({
      ...customThemes,
      [themeName]: newTheme
    }));
  };

  const updateCustomTheme = (themeName, updates) => {
    setCustomThemes(prev => ({
      ...prev,
      [themeName]: {
        ...prev[themeName],
        ...updates
      }
    }));
    
    localStorage.setItem('customThemes', JSON.stringify({
      ...customThemes,
      [themeName]: {
        ...customThemes[themeName],
        ...updates
      }
    }));
  };

  const deleteCustomTheme = (themeName) => {
    setCustomThemes(prev => {
      const newThemes = { ...prev };
      delete newThemes[themeName];
      return newThemes;
    });
    
    const newCustomThemes = { ...customThemes };
    delete newCustomThemes[themeName];
    localStorage.setItem('customThemes', JSON.stringify(newCustomThemes));
    
    if (currentTheme === themeName) {
      changeTheme('default');
    }
  };

  const getAllThemes = () => {
    return {
      ...predefinedThemes,
      ...customThemes
    };
  };

  const value = {
    currentTheme,
    theme: getCurrentTheme(),
    changeTheme,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    getAllThemes,
    isTransitioning
  };

  return (
    <ThemeContext.Provider value={value}>
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-white text-xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              🎨
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Selector Component
export const ThemeSelector = ({ className = '' }) => {
  const { currentTheme, changeTheme, getAllThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = getAllThemes();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-opacity-80 transition-colors"
      >
        <span className="text-sm font-medium text-text">🎨</span>
        <span className="text-sm text-text">{themes[currentTheme]?.name || 'Theme'}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              <div className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-2">
                Predefined Themes
              </div>
              {Object.entries(themes).map(([key, theme]) => {
                if (theme.isCustom) return null;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      changeTheme(key);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      currentTheme === key
                        ? 'bg-primary text-white'
                        : 'text-text hover:bg-opacity-10 hover:bg-primary'
                    }`}
                  >
                    {theme.name}
                  </button>
                );
              })}
              
              {Object.values(themes).some(theme => theme.isCustom) && (
                <>
                  <div className="border-t border-border my-2"></div>
                  <div className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-2">
                    Custom Themes
                  </div>
                  {Object.entries(themes).map(([key, theme]) => {
                    if (!theme.isCustom) return null;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          changeTheme(key);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          currentTheme === key
                            ? 'bg-primary text-white'
                            : 'text-text hover:bg-opacity-10 hover:bg-primary'
                        }`}
                      >
                        {theme.name}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Theme Editor Component
export const ThemeEditor = ({ className = '' }) => {
  const { createCustomTheme, updateCustomTheme, currentTheme, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [editingTheme, setEditingTheme] = useState({ ...theme });

  const handleSave = () => {
    if (themeName.trim()) {
      createCustomTheme(themeName, editingTheme);
      setThemeName('');
      setIsOpen(false);
    }
  };

  const updateColor = (colorKey, value) => {
    setEditingTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  const updateFont = (fontKey, value) => {
    setEditingTheme(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [fontKey]: value
      }
    }));
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-opacity-80 transition-colors"
      >
        <span>🎨</span>
        <span>Customize Theme</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-surface border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text">Theme Editor</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-textSecondary hover:text-text"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-text"
                      placeholder="Enter theme name"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-text mb-4">Colors</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(editingTheme.colors).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-text mb-1">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => updateColor(key, e.target.value)}
                              className="w-8 h-8 border border-border rounded"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateColor(key, e.target.value)}
                              className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background text-text"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-text mb-4">Fonts</h3>
                    <div className="space-y-3">
                      {Object.entries(editingTheme.fonts).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-text mb-1">
                            {key.charAt(0).toUpperCase() + key.slice(1)} Font
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateFont(key, e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-text"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-textSecondary hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-80 transition-colors"
                  >
                    Save Theme
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Themed Component Wrapper
export const ThemedComponent = ({ children, className = '' }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      className={className}
      style={{
        '--theme-primary': theme.colors.primary,
        '--theme-secondary': theme.colors.secondary,
        '--theme-accent': theme.colors.accent,
        '--theme-background': theme.colors.background,
        '--theme-surface': theme.colors.surface,
        '--theme-text': theme.colors.text,
        '--theme-text-secondary': theme.colors.textSecondary,
        '--theme-border': theme.colors.border
      }}
    >
      {children}
    </div>
  );
};

export default {
  ThemeProvider,
  useTheme,
  ThemeSelector,
  ThemeEditor,
  ThemedComponent,
  predefinedThemes
};
