import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Services
import { authService } from '../services/authService';
import { apiService } from '../services/apiService';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login(credentials);
          
          if (response.success) {
            const { user, token } = response;
            
            // Store token securely
            await Keychain.setInternetCredentials(
              'tiktok-bot-token',
              user.id,
              token
            );
            
            // Set auth state
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // Set API token
            apiService.setAuthToken(token);
            
            return { success: true, user };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Login failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            isLoading: false,
            error: error.message || 'Login failed',
          });
          return { success: false, error: error.message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.register(userData);
          
          if (response.success) {
            const { user, token } = response;
            
            // Store token securely
            await Keychain.setInternetCredentials(
              'tiktok-bot-token',
              user.id,
              token
            );
            
            // Set auth state
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // Set API token
            apiService.setAuthToken(token);
            
            return { success: true, user };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Registration failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          console.error('Registration error:', error);
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try {
          // Clear secure storage
          await Keychain.resetInternetCredentials('tiktok-bot-token');
          
          // Clear API token
          apiService.clearAuthToken();
          
          // Reset state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error) {
          console.error('Logout error:', error);
          return { success: false, error: error.message };
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        
        try {
          // Try to get stored credentials
          const credentials = await Keychain.getInternetCredentials('tiktok-bot-token');
          
          if (credentials && credentials.password) {
            const token = credentials.password;
            const userId = credentials.username;
            
            // Verify token with server
            const response = await authService.verifyToken(token);
            
            if (response.success) {
              // Set auth state
              set({
                user: response.user,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              
              // Set API token
              apiService.setAuthToken(token);
              
              return { success: true };
            } else {
              // Token is invalid, clear it
              await Keychain.resetInternetCredentials('tiktok-bot-token');
            }
          }
          
          // No valid token found
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          return { success: false };
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.updateProfile(profileData);
          
          if (response.success) {
            set({
              user: { ...get().user, ...response.user },
              isLoading: false,
              error: null,
            });
            return { success: true, user: response.user };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Profile update failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          console.error('Profile update error:', error);
          set({
            isLoading: false,
            error: error.message || 'Profile update failed',
          });
          return { success: false, error: error.message };
        }
      },

      changePassword: async (passwordData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.changePassword(passwordData);
          
          if (response.success) {
            set({
              isLoading: false,
              error: null,
            });
            return { success: true };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Password change failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          console.error('Password change error:', error);
          set({
            isLoading: false,
            error: error.message || 'Password change failed',
          });
          return { success: false, error: error.message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.forgotPassword(email);
          
          set({
            isLoading: false,
            error: response.success ? null : response.error,
          });
          
          return response;
        } catch (error) {
          console.error('Forgot password error:', error);
          set({
            isLoading: false,
            error: error.message || 'Forgot password failed',
          });
          return { success: false, error: error.message };
        }
      },

      resetPassword: async (resetData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.resetPassword(resetData);
          
          set({
            isLoading: false,
            error: response.success ? null : response.error,
          });
          
          return response;
        } catch (error) {
          console.error('Reset password error:', error);
          set({
            isLoading: false,
            error: error.message || 'Reset password failed',
          });
          return { success: false, error: error.message };
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      getUser: () => get().user,
      getToken: () => get().token,
      getIsAuthenticated: () => get().isAuthenticated,
      getIsLoading: () => get().isLoading,
      getError: () => get().error,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
