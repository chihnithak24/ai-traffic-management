import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('traffic_token_v2');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('traffic_token_v2');
      localStorage.removeItem('traffic_user_v2');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
