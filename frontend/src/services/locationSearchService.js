/**
 * locationSearchService.js
 * Calls the FastAPI maps_backend for geocoding, traffic info, and autocomplete.
 * Base URL: /maps-api  (proxied via vite to http://localhost:8000)
 */
import axios from 'axios';

const mapsApi = axios.create({ baseURL: '/maps-api' });

export const locationSearchService = {
  /**
   * Geocode an address → { place_name, lat, lng, formatted_address }
   */
  geocode: (address) =>
    mapsApi.get('/geocode', { params: { address } }).then(r => r.data),

  /**
   * Full traffic info: geocode + routes + congestion status
   */
  trafficInfo: (address, destination = null) =>
    mapsApi.get('/traffic-info', {
      params: { address, ...(destination ? { destination } : {}) }
    }).then(r => r.data),

  /**
   * Places autocomplete suggestions
   */
  autocomplete: (input) =>
    mapsApi.get('/autocomplete', { params: { input } }).then(r => r.data),
};
