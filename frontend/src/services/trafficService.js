/**
 * trafficService.js - Traffic CRUD API calls
 */
import api from './api';

export const trafficService = {
  getAll: (params) => api.get('/traffic', { params }).then(r => r.data),
  getById: (id) => api.get(`/traffic/${id}`).then(r => r.data),
  create: (data) => api.post('/traffic', data).then(r => r.data),
  update: (id, data) => api.put(`/traffic/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/traffic/${id}`).then(r => r.data),
  toggleEmergency: (id) => api.put(`/traffic/${id}/emergency`).then(r => r.data),
  simulate: (preset) => api.post('/traffic/simulate', { preset }).then(r => r.data)
};

export const dashboardService = {
  getStats: () => api.get('/dashboard').then(r => r.data)
};

export const predictService = {
  predict: (data) => api.post('/predict', data).then(r => r.data),
  bulkPredict: () => api.get('/predict/bulk').then(r => r.data),
  liveRoads: () => api.get('/predict/live-roads').then(r => r.data)
};

export const aiReportService = {
  getReport: () => api.get('/ai-report').then(r => r.data)
};

export const alertService = {
  getAlerts: () => api.get('/alerts').then(r => r.data)
};

export const incidentService = {
  getAll:  (params) => api.get('/incidents', { params }).then(r => r.data),
  create:  (data)   => api.post('/incidents', data).then(r => r.data),
  update:  (id, data) => api.put(`/incidents/${id}`, data).then(r => r.data),
  remove:  (id)     => api.delete(`/incidents/${id}`).then(r => r.data),
};
