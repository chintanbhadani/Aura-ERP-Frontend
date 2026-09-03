import axios from 'axios';
import store from '../store';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000/api";

const dataService = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer `
  }
});

dataService.interceptors.request.use(function (config) {
  const { base } = store.getState();

  const token = base.token ? `Bearer ${base.token}` : null;

  config.headers.Authorization = token ? token : '';
  return config;
});

export default dataService;
