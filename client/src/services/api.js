import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Dynamically determine host IP for local network device access
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token || localStorage.getItem('satkar_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauth logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
