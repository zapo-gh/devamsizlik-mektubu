import axios from 'axios';

const isTauri = Boolean(
  (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) ||
  (typeof window !== 'undefined' && (window.location.protocol === 'tauri:' || window.location.hostname === 'tauri.localhost'))
);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isTauri ? 'http://127.0.0.1:4000/api' : '/api'),
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Only retry idempotent requests automatically. Retrying POST/PUT/PATCH/DELETE
// after a transient network error can duplicate a write operation (e.g. send a
// WhatsApp message twice or create the same warning twice).
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status: number | undefined = error.response?.status;

    if (!config) return Promise.reject(error);

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    const method = String(config.method || 'get').toLowerCase();
    const isRetryableStatus = !status || status === 502 || status === 503 || status === 504;
    const canRetry = RETRYABLE_METHODS.has(method);
    const retryCount: number = config._retryCount ?? 0;

    if (canRetry && isRetryableStatus && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * config._retryCount));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
