import axios from 'axios';
import store from '../lib/store';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";

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

export default dataService;
