import axios from 'axios';

const api = axios.create({
<<<<<<< HEAD
  // In production, set VITE_API_BASE_URL (e.g. https://your-backend.onrender.com/api)
  // so that existing calls like api.get('/teams') become:
  //   <VITE_API_BASE_URL>/teams
  baseURL: "https://gully-cricket-q377.vercel.app/api",
=======
  // Local dev: use '/api' so Vite proxies to the backend (same origin → no CORS).
  // Production: set VITE_API_BASE_URL (e.g. https://your-api.vercel.app/api) on Netlify.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
>>>>>>> 7f053a6 (fix: local dev CORS (Vite proxy, api baseURL); allow localhost in CORS; mobile UI tweaks; netlify.toml)
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const reqUrl = err.config?.url || '';
    const isAuthAttempt = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register');
    // Keep user on page for login/register validation errors (401/400),
    // only force redirect for protected-resource auth failures.
    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
