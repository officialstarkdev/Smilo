import axios from 'axios';

// VITE_API_URL is optional. Without it, requests go to /api and Vite proxies them to the server.
// Accepts "https://host", "https://host/" or "https://host/api".
function apiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return '/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

// Generous timeout: a sleeping free-tier API host can take ~50s to wake up.
const api = axios.create({ baseURL: apiBase(), timeout: 60000 });

export const TOKEN_KEY = 'smilo_staff_token';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.code === 'ECONNABORTED' || err?.message === 'Network Error') {
    return 'We can’t reach the booking system right now. Check your connection, or call us.';
  }
  return err?.response?.data?.message || fallback;
};

/** Field-level errors from a 400 response, e.g. { email: '…' }. */
export const fieldErrors = (err) => err?.response?.data?.errors || {};

export default api;
