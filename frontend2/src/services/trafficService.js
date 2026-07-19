import api from './api';

export const authSvc = {
  login:    d => api.post('/auth/login', d).then(r => r.data),
  register: d => api.post('/auth/register', d).then(r => r.data),
  me:       () => api.get('/auth/me').then(r => r.data),
};

export const trafficSvc = {
  getAll:          p => api.get('/traffic', { params: p }).then(r => r.data),
  getOne:          id => api.get(`/traffic/${id}`).then(r => r.data),
  create:          d => api.post('/traffic', d).then(r => r.data),
  update:          (id, d) => api.put(`/traffic/${id}`, d).then(r => r.data),
  remove:          id => api.delete(`/traffic/${id}`).then(r => r.data),
  toggleEmergency: (id, d) => api.put(`/traffic/${id}/emergency`, d).then(r => r.data),
};

export const dashboardSvc = {
  getStats: () => api.get('/dashboard').then(r => r.data),
};

export const predictSvc = {
  predict:  d => api.post('/predict', d).then(r => r.data),
  bulk:     () => api.get('/predict/bulk').then(r => r.data),
  history:  () => api.get('/predict/history').then(r => r.data),
};

export const notifSvc = {
  getAll:   p => api.get('/notifications', { params: p }).then(r => r.data),
  markRead: () => api.put('/notifications/mark-read').then(r => r.data),
  clear:    () => api.delete('/notifications').then(r => r.data),
};

export const incidentSvc = {
  getAll:  p  => api.get('/incidents', { params: p }).then(r => r.data),
  create:  d  => api.post('/incidents', d).then(r => r.data),
  update:  (id, d) => api.put(`/incidents/${id}`, d).then(r => r.data),
  remove:  id => api.delete(`/incidents/${id}`).then(r => r.data),
};
