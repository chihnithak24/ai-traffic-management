/**
 * LocationSearch.jsx
 * Full Google Maps + Location Search module for the Smart Traffic Dashboard.
 *
 * Features:
 *  - Search bar with autocomplete (Google Places)
 *  - Geocode input → lat/lng via FastAPI
 *  - Google Maps JS API with Traffic Layer
 *  - Marker on searched location
 *  - Traffic status card (Low / Medium / High)
 *  - Alternate routes with travel times
 *  - Nearby roads / intersections list
 *
 * Props:
 *  apiKey  {string}  Google Maps JS API key (passed from parent)
 *  onLocationFound  {function}  Optional callback({ lat, lng, address })
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { locationSearchService } from '../../services/locationSearchService';
import './LocationSearch.css';

// ── Traffic status pill ───────────────────────────────────────────────────────
const TrafficBadge = ({ status, color }) => {
  const cls =
    status === 'Low'    ? 'ts-badge ts-low'    :
    status === 'Medium' ? 'ts-badge ts-medium' :
                          'ts-badge ts-high';
  return (
    <span className={cls} style={{ '--ts-color': color }}>
      {status === 'Low' ? '🟢' : status === 'Medium' ? '🟡' : '🔴'} {status} Traffic
    </span>
  );
};

// ── Single route card ─────────────────────────────────────────────────────────
const RouteCard = ({ route, index }) => (
  <div className={`route-card ${route.is_recommended ? 'route-recommended' : ''}`}>
    <div className="route-header">
      <span className="route-index">Route {index + 1}</span>
      <span className="route-summary">{route.summary}</span>
      {route.is_recommended && <span className="route-tag">✅ Best</span>}
    </div>
    <div className="route-meta">
      <span>📏 {route.distance}</span>
      <span>🕐 {route.duration}</span>
      {route.duration_in_traffic && (
        <span className="route-traffic-time">🚗 {route.duration_in_traffic} (with traffic)</span>
      )}
    </div>
    {route.steps?.length > 0 && (
      <ol className="route-steps">
        {route.steps.slice(0, 4).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const LocationSearch = ({ apiKey, onLocationFound }) => {
  const [query, setQuery]             = useState('');
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);   // TrafficInfoResponse
  const [error, setError]             = useState('');
  const [mapReady, setMapReady]       = useState(false);
  const [showRoutes, setShowRoutes]   = useState(false);

  const mapRef        = useRef(null);   // DOM div
  const googleMapRef  = useRef(null);   // google.maps.Map instance
  const markerRef     = useRef(null);   // current marker
  const trafficRef    = useRef(null);   // TrafficLayer instance
  const autocompleteTimer = useRef(null);

  // ── Load Google Maps JS SDK ─────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) { setMapReady(true); return; }

    const scriptId = 'gmap-sdk';
    if (document.getElementById(scriptId)) {
      // already injected — wait for callback
      window.__gmapCallback = () => setMapReady(true);
      return;
    }

    window.__gmapCallback = () => setMapReady(true);

    const script    = document.createElement('script');
    script.id       = scriptId;
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapCallback`;
    script.async    = true;
    script.defer    = true;
    document.head.appendChild(script);

    return () => { delete window.__gmapCallback; };
  }, [apiKey]);

  // ── Init Google Map once SDK is ready ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || googleMapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center:           { lat: 20.5937, lng: 78.9629 },
      zoom:             5,
      mapTypeId:        'roadmap',
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl:   false,
    });

    // Traffic Layer
    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    trafficRef.current   = trafficLayer;
    googleMapRef.current = map;
  }, [mapReady]);

  // ── Autocomplete suggestions ─────────────────────────────────────────────────
  const handleQueryChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setError('');

    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (val.length < 2) { setSuggestions([]); return; }

    autocompleteTimer.current = setTimeout(async () => {
      try {
        const data = await locationSearchService.autocomplete(val);
        setSuggestions(data.predictions || []);
      } catch { setSuggestions([]); }
    }, 350);
  }, []);

  const selectSuggestion = (desc) => {
    setQuery(desc);
    setSuggestions([]);
  };

  // ── Search handler ───────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setSuggestions([]);
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const data = await locationSearchService.trafficInfo(
        query.trim(),
        destination.trim() || null
      );
      setResult(data);

      // Pan & zoom map
      if (googleMapRef.current) {
        const pos = { lat: data.location.lat, lng: data.location.lng };
        googleMapRef.current.setCenter(pos);
        googleMapRef.current.setZoom(14);

        // Remove previous marker
        if (markerRef.current) markerRef.current.setMap(null);

        // New marker with info window
        const infoContent = `
          <div style="font-family:system-ui,sans-serif;padding:4px 6px;min-width:180px">
            <strong style="font-size:13px">${data.location.formatted_address}</strong><br/>
            <span style="color:${data.traffic_status.color};font-weight:600">${data.traffic_status.status} Traffic</span><br/>
            <small style="color:#666">${data.traffic_status.description}</small>
          </div>`;

        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
        const marker     = new window.google.maps.Marker({
          position: pos,
          map:      googleMapRef.current,
          title:    data.location.formatted_address,
          animation: window.google.maps.Animation.DROP,
        });
        marker.addListener('click', () => infoWindow.open(googleMapRef.current, marker));
        infoWindow.open(googleMapRef.current, marker);
        markerRef.current = marker;
      }

      onLocationFound?.({ lat: data.location.lat, lng: data.location.lng, address: data.location.formatted_address });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Location not found. Please try another search.');
    } finally {
      setLoading(false);
    }
  }, [query, destination, onLocationFound]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="ls-root">
      {/* Search Panel */}
      <div className="ls-panel">
        <div className="ls-panel-header">
          <span className="ls-panel-icon">🔍</span>
          <div>
            <h3 className="ls-panel-title">Location Search</h3>
            <p className="ls-panel-sub">Search any city, area, or junction</p>
          </div>
        </div>

        <form className="ls-form" onSubmit={handleSearch}>
          {/* Origin */}
          <div className="ls-field-wrap">
            <div className="ls-input-row">
              <span className="ls-input-icon">📍</span>
              <input
                className="ls-input"
                type="text"
                placeholder="Enter city, area, or junction…"
                value={query}
                onChange={handleQueryChange}
                autoComplete="off"
              />
              {query && (
                <button type="button" className="ls-clear" onClick={() => { setQuery(''); setSuggestions([]); setResult(null); }}>✕</button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <ul className="ls-suggestions">
                {suggestions.map((s) => (
                  <li key={s.place_id} className="ls-suggestion-item" onClick={() => selectSuggestion(s.description)}>
                    <span className="ls-sug-icon">📌</span>
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Optional destination */}
          <div className="ls-input-row">
            <span className="ls-input-icon">🏁</span>
            <input
              className="ls-input"
              type="text"
              placeholder="Destination (optional) for route info…"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              autoComplete="off"
            />
          </div>

          <button type="submit" className="ls-btn-search" disabled={loading || !query.trim()}>
            {loading ? <><span className="ls-spinner" /> Searching…</> : '🔍 Search Location'}
          </button>
        </form>

        {error && (
          <div className="ls-error">
            ⚠️ {error}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && (
          <div className="ls-results">
            {/* Location found */}
            <div className="ls-location-card">
              <div className="ls-loc-header">
                <span className="ls-loc-icon">📍</span>
                <div>
                  <div className="ls-loc-name">{result.location.formatted_address}</div>
                  <div className="ls-loc-coords">{result.location.lat.toFixed(5)}, {result.location.lng.toFixed(5)}</div>
                </div>
              </div>
              <TrafficBadge status={result.traffic_status.status} color={result.traffic_status.color} />
              <p className="ls-traffic-desc">{result.traffic_status.description}</p>
            </div>

            {/* Nearby roads */}
            {result.nearby_roads?.length > 0 && (
              <div className="ls-section">
                <h4 className="ls-section-title">🛣️ Nearby Roads &amp; Intersections</h4>
                <ul className="ls-roads-list">
                  {result.nearby_roads.map((r, i) => (
                    <li key={i} className="ls-road-item">
                      <span className="ls-road-dot" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Routes */}
            {result.routes?.length > 0 && (
              <div className="ls-section">
                <button className="ls-section-toggle" onClick={() => setShowRoutes(v => !v)}>
                  🗺️ Alternate Routes ({result.routes.length}) {showRoutes ? '▲' : '▼'}
                </button>
                {showRoutes && (
                  <div className="ls-routes-list">
                    {result.routes.map((r, i) => <RouteCard key={i} route={r} index={i} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="ls-map-container">
        {!apiKey && (
          <div className="ls-map-placeholder">
            <span className="ls-map-ph-icon">🗺️</span>
            <p className="ls-map-ph-title">Google Maps API Key Required</p>
            <p className="ls-map-ph-sub">Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file to enable the live map.</p>
          </div>
        )}
        <div
          ref={mapRef}
          className="ls-gmap"
          style={{ display: apiKey ? 'block' : 'none' }}
        />
        {/* Traffic layer legend */}
        <div className="ls-map-legend">
          <span>🚦 Live Traffic Layer Active</span>
          <div className="ls-tl-legend">
            <span style={{ background: '#5cb85c' }} />Free flow
            <span style={{ background: '#f0ad4e' }} />Moderate
            <span style={{ background: '#d9534f' }} />Heavy
            <span style={{ background: '#8b0000' }} />Standstill
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSearch;
