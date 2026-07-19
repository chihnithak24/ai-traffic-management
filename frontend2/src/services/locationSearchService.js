/**
 * locationSearchService.js
 * Calls the maps_backend FastAPI service (free, no Google key).
 * Base URL: /maps-api  (proxied via Vite to http://localhost:8000)
 */
import axios from 'axios';

const mapsApi = axios.create({ baseURL: '/maps-api' });

export const locationSearchService = {
  geocode:         (address)              => mapsApi.get('/geocode',      { params: { address } }).then(r => r.data),
  trafficInfo:     (address, destination) => mapsApi.get('/traffic-info', { params: { address, ...(destination ? { destination } : {}) } }).then(r => r.data),
  autocomplete:    (input)                => mapsApi.get('/autocomplete', { params: { input } }).then(r => r.data),

  // NEW endpoints
  nearbyPois:      (lat, lng, radius = 1500)  => mapsApi.get('/nearby-pois',      { params: { lat, lng, radius } }).then(r => r.data),
  tollInfo:        (lat, lng, radius = 10000) => mapsApi.get('/toll-info',         { params: { lat, lng, radius } }).then(r => r.data),
  accidentHistory: (lat, lng, radius = 2000)  => mapsApi.get('/accident-history',  { params: { lat, lng, radius } }).then(r => r.data),
  roadConditions:  (lat, lng, radius = 3000)  => mapsApi.get('/road-conditions',   { params: { lat, lng, radius } }).then(r => r.data),
  aiSuggestions:   (lat, lng, congestion_level, congestion_pct, weather_note) =>
    mapsApi.get('/ai-suggestions', { params: { lat, lng, congestion_level, congestion_pct, weather_note } }).then(r => r.data),
  heatmapData:     (lat, lng, radius = 2000)  => mapsApi.get('/heatmap-data',      { params: { lat, lng, radius } }).then(r => r.data),
  reportIncident:  (payload)                  => mapsApi.post('/report-incident',  payload).then(r => r.data),
  reportedIncidents: (lat, lng, radius = 5)   => mapsApi.get('/reported-incidents',{ params: { lat, lng, radius } }).then(r => r.data),
};
