import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Store for handling auth redirects
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// Request interceptor - Add auth token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Call the registered handler (usually from React Router)
      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // You could show a toast notification here
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      console.error('Too many requests - rate limited');
      // You could show a toast notification here
    }

    return Promise.reject(error);
  }
);

export default api;
