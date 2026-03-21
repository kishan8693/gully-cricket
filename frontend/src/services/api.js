import axios from 'axios';

const api = axios.create({
  baseURL: "https://gully-cricket-q377.vercel.app/api",
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
