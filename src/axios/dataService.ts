import axios from 'axios';
import store from '../lib/store';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== 'undefined') {
    // When served over HTTPS, any HTTP URL causes browser (blocked:mixed-content).
    // Automatically use relative '/api' so requests are secure and routed through reverse proxy.
    if (window.location.protocol === 'https:') {
      if (!envUrl || envUrl.startsWith('http://')) {
        return '/api';
      }
    }
    // When hosted on a domain (like erp.postilio.tech), use relative '/api' if envUrl points to localhost/http
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (!envUrl || envUrl.includes('localhost') || envUrl.startsWith('http://')) {
        return '/api';
      }
    }
  }
  return envUrl ? envUrl.replace(/\/+$/, '') : "http://localhost:8000/api";
};

const API_BASE_URL = getApiBaseUrl();

const dataService = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

dataService.interceptors.request.use(function (config) {
  let token: string | null = null;

  try {
    const state: any = store.getState();
    token = state?.base?.token || null;
  } catch (e) {
    // ignore
  }

  if (!token) {
    token = localStorage.getItem('token');
  }

  if (!token) {
    try {
      const persistedRoot = localStorage.getItem('persist:root');
      if (persistedRoot) {
        const parsed = JSON.parse(persistedRoot);
        if (parsed.base) {
          const parsedBase = JSON.parse(parsed.base);
          token = parsedBase.token || null;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

// Automatic redirect to maintenance page on 503 Service Unavailable
dataService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503 || error.response?.data?.maintenance) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('maintenance.html')) {
        window.location.href = '/maintenance.html';
      }
    }
    return Promise.reject(error);
  }
);

export default dataService;
