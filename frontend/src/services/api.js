import axios from 'axios';
import { API_CONFIG, TOKEN_KEY } from './config';
import { getTenantIdentifier } from '../utils/tenancy';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token and tenant info
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant identifier
    const tenant = getTenantIdentifier();
    if (tenant) {
      if (tenant.type === 'domain') {
        config.headers['X-School-Domain'] = tenant.value;
      } else if (tenant.type === 'id') {
        config.headers['X-School-Id'] = tenant.value;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      const customError = {
        status: error.response.status,
        message: error.response.data.message || 'An error occurred',
        data: error.response.data,
      };
      return Promise.reject(customError);
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        data: null,
      });
    } else {
      // Something else happened
      return Promise.reject({
        status: 0,
        message: error.message || 'An unexpected error occurred',
        data: null,
      });
    }
  }
);

// Auth service
export const authService = {
  // Login
  async login(email, password) {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, {
      email,
      password,
    });
    const token = response.data.token || response.data.access_token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    return response.data;
  },

  // Register
  async register(userData) {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.REGISTER,
      userData
    );
    return response.data;
  },

  // Get profile
  async getProfile() {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.PROFILE);
    return response.data;
  },

  // Logout
  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Get token
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Check if authenticated
  isAuthenticated() {
    return !!this.getToken();
  },
};

export default apiClient;
