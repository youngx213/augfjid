import axios from 'axios';
import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

// Base API configuration
const API_BASE_URL = Config.API_BASE_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request timestamp
        config.metadata = { startTime: new Date() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = new Date() - response.config.metadata.startTime;
        console.log(`API Request: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);

        return response;
      },
      async (error) => {
        const { config, response } = error;

        // Handle network errors
        if (!response) {
          const networkState = await NetInfo.fetch();
          if (!networkState.isConnected) {
            Alert.alert(
              'No Internet Connection',
              'Please check your internet connection and try again.',
              [{ text: 'OK' }]
            );
            return Promise.reject(new Error('No internet connection'));
          }
        }

        // Handle HTTP errors
        if (response) {
          switch (response.status) {
            case 401:
              // Unauthorized - clear auth and redirect to login
              this.clearAuthToken();
              Alert.alert(
                'Session Expired',
                'Your session has expired. Please log in again.',
                [{ text: 'OK' }]
              );
              break;
            case 403:
              Alert.alert(
                'Access Denied',
                'You do not have permission to perform this action.',
                [{ text: 'OK' }]
              );
              break;
            case 404:
              Alert.alert(
                'Not Found',
                'The requested resource was not found.',
                [{ text: 'OK' }]
              );
              break;
            case 500:
              Alert.alert(
                'Server Error',
                'An internal server error occurred. Please try again later.',
                [{ text: 'OK' }]
              );
              break;
            default:
              Alert.alert(
                'Error',
                response.data?.error || 'An unexpected error occurred.',
                [{ text: 'OK' }]
              );
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  // Generic request methods
  async get(url, params = {}) {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post(url, data = {}) {
    try {
      const response = await this.api.post(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put(url, data = {}) {
    try {
      const response = await this.api.put(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(url) {
    try {
      const response = await this.api.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch(url, data = {}) {
    try {
      const response = await this.api.patch(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // File upload
  async upload(url, formData, onProgress = null) {
    try {
      const response = await this.api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // File download
  async download(url, filename) {
    try {
      const response = await this.api.get(url, {
        responseType: 'blob',
      });
      
      // Handle file download in React Native
      // This would typically use react-native-fs or similar
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.error || error.message,
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.get('/api/health');
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get server info
  async getServerInfo() {
    try {
      const response = await this.get('/api/info');
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();
