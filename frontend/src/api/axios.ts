import axios from 'axios';

// Configurable API base URL supporting VITE_API_BASE_URL and VITE_API_URL with environment-aware fallback
const getApiBaseUrl = (): string => {
  const envUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined);
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  return import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized for expired/revoked sessions on protected requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      // Clear stored authentication state
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Avoid redirect loops if already on the login route
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
