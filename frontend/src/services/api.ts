import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Render uyku modundan uyanma: 502/503/504 hatalarında otomatik yeniden dene
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status: number | undefined = error.response?.status;

    // 401 → token sil ve yönlendir
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 502 / 503 / 504 → servis uyanıyor, yeniden dene
    const isRetryable = !status || status === 502 || status === 503 || status === 504;
    const retryCount: number = config._retryCount ?? 0;

    if (isRetryable && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * config._retryCount));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
