/**
 * Predict.jsx - AI Traffic Prediction Page
 * Simulates AI analysis for traffic congestion
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { predictService, trafficService } from '../services/trafficService';
import { toast } from 'react-toastify';
import './Predict.css';

const ConfidenceMeter = ({ score }) => (
  <div className="confidence-meter">
    <div className="cm-track">
      <div className="cm-fill" style={{ width: `${score}%` }} />
    </div>
    <span className="cm-label">{score}% Confidence</span>
  </div>
);

const PredictionCard = ({ area, vehicleCount, prediction, onClose }) => {
  if (!prediction) return null;
  const { estimatedCongestion, recommendedSignalDuration, estimatedWaitingTime, suggestedRoute, confidenceScore, alternateRoutes, emergencyRoute, densityAnalysis } = prediction;

  const levelColor = estimatedCongestion === 'High' ? '#ef4444' : estimatedCongestion === 'Medium' ? '#f59e0b' : '#22c55e';
  const levelIcon  = estimatedCongestion === 'High' ? '🔴' : estimatedCongestion === 'Medium' ? '🟡' : '🟢';

  return (
    <div className="prediction-card">
      <div className="pred-card-header" style={{ borderColor: levelColor }}>
        <div className="pred-title">
          <span className="pred-icon">🤖</span>
          <div>
            <h3 className="pred-area">{area}</h3>
            <p className="pred-sub">{vehicleCount} vehicles detected</p>
          </div>
        </div>
        <span className="pred-level" style={{ color: levelColor, background: `${levelColor}18` }}>
          {levelIcon} {estimatedCongestion}
        </span>
        {onClose && <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>}
      </div>

      <div className="pred-metrics">
        <div className="pred-metric">
          <span className="pm-icon">⏱️</span>
          <div>
            <span className="pm-value">{recommendedSignalDuration}s</span>
            <span className="pm-label">Signal Duration</span>
          </div>
        </div>
        <div className="pred-metric">
          <span className="pm-icon">⌛</span>
          <div>
            <span className="pm-value">{estimatedWaitingTime}s</span>
            <span className="pm-label">Waiting Time</span>
          </div>
        </div>
        <div className="pred-metric">
          <span className="pm-icon">📊</span>
          <div>
            <span className="pm-value" style={{ color: levelColor }}>{estimatedCongestion}</span>
            <span className="pm-label">Congestion</span>
          </div>
        </div>
      </div>

      <div className="pred-route">
        <span className="route-icon">🛣️</span>
        <p>{suggestedRoute}</p>
      </div>

      {alternateRoutes?.length > 0 && (
        <div className="pred-alt-routes">
          <p className="alt-routes-title">🔀 Alternate Routes:</p>
          {alternateRoutes.map((r, i) => (
            <div key={i} className="alt-route-item">↪ {r}</div>
          ))}
        </div>
      )}

      {emergencyRoute && (
        <div className="pred-emergency-route">
          <span>🚨</span>
          <p>{emergencyRoute}</p>
        </div>
      )}

      {densityAnalysis && (
        <div className="pred-density">
          <p className="density-title">🚘 Vehicle Type Breakdown:</p>
          <div className="density-grid">
            {Object.entries(densityAnalysis).map(([type, count]) => (
              <span key={type} className="density-item"><strong>{count}</strong> {type}</span>
            ))}
          </div>
        </div>
      )}

      <ConfidenceMeter score={confidenceScore} />
      <p className="pred-timestamp">Analysis at {new Date(prediction.analysisTimestamp).toLocaleTimeString()}</p>
    </div>
  );
};

/* ─── Journey Prediction helpers ─────────────────────────────────────────── */
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM      = 'https://router.project-osrm.org/route/v1/driving';
const ROUTE_COLORS = ['#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6'];

const geocode = async (query) => {
  const r = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } });
  const d = await r.json();
  if (!d.length) throw new Error(`Location not found: ${query}`);
  return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), display: d[0].display_name };
};

const fetchNominatimSuggestions = async (q) => {
  if (q.length < 3) return [];
  const r = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } });
  return r.json();
};

const trafficFactor = () => {
  const h = new Date().getHours();
  if ((h >= 7 && h <= 9) || (h >= 17 && h <= 19)) return 1.6;
  if (h >= 10 && h <= 16) return 1.2;
  return 0.7;
};

const analyzeRoute = (route, index) => {
  const factor = trafficFactor() * (1 + index * 0.18);
  const distKm  = +(route.distance / 1000).toFixed(1);
  const baseMin = Math.round(route.duration / 60);
  const travelMin = Math.round(baseMin * factor);
  const delayMin  = Math.max(0, travelMin - baseMin);
  const vehicleCount = Math.min(Math.round(40 * factor + index * 8), 130);
  const level = vehicleCount < 30 ? 'Low' : vehicleCount <= 70 ? 'Medium' : 'High';
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
  const levelColor = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e';
  const levelIcon  = level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢';
  const avgSpeed = distKm > 0 ? Math.round((distKm / (travelMin / 60)) * 10) / 10 : 0;
  // Congestion % derived deterministically from travelMin vs baseMin — no random
  const delayRatio = baseMin > 0 ? Math.min((travelMin - baseMin) / baseMin, 1) : 0;
  const congestionPct = Math.round(delayRatio * 100);
  // decode OSRM polyline
  const coords = decodePolyline(route.geometry);
  return { index, distKm, travelMin, delayMin, vehicleCount, level, color, levelColor, levelIcon,
           avgSpeed, congestionPct, coords, routeName: `Route ${index + 1}` };
};

// OSRM returns encoded polyline (precision 5)
const decodePolyline = (encoded) => {
  const pts = []; let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
};

const fetchJourneyRoutes = async (origin, destination) => {
  const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
  const url = `${OSRM}/${o.lon},${o.lat};${d.lon},${d.lat}?alternatives=true&geometries=polyline&overview=full`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.code !== 'Ok') throw new Error('No routes found between these locations');
  return { routes: data.routes.map((rt, i) => analyzeRoute(rt, i)), origin: o, destination: d };
};

/* ─── Autocomplete input ──────────────────────────────────────────────────── */
const AutocompleteInput = ({ placeholder, value, onChange, onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const handleChange = (v) => {
    onChange(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const s = await fetchNominatimSuggestions(v);
      setSuggestions(s);
      setOpen(s.length > 0);
    }, 350);
  };

  return (
    <div className="ac-wrap" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} tabIndex={-1}>
      <input className="form-control" placeholder={placeholder} value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)} />
      {open && (
        <div className="ac-dropdown">
          {suggestions.map((s, i) => (
            <div key={i} className="ac-item"
              onMouseDown={() => { onSelect(s.display_name); onChange(s.display_name); setOpen(false); setSuggestions([]); }}>
              <span className="ac-icon">📍</span>
              <span className="ac-text">{s.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Map fit helper ──────────────────────────────────────────────────────── */
const FitBounds = ({ routes }) => {
  const map = useMap();
  useEffect(() => {
    if (!routes?.length) return;
    const all = routes.flatMap(r => r.coords);
    if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [30, 30] });
  }, [routes, map]);
  return null;
};

/* ─── Journey Route Map ───────────────────────────────────────────────────── */
const JourneyRouteMap = ({ routes, origin, destination, selectedIdx, onSelect }) => {
  if (!routes?.length) return null;
  const pinIcon = (color) => L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
  return (
    <div className="journey-map-wrap">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OSM</a>' />
        <FitBounds routes={routes} />
        {routes.map((rt) => (
          <Polyline key={rt.index} positions={rt.coords}
            pathOptions={{ color: rt.color, weight: rt.index === selectedIdx ? 6 : 3,
              opacity: rt.index === selectedIdx ? 1 : 0.55,
              dashArray: rt.index === selectedIdx ? null : '6 4' }}
            eventHandlers={{ click: () => onSelect(rt.index) }}>
            <Popup>{rt.routeName} — {rt.distKm} km · {rt.travelMin} min · {rt.levelIcon} {rt.level}</Popup>
          </Polyline>
        ))}
        {origin && <Marker position={[origin.lat, origin.lon]} icon={pinIcon('#22c55e')}><Popup>🟢 Start: {origin.display.split(',')[0]}</Popup></Marker>}
        {destination && <Marker position={[destination.lat, destination.lon]} icon={pinIcon('#ef4444')}><Popup>🔴 End: {destination.display.split(',')[0]}</Popup></Marker>}
      </MapContainer>
    </div>
  );
};

/* ─── Journey Results ─────────────────────────────────────────────────────── */
const JourneyResults = ({ routes, origin, destination, selectedIdx, onSelect, onClose, lastUpdated }) => {
  const best = routes.reduce((a, b) => a.travelMin <= b.travelMin ? a : b);
  const timeSaved = routes.reduce((max, r) => Math.max(max, r.travelMin - best.travelMin), 0);
  return (
    <div className="journey-results">
      {/* AI Recommendation banner */}
      <div className="jr-recommend">
        <span className="jr-rec-icon">🤖</span>
        <div>
          <p className="jr-rec-title">AI Recommendation: {best.routeName}</p>
          <p className="jr-rec-msg">
            This route has the {best.level.toLowerCase()}est traffic
            {timeSaved > 0 ? ` and will save approximately ${timeSaved} minute${timeSaved > 1 ? 's' : ''} compared to other routes` : ' and is the fastest available option'}.
            Average speed: {best.avgSpeed} km/h · Congestion: {best.congestionPct}%.
          </p>
        </div>
      </div>

      {/* Map */}
      <JourneyRouteMap routes={routes} origin={origin} destination={destination}
        selectedIdx={selectedIdx} onSelect={onSelect} />

      {/* Route cards */}
      <div className="jr-cards">
        {routes.map(rt => (
          <div key={rt.index}
            className={`jr-card${rt.index === selectedIdx ? ' jr-card-active' : ''}${rt.index === best.index ? ' jr-card-best' : ''}`}
            style={{ borderColor: rt.index === selectedIdx ? rt.color : 'var(--border)' }}
            onClick={() => onSelect(rt.index)}>
            <div className="jr-card-top">
              <span className="jr-route-dot" style={{ background: rt.color }} />
              <span className="jr-route-name">{rt.routeName}</span>
              {rt.index === best.index && <span className="jr-best-badge">⭐ Best</span>}
              <span className="jr-level-badge" style={{ color: rt.levelColor, background: `${rt.levelColor}18` }}>
                {rt.levelIcon} {rt.level}
              </span>
            </div>
            <div className="jr-metrics">
              <div className="jr-metric"><span>📏</span><span>{rt.distKm} km</span><small>Distance</small></div>
              <div className="jr-metric"><span>⏱️</span><span>{rt.travelMin} min</span><small>Travel Time</small></div>
              <div className="jr-metric"><span>🚗</span><span>{rt.vehicleCount}</span><small>Vehicles</small></div>
              <div className="jr-metric"><span>⚡</span><span>{rt.avgSpeed} km/h</span><small>Avg Speed</small></div>
              <div className="jr-metric"><span>📊</span><span>{rt.congestionPct}%</span><small>Congestion</small></div>
              <div className="jr-metric"><span>⌛</span><span>+{rt.delayMin} min</span><small>Delay</small></div>
            </div>
            <div className="jr-cbar-track"><div className="jr-cbar-fill" style={{ width: `${rt.congestionPct}%`, background: rt.levelColor }} /></div>
          </div>
        ))}
      </div>

      <div className="jr-footer">
        <span>🕐 Updated: {lastUpdated.toLocaleTimeString()}</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Clear</button>
      </div>
    </div>
  );
};

// Estimate vehicle count from road name using time-of-day + Nominatim place type
// Fully deterministic — no Math.random()
const estimateVehicleCount = async (roadName) => {
  const hour = new Date().getHours();
  let base = 35;
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) base = 80;
  else if (hour >= 10 && hour <= 16) base = 50;
  else if (hour >= 22 || hour <= 5) base = 12;

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(roadName)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await r.json();
    if (data.length > 0) {
      const type = data[0].type || '';
      if (['motorway','trunk','primary'].includes(type)) base = Math.min(base + 30, 120);
      else if (['secondary','tertiary'].includes(type)) base = Math.min(base + 10, 90);
      else if (['residential','living_street'].includes(type)) base = Math.max(base - 15, 5);
    }
  } catch { /* use base */ }

  return base; // deterministic — no variance
};

// Shared classifier — matches backend classifyTraffic() exactly
// Low: vc<50 AND speed>=40 | Medium: vc<=150 AND speed>=20 | High: worst case
const classifyTraffic = (vehicleCount, averageSpeed) => {
  const vc = vehicleCount ?? 0;
  const sp = averageSpeed ?? 40;
  const countClass = vc < 50 ? 0 : vc <= 150 ? 1 : 2;
  const speedClass = sp >= 40 ? 0 : sp >= 20 ? 1 : 2;
  const cls = Math.max(countClass, speedClass);
  return cls === 0 ? 'Low' : cls === 1 ? 'Medium' : 'High';
};

// Derive road analysis from vehicleCount + averageSpeed — no Math.random()
const getRoadAnalysis = (roadName, vehicleCount, averageSpeed = null) => {
  const level = classifyTraffic(vehicleCount, averageSpeed);
  const color = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e';
  const icon  = level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢';
  // Deterministic speed from level thresholds (midpoints)
  const avgSpeed = averageSpeed !== null ? averageSpeed
                 : level === 'High' ? 15 : level === 'Medium' ? 30 : 55;
  const waitingTime = level === 'High' ? Math.round(vehicleCount * 1.2)
                    : level === 'Medium' ? Math.round(vehicleCount * 0.8)
                    : Math.round(vehicleCount * 0.5);
  // Congestion % from vehicle density bands — deterministic
  const congestionPct = level === 'High' ? Math.min(Math.round((vehicleCount / 150) * 100), 99)
                      : level === 'Medium' ? Math.round(30 + ((vehicleCount - 30) / 40) * 30)
                      : Math.round((vehicleCount / 30) * 25);
  return { roadName, vehicleCount, avgSpeed, level, color, icon, waitingTime, congestionPct, lastUpdated: new Date() };
};

const RoadAnalysisResult = ({ data, onClose }) => {
  const { roadName, vehicleCount, level, color, icon, avgSpeed, waitingTime, congestionPct, lastUpdated } = data;
  const metrics = [
    { icon: '🚗', label: 'Est. Vehicle Count', value: vehicleCount, unit: 'vehicles' },
    { icon: '⚡', label: 'Average Speed',       value: avgSpeed,      unit: 'km/h' },
    { icon: '⌛', label: 'Waiting Time',        value: waitingTime,   unit: 'sec' },
    { icon: '📊', label: 'Congestion',          value: `${congestionPct}%`, unit: '' },
  ];
  return (
    <div className="road-analysis-card">
      {/* Road indicator bar */}
      <div className="road-indicator" style={{ background: color }}>
        <span className="road-indicator-icon">🛣️</span>
        <span className="road-indicator-name">{roadName}</span>
        <span className="road-indicator-badge">{icon} {level} Traffic</span>
      </div>

      {/* Status card */}
      <div className="ra-status-card" style={{ borderColor: color, background: `${color}12` }}>
        <div className="ra-status-left">
          <span className="ra-status-icon">{icon}</span>
          <div>
            <p className="ra-status-level" style={{ color }}>{level} Traffic</p>
            <p className="ra-status-road">{roadName}</p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      {/* Metrics grid */}
      <div className="ra-metrics">
        {metrics.map(m => (
          <div key={m.label} className="ra-metric">
            <span className="ra-metric-icon">{m.icon}</span>
            <span className="ra-metric-value">{m.value} <small>{m.unit}</small></span>
            <span className="ra-metric-label">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Congestion bar */}
      <div className="ra-congestion-bar-wrap">
        <div className="ra-congestion-bar-track">
          <div className="ra-congestion-bar-fill" style={{ width: `${congestionPct}%`, background: color }} />
        </div>
        <span className="ra-congestion-bar-label">{congestionPct}% Congestion Level</span>
      </div>

      <p className="ra-last-updated">🕐 Last Updated: {lastUpdated.toLocaleTimeString()}</p>
    </div>
  );
};

// Worldwide fallback locations shown when no DB locations exist
const WORLD_LOCATIONS = [
  // India
  { _id: 'w_mg_road',       areaName: 'MG Road, Bangalore',          vehicleCount: 72 },
  { _id: 'w_connaught',     areaName: 'Connaught Place, Delhi',       vehicleCount: 88 },
  { _id: 'w_marine_drive',  areaName: 'Marine Drive, Mumbai',         vehicleCount: 65 },
  { _id: 'w_anna_salai',    areaName: 'Anna Salai, Chennai',          vehicleCount: 55 },
  { _id: 'w_nh48',          areaName: 'NH-48 Delhi–Gurugram Highway', vehicleCount: 95 },
  { _id: 'w_bandra_worli',  areaName: 'Bandra–Worli Sea Link, Mumbai',vehicleCount: 60 },
  { _id: 'w_outer_ring',    areaName: 'Outer Ring Road, Bangalore',   vehicleCount: 80 },
  { _id: 'w_hyd_hitech',    areaName: 'HITEC City, Hyderabad',        vehicleCount: 70 },
  // USA
  { _id: 'w_times_sq',      areaName: 'Times Square, New York',       vehicleCount: 110 },
  { _id: 'w_i405',          areaName: 'I-405 Freeway, Los Angeles',   vehicleCount: 130 },
  { _id: 'w_lakeshore',     areaName: 'Lake Shore Drive, Chicago',    vehicleCount: 85 },
  { _id: 'w_i95_miami',     areaName: 'I-95 Highway, Miami',          vehicleCount: 100 },
  { _id: 'w_golden_gate',   areaName: 'Golden Gate Bridge, San Francisco', vehicleCount: 75 },
  // Europe
  { _id: 'w_oxford_st',     areaName: 'Oxford Street, London',        vehicleCount: 90 },
  { _id: 'w_champs',        areaName: 'Champs-Élysées, Paris',        vehicleCount: 78 },
  { _id: 'w_autobahn_a9',   areaName: 'Autobahn A9, Munich',          vehicleCount: 115 },
  { _id: 'w_gran_via',      areaName: 'Gran Vía, Madrid',             vehicleCount: 68 },
  { _id: 'w_ring_amsterdam',areaName: 'Ring Road A10, Amsterdam',     vehicleCount: 82 },
  // Asia-Pacific
  { _id: 'w_orchard_rd',    areaName: 'Orchard Road, Singapore',      vehicleCount: 58 },
  { _id: 'w_shibuya',       areaName: 'Shibuya Crossing, Tokyo',      vehicleCount: 120 },
  { _id: 'w_expressway_hk', areaName: 'Island Eastern Corridor, Hong Kong', vehicleCount: 95 },
  { _id: 'w_sukhumvit',     areaName: 'Sukhumvit Road, Bangkok',      vehicleCount: 105 },
  { _id: 'w_edsa',          areaName: 'EDSA Highway, Manila',         vehicleCount: 125 },
  // Airports
  { _id: 'w_jfk',           areaName: 'JFK Airport Access Road, NY', vehicleCount: 88 },
  { _id: 'w_heathrow',      areaName: 'Heathrow Airport Tunnel, London', vehicleCount: 92 },
  { _id: 'w_bom_airport',   areaName: 'Mumbai Airport Road, T2',      vehicleCount: 76 },
  { _id: 'w_changi',        areaName: 'Changi Airport Expressway, Singapore', vehicleCount: 55 },
  // Landmarks / Highways
  { _id: 'w_dubai_shk_zyd', areaName: 'Sheikh Zayed Road, Dubai',     vehicleCount: 118 },
  { _id: 'w_m25',           areaName: 'M25 Motorway, London',         vehicleCount: 140 },
  { _id: 'w_e40',           areaName: 'E40 European Route, Brussels', vehicleCount: 98 },
  { _id: 'w_sydney_m1',     areaName: 'M1 Pacific Motorway, Sydney',  vehicleCount: 87 },
];

/* ─── Live Road Traffic Status Panel ─────────────────────────────────────── */
const COLOR_MAP = {
  Green:  { bg: '#dcfce7', border: '#22c55e', text: '#15803d', dot: '#22c55e', label: '🟢 Low'      },
  Yellow: { bg: '#fef9c3', border: '#f59e0b', text: '#b45309', dot: '#f59e0b', label: '🟡 Moderate' },
  Red:    { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', dot: '#ef4444', label: '🔴 Heavy'    },
  Gray:   { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280', dot: '#9ca3af', label: '⚫ No Data'  },
};

// ─── Simulation Mode Panel ────────────────────────────────────────────────────
const PRESETS = [
  { id: 'low',    label: '🟢 Low Traffic',    desc: '~20 vehicles · 40+ km/h',   color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  { id: 'medium', label: '🟡 Medium Traffic', desc: '~100 vehicles · 20–40 km/h', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  { id: 'high',   label: '🔴 Heavy Traffic',  desc: '~250 vehicles · 5–20 km/h',  color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
];

const SimulationPanel = ({ onSimulated }) => {
  const [active, setActive]   = useState(null);   // 'low' | 'medium' | 'high' | null
  const [loading, setLoading] = useState(false);

  const runSim = async (preset) => {
    setLoading(true);
    try {
      const res = await trafficService.simulate(preset);
      setActive(preset);
      toast.success(res.message || `Simulation applied: ${preset}`);
      onSimulated && onSimulated();            // tell parent to reload data
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Simulation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 20, border: active ? `2px solid ${PRESETS.find(p => p.id === active)?.color}` : undefined }}>
      <div className="card-header" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h3 className="card-title">🧪 Simulation Mode</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Instantly set ALL roads to a preset traffic level to test the system end-to-end
          </p>
        </div>
        {active && (
          <span style={{
            marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, fontSize: '.76rem', fontWeight: 700,
            background: PRESETS.find(p => p.id === active)?.bg,
            color: PRESETS.find(p => p.id === active)?.color,
            border: `1px solid ${PRESETS.find(p => p.id === active)?.border}`
          }}>
            ● Active: {active.charAt(0).toUpperCase() + active.slice(1)}
          </span>
        )}
      </div>
      <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p.id}
            disabled={loading}
            onClick={() => runSim(p.id)}
            style={{
              flex: '1 1 160px', minWidth: 160, padding: '14px 16px', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
              border: `2px solid ${active === p.id ? p.color : p.border}`,
              background: active === p.id ? p.bg : 'var(--card-bg)',
              textAlign: 'left', transition: 'all .15s',
              boxShadow: active === p.id ? `0 0 0 3px ${p.color}33` : 'none',
              opacity: loading ? 0.7 : 1
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: active === p.id ? p.color : 'var(--text-primary)' }}>{p.label}</div>
            <div style={{ fontSize: '.74rem', color: 'var(--text-secondary)', marginTop: 3 }}>{p.desc}</div>
          </button>
        ))}
        {active && (
          <button
            disabled={loading}
            onClick={() => setActive(null)}
            style={{
              flex: '0 0 auto', padding: '14px 16px', borderRadius: 10,
              border: '2px solid var(--border)', background: 'var(--card-bg)',
              color: 'var(--text-secondary)', fontSize: '.82rem', cursor: 'pointer'
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>
      {loading && (
        <div style={{ padding: '8px 20px 12px', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
          ⏳ Applying simulation to all locations…
        </div>
      )}
    </div>
  );
};

const LiveRoadPanel = () => {
  const [roads, setRoads]           = useState([]);
  const [fetchedAt, setFetchedAt]   = useState(null);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [retryCount, setRetryCount] = useState(0);
  const timerRef = useRef(null);

  const fetchRoads = useCallback(async () => {
    try {
      const res = await predictService.liveRoads();
      setRoads(res.data || []);
      setFetchedAt(new Date(res.fetchedAt));
      setError(null);
    } catch (err) {
      // Keep existing road data visible — only show error banner
      const status = err?.response?.status;
      if (status === 401) {
        setError('Session expired — please log in again.');
      } else if (status === 404) {
        setError('API endpoint not found. Make sure the backend is running.');
      } else if (!err?.response) {
        setError('Cannot reach the server. Check that the backend is running on port 5000.');
      } else {
        setError(`Server error (${status ?? 'unknown'}): ${err?.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRoads();
    timerRef.current = setInterval(fetchRoads, 4000);
    return () => clearInterval(timerRef.current);
  }, [fetchRoads, retryCount]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount(c => c + 1);
  };

  const counts   = roads.reduce((acc, r) => { acc[r.trafficColor] = (acc[r.trafficColor] || 0) + 1; return acc; }, {});
  const displayed = filter === 'All' ? roads : roads.filter(r => r.trafficColor === filter);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h3 className="card-title">🛣️ Live Road Traffic Status</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Each road classified independently from real vehicle count &amp; speed · Auto-refreshes every 4s
            {fetchedAt && !error && <span style={{ marginLeft: 8, color: '#22c55e' }}>· ✓ {fetchedAt.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {['All','Green','Yellow','Red','Gray'].map(c => (
            <button
              key={c}
              className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-ghost'}`}
              style={filter === c && c !== 'All' ? { background: COLOR_MAP[c]?.dot, color: '#fff', borderColor: COLOR_MAP[c]?.dot } : {}}
              onClick={() => setFilter(c)}
            >
              {c === 'All' ? `All (${roads.length})` : `${COLOR_MAP[c].label} (${counts[c] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner — non-blocking, shown above data if any exists */}
      {error && (
        <div style={{ margin: '0 16px 8px', padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ flex: 1, fontSize: '.82rem', color: '#9a3412' }}>{error}</span>
          <button className="btn btn-sm btn-ghost" style={{ color: '#9a3412', border: '1px solid #fed7aa', whiteSpace: 'nowrap' }} onClick={handleRetry}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Loading skeleton on first load */}
      {loading && roads.length === 0 && (
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 10 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 10, background: '#f3f4f6', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Empty DB state */}
      {!loading && !error && roads.length === 0 && (
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '28px', fontSize: '.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗄️</div>
          <strong>No traffic locations in database.</strong>
          <p style={{ marginTop: 4 }}>Run <code>node seed.js</code> inside the backend folder, or add locations in Traffic Monitor.</p>
        </div>
      )}

      {/* Road cards */}
      {roads.length > 0 && (
        <div className="card-body">
          {/* Summary pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {['Green','Yellow','Red','Gray'].map(c => counts[c] ? (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: COLOR_MAP[c].bg, border: `1px solid ${COLOR_MAP[c].border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_MAP[c].dot, display: 'inline-block' }} />
                <span style={{ fontSize: '.78rem', fontWeight: 600, color: COLOR_MAP[c].text }}>
                  {counts[c]} road{counts[c] > 1 ? 's' : ''} — {c === 'Green' ? 'Low' : c === 'Yellow' ? 'Moderate' : c === 'Red' ? 'Heavy' : 'No Data'}
                </span>
              </div>
            ) : null)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {displayed.map(road => {
              const cm = COLOR_MAP[road.trafficColor] || COLOR_MAP.Gray;
              return (
                <div key={road._id} style={{ border: `2px solid ${cm.border}`, borderRadius: 10, background: cm.bg, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '.87rem', color: '#1f2328', lineHeight: 1.3 }}>{road.areaName}</span>
                    <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: cm.dot, color: '#fff', whiteSpace: 'nowrap', marginLeft: 6 }}>
                      {cm.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: '.78rem', color: cm.text, flexWrap: 'wrap' }}>
                    <span>🚗 {road.vehicleCount ?? '—'} vehicles</span>
                    <span>⚡ {road.averageSpeed ?? '—'} km/h</span>
                    {road.trafficDensity != null && <span>📊 {Math.round(road.trafficDensity)}%</span>}
                  </div>
                  {road.isEmergency && (
                    <div style={{ marginTop: 5, fontSize: '.72rem', color: '#b91c1c', fontWeight: 700 }}>🚨 Emergency Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Predict = () => {
  const [roadName, setRoadName] = useState('');
  const [roadResult, setRoadResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [locSearch, setLocSearch] = useState('');
  const [locDropOpen, setLocDropOpen] = useState(false);
  // Journey prediction state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [journeyData, setJourneyData] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [journeyUpdated, setJourneyUpdated] = useState(null);
  const journeyTimerRef = useRef(null);
  const lastOriginRef = useRef('');
  const lastDestRef = useRef('');

  const fetchLocations = () =>
    trafficService.getAll({}).then(r => setLocations(r.data || [])).catch(() => {});

  useEffect(() => {
    fetchLocations();
    const t = setInterval(fetchLocations, 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh journey every 30s
  const runJourney = useCallback(async (org, dest) => {
    try {
      const data = await fetchJourneyRoutes(org, dest);
      setJourneyData(data);
      setSelectedRouteIdx(0);
      setJourneyUpdated(new Date());
    } catch (err) { toast.error(err.message || 'Route fetch failed'); }
  }, []);

  useEffect(() => {
    if (journeyData) {
      journeyTimerRef.current = setInterval(() => runJourney(lastOriginRef.current, lastDestRef.current), 30000);
    }
    return () => clearInterval(journeyTimerRef.current);
  }, [journeyData, runJourney]);

  const handleJourneyPredict = async (e) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) { toast.error('Enter both starting location and destination'); return; }
    setJourneyLoading(true);
    setJourneyData(null);
    clearInterval(journeyTimerRef.current);
    lastOriginRef.current = origin.trim();
    lastDestRef.current = destination.trim();
    try {
      await runJourney(origin.trim(), destination.trim());
    } finally { setJourneyLoading(false); }
  };

  const clearJourney = () => {
    setJourneyData(null);
    clearInterval(journeyTimerRef.current);
  };

  const handleManualPredict = async (e) => {
    e.preventDefault();
    if (!roadName.trim()) { toast.error('Enter a road name or location'); return; }
    setLoading(true);
    setRoadResult(null);
    setResult(null);
    try {
      const count = await estimateVehicleCount(roadName.trim());
      // AI predict first — use returned averageSpeed if available
      const res = await predictService.predict({ vehicleCount: count, areaName: roadName.trim() });
      const speed = res.averageSpeed || null;
      const analysis = getRoadAnalysis(roadName.trim(), count, speed);
      setRoadResult(analysis);
      setResult(res);
    } catch { toast.error('Prediction failed'); }
    finally { setLoading(false); }
  };

  const handleLocationPredict = async () => {
    if (!selectedId) { toast.error('Select a location'); return; }
    setLoading(true);
    setRoadResult(null);
    setResult(null);
    try {
      // World fallback locations use deterministic vehicle count (no random)
      if (selectedId.startsWith('w_')) {
        const loc = WORLD_LOCATIONS.find(l => l._id === selectedId);
        const count = loc.vehicleCount;
        const res = await predictService.predict({ vehicleCount: count, areaName: loc.areaName });
        const speed = res.averageSpeed || null;
        const analysis = getRoadAnalysis(loc.areaName, count, speed);
        setRoadResult(analysis);
        setResult(res);
      } else {
        const res = await predictService.predict({ trafficId: selectedId });
        // Build road analysis from the real DB data returned
        const speed = res.averageSpeed || null;
        const analysis = getRoadAnalysis(res.area, res.vehicleCount, speed);
        setRoadResult(analysis);
        setResult(res);
      }
    } catch { toast.error('Prediction failed'); }
    finally { setLoading(false); }
  };

  const loadBulk = async () => {
    setBulkLoading(true);
    try {
      const res = await predictService.bulkPredict();
      setBulkResults(res.data);
      toast.success(`Predictions generated for ${res.data.length} locations`);
    } catch { toast.error('Bulk prediction failed'); }
    finally { setBulkLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">AI Traffic Prediction</h2>
          <p className="page-subtitle">Smart congestion analysis and route recommendations</p>
        </div>
        <div className="pred-ai-badge">
          <span>🤖</span> AI Engine Active
        </div>
      </div>

      <div className="predict-layout">
        {/* Input Panel */}
        <div className="predict-inputs">
          {/* Journey AI Prediction */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🗺️ Journey AI Prediction</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleJourneyPredict}>
                <div className="form-group">
                  <label className="form-label">🟢 Starting Location *</label>
                  <AutocompleteInput
                    placeholder="e.g. Connaught Place, Delhi"
                    value={origin}
                    onChange={setOrigin}
                    onSelect={setOrigin}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">🔴 Destination *</label>
                  <AutocompleteInput
                    placeholder="e.g. Cyber City, Gurugram"
                    value={destination}
                    onChange={setDestination}
                    onSelect={setDestination}
                  />
                </div>
                <p className="form-hint">Routes fetched via OSRM · Traffic simulated by time-of-day</p>
                <button type="submit" className="btn btn-primary btn-full" disabled={journeyLoading}>
                  {journeyLoading ? '⏳ Fetching Routes...' : '🤖 Run AI Prediction'}
                </button>
              </form>
            </div>
          </div>

          {/* From Location */}
          {(() => {
            const pool = locations.length > 0 ? locations : WORLD_LOCATIONS;
            const isWorld = locations.length === 0;
            const filtered = pool.filter(l =>
              l.areaName.toLowerCase().includes(locSearch.toLowerCase())
            );
            const selected = pool.find(l => l._id === selectedId);
            return (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📍 Predict from Location</h3>
                  {isWorld && <span className="loc-world-badge">🌍 World Locations</span>}
                  {!isWorld && <span className="loc-live-badge">🔴 Live Sync</span>}
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">
                      {isWorld ? 'Select a World Location' : 'Select Traffic Location'}
                      <span className="loc-count-badge">{pool.length}</span>
                    </label>
                    <div className="loc-dropdown" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setLocDropOpen(false); }} tabIndex={-1}>
                      <div className="loc-dropdown-trigger" onClick={() => setLocDropOpen(o => !o)}>
                        <span className="loc-selected-text">
                          {selected ? selected.areaName : '-- Choose location --'}
                        </span>
                        <span className="loc-arrow">{locDropOpen ? '▲' : '▼'}</span>
                      </div>
                      {locDropOpen && (
                        <div className="loc-dropdown-panel">
                          <div className="loc-search-wrap">
                            <span className="loc-search-icon">🔍</span>
                            <input
                              className="loc-search-input"
                              placeholder="Search locations..."
                              value={locSearch}
                              onChange={e => setLocSearch(e.target.value)}
                              autoFocus
                            />
                            {locSearch && <button className="loc-search-clear" onClick={() => setLocSearch('')}>✕</button>}
                          </div>
                          <div className="loc-options">
                            {filtered.length === 0 && (
                              <div className="loc-no-results">No locations match "{locSearch}"</div>
                            )}
                            {filtered.map(l => {
                              const lvl = l.vehicleCount < 30 ? 'Low' : l.vehicleCount <= 70 ? 'Medium' : 'High';
                              const dot = lvl === 'High' ? '#ef4444' : lvl === 'Medium' ? '#f59e0b' : '#22c55e';
                              return (
                                <div
                                  key={l._id}
                                  className={`loc-option${selectedId === l._id ? ' loc-option-active' : ''}`}
                                  onMouseDown={() => { setSelectedId(l._id); setLocDropOpen(false); setLocSearch(''); }}
                                >
                                  <span className="loc-option-dot" style={{ background: dot }} />
                                  <span className="loc-option-name">{l.areaName}</span>
                                  <span className="loc-option-count">{l.vehicleCount}v</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-full" onClick={handleLocationPredict} disabled={loading || !selectedId}>
                    {loading ? '⏳ Analyzing...' : '📊 Analyze Location'}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Result Panel */}
        <div className="predict-result">
          {journeyData ? (
            <JourneyResults
              routes={journeyData.routes}
              origin={journeyData.origin}
              destination={journeyData.destination}
              selectedIdx={selectedRouteIdx}
              onSelect={setSelectedRouteIdx}
              onClose={clearJourney}
              lastUpdated={journeyUpdated}
            />
          ) : roadResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <RoadAnalysisResult data={roadResult} onClose={() => { setRoadResult(null); setResult(null); }} />
              {result && (
                <PredictionCard
                  area={result.area}
                  vehicleCount={result.vehicleCount}
                  prediction={result.prediction}
                />
              )}
            </div>
          ) : (
            <div className="pred-empty">
              <div className="pred-empty-icon">🤖</div>
              <h3>AI Prediction Engine</h3>
              <p>Enter a start and destination to get AI-powered journey predictions across all available routes.</p>
              <div className="pred-features">
                {['Multi-Route Analysis', 'Congestion Estimation', 'AI Recommendation', 'Auto Refresh'].map(f => (
                  <span key={f} className="pred-feature-badge">✓ {f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Mode — bulk preset all roads, then live panel auto-reloads */}
      <SimulationPanel onSimulated={fetchLocations} />

      {/* Live Road Traffic Status — auto-refreshes every 4s, each road independently classified */}
      <LiveRoadPanel />

      {/* Bulk Predictions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">📋 Bulk AI Analysis — All Locations</h3>
          <button className="btn btn-primary btn-sm" onClick={loadBulk} disabled={bulkLoading}>
            {bulkLoading ? '⏳ Analyzing...' : '🔄 Run Bulk Analysis'}
          </button>
        </div>
        {bulkResults.length > 0 && (
          <div className="card-body">
            <div className="bulk-grid">
              {bulkResults.map((item) => (
                <PredictionCard key={item._id} area={item.areaName} vehicleCount={item.vehicleCount} prediction={item.prediction} />
              ))}
            </div>
          </div>
        )}
        {bulkResults.length === 0 && (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
            Click "Run Bulk Analysis" to analyze all traffic locations at once
          </div>
        )}
      </div>
    </div>
  );
};

export default Predict;
