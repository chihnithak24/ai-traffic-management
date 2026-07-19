/**
 * LocationSearch.jsx — Real-world traffic search using free APIs
 * Features: Live GPS location, POIs, AI suggestions, incident reporting,
 *           favorites, recent searches, heatmap, traffic trend chart,
 *           toll plazas, accident history, road conditions.
 * No Google API key needed. Uses Nominatim + OSRM + Overpass + OpenMeteo.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap, LayerGroup
} from 'react-leaflet';
import L from 'leaflet';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { locationSearchService } from '../../services/locationSearchService';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LEVEL_CFG = {
  'Low':       { dot: '🟢', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', bar: '#22c55e' },
  'Medium':    { dot: '🟡', bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-700',     text: 'text-amber-700 dark:text-amber-300',   bar: '#f59e0b' },
  'High':      { dot: '🔴', bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-700',         text: 'text-red-700 dark:text-red-300',       bar: '#ef4444' },
  'Very High': { dot: '🆘', bg: 'bg-rose-50 dark:bg-rose-900/20',       border: 'border-rose-300 dark:border-rose-700',       text: 'text-rose-700 dark:text-rose-300',     bar: '#dc2626' },
};

const SUGGESTION_COLORS = {
  danger:  { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-700',     text: 'text-red-700 dark:text-red-300' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-300' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300' },
  tip:     { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' },
};

const LS_FAVORITES = 'trafficapp_favorites';
const LS_RECENTS   = 'trafficapp_recents';

// Fly-to helper inside MapContainer
const FlyTo = ({ pos, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, zoom, { animate: true, duration: 1.4 });
  }, [pos, map, zoom]);
  return null;
};

// Pulsing search-result marker
const makeSearchIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:28px">
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px ${color}55;z-index:1"></div>
    <div style="position:absolute;inset:-8px;background:${color}33;border-radius:50%;animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite"></div>
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
});

// Blue pulsing "You Are Here" icon
const liveLocIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #2563eb55;z-index:1"></div>
    <div style="position:absolute;inset:-8px;background:#2563eb22;border-radius:50%;animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite"></div>
  </div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -16],
});

// POI marker
const makePOIIcon = (emoji) => L.divIcon({
  className: '',
  html: `<div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.4))">${emoji}</div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14],
});

const QUICK = ['Tadepalligudem', 'Hyderabad', 'Vijayawada', 'Bengaluru', 'Chennai', 'Mumbai', 'Madhapur'];

// Traffic trend simulation based on congestion
function buildTrendData(basePct) {
  const hours = ['6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm'];
  const peakMult = [0.4, 0.85, 1.0, 0.95, 0.75, 0.65, 0.70, 0.65, 0.62, 0.68, 0.80, 0.95, 1.0, 0.90, 0.75, 0.55, 0.35];
  const data = peakMult.map(m => Math.min(100, Math.round(basePct * m + Math.random() * 6)));
  return { labels: hours, data };
}

export default function LocationSearch({ onLocationFound }) {
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [flyPos, setFlyPos]         = useState(null);

  // Live location
  const [livePos, setLivePos]       = useState(null);
  const [locError, setLocError]     = useState('');
  const [locating, setLocating]     = useState(false);
  const watchRef                     = useRef(null);

  // Extra data panels
  const [pois, setPois]             = useState(null);
  const [tolls, setTolls]           = useState(null);
  const [accidents, setAccidents]   = useState(null);
  const [conditions, setConditions] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [heatPoints, setHeatPoints] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPOIs, setShowPOIs]     = useState(false);
  const [extraLoading, setExtraLoading] = useState(false);

  // Incident report
  const [incidentForm, setIncidentForm] = useState({ type: 'accident', description: '' });
  const [incidentMsg, setIncidentMsg]   = useState('');
  const [reportingInc, setReportingInc] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  // Favorites + recents (localStorage)
  const [favorites, setFavorites]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'); } catch { return []; }
  });
  const [recents, setRecents]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_RECENTS) || '[]'); } catch { return []; }
  });

  const acTimer = useRef(null);

  // Persist favorites/recents
  useEffect(() => { localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(LS_RECENTS,   JSON.stringify(recents)); },   [recents]);

  // ── Live GPS location ─────────────────────────────────────────────────────
  const startLiveLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported by this browser.'); return; }
    setLocating(true); setLocError('');
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLivePos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false); setLocError('');
      },
      (err) => { setLocError('Location access denied or unavailable.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  }, []);

  const stopLiveLocation = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setLivePos(null); setLocating(false);
  }, []);

  const locateMe = useCallback(() => {
    if (livePos) {
      setFlyPos([...livePos]);
    } else {
      startLiveLocation();
    }
  }, [livePos, startLiveLocation]);

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  // Fly to live position once acquired
  useEffect(() => {
    if (livePos && locating === false && !result) setFlyPos([...livePos]);
  }, [livePos]);

  // ── Autocomplete ─────────────────────────────────────────────────────────
  const onQueryChange = useCallback((e) => {
    const v = e.target.value;
    setQuery(v); setError('');
    clearTimeout(acTimer.current);
    if (v.length < 2) { setSuggestions([]); return; }
    acTimer.current = setTimeout(async () => {
      try {
        const d = await locationSearchService.autocomplete(v);
        setSuggestions(d.predictions || []);
      } catch { setSuggestions([]); }
    }, 350);
  }, []);

  // ── Add to recents ───────────────────────────────────────────────────────
  const addRecent = useCallback((q) => {
    setRecents(prev => {
      const next = [q, ...prev.filter(r => r !== q)].slice(0, 5);
      return next;
    });
  }, []);

  // ── Main search ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    setSuggestions([]); setError(''); setLoading(true); setResult(null);
    setPois(null); setTolls(null); setAccidents(null); setConditions(null);
    setAiSuggestions(null); setHeatPoints([]); setIncidentMsg('');
    try {
      const data = await locationSearchService.trafficInfo(searchQuery, null);
      setResult(data);
      setFlyPos([data.location.lat, data.location.lng]);
      addRecent(searchQuery);
      if (q) setQuery(q);
      onLocationFound?.({ lat: data.location.lat, lng: data.location.lng, address: data.location.formatted_address });

      // Load extra data in background
      const { lat, lng } = data.location;
      setExtraLoading(true);
      Promise.allSettled([
        locationSearchService.nearbyPois(lat, lng).then(setPois),
        locationSearchService.tollInfo(lat, lng).then(setTolls),
        locationSearchService.accidentHistory(lat, lng).then(setAccidents),
        locationSearchService.roadConditions(lat, lng).then(setConditions),
        locationSearchService.aiSuggestions(lat, lng, data.congestion_level, data.congestion_pct, data.weather_note).then(setAiSuggestions),
        locationSearchService.heatmapData(lat, lng).then(d => setHeatPoints(d.points || [])),
      ]).finally(() => setExtraLoading(false));

    } catch (err) {
      setError(err?.response?.data?.detail || 'Location not found. Try a different search.');
    } finally { setLoading(false); }
  }, [query, onLocationFound, addRecent]);

  // ── Favorites ────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((q) => {
    setFavorites(prev => prev.includes(q) ? prev.filter(f => f !== q) : [...prev, q].slice(0, 10));
  }, []);

  const isFav = result ? favorites.includes(query) : false;

  // ── Report incident ──────────────────────────────────────────────────────
  const submitIncident = useCallback(async () => {
    if (!result) return;
    setReportingInc(true);
    try {
      const res = await locationSearchService.reportIncident({
        lat:         result.location.lat,
        lng:         result.location.lng,
        type:        incidentForm.type,
        description: incidentForm.description,
        reporter:    'App User',
      });
      setIncidentMsg(`✅ ${res.message}`);
      setShowIncidentForm(false);
      setIncidentForm({ type: 'accident', description: '' });
    } catch {
      setIncidentMsg('❌ Failed to report incident. Try again.');
    } finally { setReportingInc(false); }
  }, [result, incidentForm]);

  const cfg = result ? (LEVEL_CFG[result.traffic_status] || LEVEL_CFG['Low']) : null;

  // ── Chart data ──────────────────────────────────────────────────────────
  const vbData = result ? {
    labels: ['🚗 Cars', '🏍️ Bikes', '🚌 Buses', '🚛 Trucks', '🛺 Autos', '🚑 Emergency'],
    datasets: [{
      label: 'Vehicles',
      data: [
        result.vehicle_breakdown.cars,   result.vehicle_breakdown.bikes,
        result.vehicle_breakdown.buses,  result.vehicle_breakdown.trucks,
        result.vehicle_breakdown.autos,  result.vehicle_breakdown.emergency,
      ],
      backgroundColor: ['#3b82f6','#f59e0b','#22c55e','#ef4444','#8b5cf6','#ec4899'],
      borderRadius: 6, borderSkipped: false,
    }]
  } : null;

  const doughnutData = result ? {
    labels: ['Low','Medium','High','Very High'],
    datasets: [{
      data: [
        result.congestion_level === 'Low'       ? result.congestion_pct : 10,
        result.congestion_level === 'Medium'    ? result.congestion_pct : 20,
        result.congestion_level === 'High'      ? result.congestion_pct : 30,
        result.congestion_level === 'Very High' ? result.congestion_pct : 5,
      ],
      backgroundColor: ['#22c55e','#f59e0b','#ef4444','#dc2626'],
      borderWidth: 3, borderColor: 'white',
    }]
  } : null;

  const trendData = result ? (() => {
    const { labels, data } = buildTrendData(result.congestion_pct);
    return {
      labels,
      datasets: [{
        label: 'Congestion %',
        data,
        borderColor: result.traffic_color,
        backgroundColor: result.traffic_color + '22',
        fill: true, tension: 0.4, pointRadius: 3,
        pointBackgroundColor: result.traffic_color,
      }]
    };
  })() : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10, usePointStyle: true } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: 'rgba(99,102,241,0.08)' }, ticks: { font: { size: 9 } } } }
  };

  return (
    <div className="space-y-5">

      {/* ── Search bar ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Real-World Location Search</h3>
            <p className="text-xs text-gray-500">Powered by OpenStreetMap · OSRM · OpenMeteo — no API key needed</p>
          </div>
        </div>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK.map(q => (
            <button key={q} onClick={() => handleSearch(q)}
              className="text-xs px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all font-medium">
              📍 {q}
            </button>
          ))}
        </div>

        {/* Recent searches */}
        {recents.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Recent:</span>
            {recents.map(r => (
              <button key={r} onClick={() => handleSearch(r)}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                🕐 {r}
              </button>
            ))}
            <button onClick={() => setRecents([])} className="text-[10px] text-gray-400 hover:text-red-400 ml-auto">Clear</button>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Favorites:</span>
            {favorites.map(f => (
              <button key={f} onClick={() => handleSearch(f)}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40 hover:bg-amber-100 transition-all">
                ⭐ {f}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-3">
          <div className="relative flex-1">
            <div className="flex items-center gap-2 input focus-within:ring-2 focus-within:ring-indigo-400">
              <span>📍</span>
              <input type="text" className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                placeholder="Search city, area, road… e.g. Tadepalligudem"
                value={query} onChange={onQueryChange} autoComplete="off" />
              {query && <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setResult(null); }} className="text-gray-400 hover:text-red-400 text-xs">✕</button>}
            </div>
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute z-50 top-full mt-1 left-0 right-0 glass rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <li key={i} onClick={() => { setQuery(s.description); setSuggestions([]); handleSearch(s.description); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300">
                      <span>📌</span>{s.description}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <button type="submit" disabled={loading || !query.trim()} className="btn-primary disabled:opacity-50">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching…</> : '🔍 Search'}
          </button>
        </form>

        {error && <p className="text-xs text-red-500 mt-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">⚠️ {error}</p>}

        {/* Live location bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={locateMe} disabled={locating}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 transition-all shadow-sm">
            {locating
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Locating…</>
              : livePos ? '📍 Fly to My Location' : '📍 Use My Live Location'
            }
          </button>
          {livePos && (
            <>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✅ Live: {livePos[0].toFixed(4)}, {livePos[1].toFixed(4)}
              </span>
              <button onClick={stopLiveLocation} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Stop</button>
            </>
          )}
          {locError && <span className="text-xs text-red-500">{locError}</span>}
        </div>
      </div>

      <AnimatePresence>
        {result && cfg && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* ── AI Suggestions banner ──────────────────────────────── */}
            {aiSuggestions?.suggestions?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {aiSuggestions.suggestions.slice(0, 3).map((s, i) => {
                  const sc = SUGGESTION_COLORS[s.type] || SUGGESTION_COLORS.info;
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${sc.bg} ${sc.border}`}>
                      <span className="text-lg mt-0.5 flex-shrink-0">{s.icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${sc.text}`}>{s.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{s.message}</p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ── Map ───────────────────────────────────────────────────── */}
            <div className="glass rounded-2xl overflow-hidden shadow-lg">
              {/* Map toolbar */}
              <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Map Layers:</span>
                <button onClick={() => setShowHeatmap(v => !v)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${showHeatmap ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                  🔥 Heatmap
                </button>
                <button onClick={() => setShowPOIs(v => !v)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${showPOIs ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                  📍 POIs
                </button>
                <button onClick={locateMe}
                  className="ml-auto text-xs px-3 py-1 rounded-full bg-blue-500 text-white border border-blue-500 font-medium">
                  📍 Locate Me
                </button>
              </div>

              <MapContainer center={[result.location.lat, result.location.lng]} zoom={13}
                style={{ height: 440, width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyTo pos={flyPos} />

                {/* Main location marker */}
                <Marker position={[result.location.lat, result.location.lng]}
                  icon={makeSearchIcon(result.traffic_color)}>
                  <Popup maxWidth={260}>
                    <div className="py-1">
                      <p className="font-bold text-sm text-gray-900">{result.location.place_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{result.location.city}{result.location.state ? `, ${result.location.state}` : ''}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Vehicles</span><span className="font-bold">{result.vehicle_count}</span></div>
                        <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Speed</span><span className="font-bold">{result.avg_speed_kmh} km/h</span></div>
                        <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Congestion</span><span className="font-bold">{result.congestion_pct}%</span></div>
                        <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Level</span><span className="font-bold" style={{ color: result.traffic_color }}>{result.traffic_status}</span></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Live user location */}
                {livePos && (
                  <Marker position={livePos} icon={liveLocIcon}>
                    <Popup maxWidth={180}>
                      <div className="text-center py-1">
                        <p className="font-bold text-blue-600 text-sm">📍 You Are Here</p>
                        <p className="text-xs text-gray-500 mt-1">{livePos[0].toFixed(5)}, {livePos[1].toFixed(5)}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Heatmap circles */}
                {showHeatmap && heatPoints.map((pt, i) => (
                  <Circle key={i}
                    center={[pt.lat, pt.lng]}
                    radius={120}
                    pathOptions={{
                      color: 'transparent',
                      fillColor: pt.intensity > 0.7 ? '#dc2626' : pt.intensity > 0.5 ? '#ef4444' : pt.intensity > 0.3 ? '#f59e0b' : '#22c55e',
                      fillOpacity: pt.intensity * 0.55,
                    }}
                  />
                ))}

                {/* POI markers */}
                {showPOIs && pois?.pois?.slice(0, 30).map((poi, i) => (
                  <Marker key={i} position={[poi.lat, poi.lng]} icon={makePOIIcon(poi.icon)}>
                    <Popup maxWidth={200}>
                      <div className="py-0.5">
                        <p className="font-bold text-sm">{poi.icon} {poi.name}</p>
                        <p className="text-xs text-gray-500">{poi.type} · {poi.distance}</p>
                        {poi.phone && <p className="text-xs text-blue-600 mt-0.5">📞 {poi.phone}</p>}
                        {poi.opening && <p className="text-xs text-gray-400">🕐 {poi.opening}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Accident hotspot markers */}
                {accidents?.hotspots?.map((h, i) => (
                  <Circle key={i} center={[h.lat, h.lng]} radius={80}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 1.5 }}>
                    <Popup><p className="text-xs font-bold text-red-600">⚠️ {h.type}<br />{h.distance}</p></Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>

            {/* ── Location header + stats ───────────────────────────────── */}
            <div className="glass rounded-2xl p-5 border-l-4" style={{ borderColor: result.traffic_color }}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{result.location.place_name}</h3>
                  <p className="text-sm text-gray-500">{result.location.city}{result.location.state ? `, ${result.location.state}` : ''}, {result.location.country}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {result.location.lat.toFixed(5)}, {result.location.lng.toFixed(5)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-xl ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                    {cfg.dot} {result.traffic_status} Traffic
                  </span>
                  <span className="text-[10px] text-gray-400">🕒 {result.last_updated}</span>
                  {result.is_estimated && <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">~ Estimated values</span>}
                  {/* Favorite button */}
                  <button onClick={() => toggleFavorite(query || result.location.place_name)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all font-medium mt-1 ${isFav ? 'bg-amber-400 text-white border-amber-400' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:bg-amber-50'}`}>
                    {isFav ? '⭐ Saved' : '☆ Save to Favorites'}
                  </button>
                </div>
              </div>

              {/* Key stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '🚗', label: 'Vehicle Count',  value: result.vehicle_count,             sub: 'estimated' },
                  { icon: '📊', label: 'Congestion',     value: `${result.congestion_pct}%`,      sub: result.congestion_level },
                  { icon: '💨', label: 'Avg Speed',      value: `${result.avg_speed_kmh} km/h`,   sub: 'current' },
                  { icon: '🛣️', label: 'Road Type',      value: result.road_type,                 sub: 'dominant' },
                ].map(({ icon, label, value, sub }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-3 text-center">
                    <p className="text-xl">{icon}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{label} · {sub}</p>
                  </div>
                ))}
              </div>

              {/* Weather */}
              {result.weather_note && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  {result.weather_note}
                </p>
              )}
            </div>

            {/* ── Vehicle breakdown ─────────────────────────────────────── */}
            <div className="glass rounded-2xl p-5">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">🚗 Vehicle Count Breakdown</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                {[
                  { icon: '🚗', label: 'Cars',      value: result.vehicle_breakdown.cars,      color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { icon: '🏍️', label: 'Bikes',     value: result.vehicle_breakdown.bikes,     color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { icon: '🚌', label: 'Buses',     value: result.vehicle_breakdown.buses,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { icon: '🚛', label: 'Trucks',    value: result.vehicle_breakdown.trucks,    color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20' },
                  { icon: '🛺', label: 'Autos',     value: result.vehicle_breakdown.autos,     color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { icon: '🚑', label: 'Emergency', value: result.vehicle_breakdown.emergency, color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-50 dark:bg-pink-900/20' },
                ].map(({ icon, label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl py-3 px-2 text-center border border-white/50 dark:border-white/10`}>
                    <p className="text-2xl">{icon}</p>
                    <p className={`font-bold text-xl ${color} mt-1`}>{value}</p>
                    <p className="text-[10px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-indigo-700 rounded-xl text-white">
                <span className="font-semibold text-sm">Total Estimated Vehicles</span>
                <span className="text-3xl font-bold">{result.vehicle_count}</span>
              </div>
            </div>

            {/* ── Charts ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">📊 Vehicle Distribution</h4>
                <div style={{ height: 220 }}>
                  <Bar data={vbData} options={chartOpts} />
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🎯 Congestion Level</h4>
                <div style={{ height: 220 }} className="flex items-center justify-center">
                  <Doughnut data={doughnutData} options={{ ...chartOpts, cutout: '60%', scales: {} }} />
                </div>
              </div>
            </div>

            {/* ── Traffic trend chart ───────────────────────────────────── */}
            <div className="glass rounded-2xl p-5">
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">📈 Traffic Trend (Today)</h4>
              <div style={{ height: 180 }}>
                <Line data={trendData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">Estimated hourly congestion pattern based on current levels</p>
            </div>

            {/* ── Congestion density bar ────────────────────────────────── */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">🔥 Traffic Density Scale</h4>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{result.congestion_pct}%</span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${result.congestion_pct}%` }} transition={{ duration: 1 }}
                  className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #22c55e, #f59e0b, #ef4444, #dc2626)' }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0% — Clear</span><span>25% — Low</span><span>50% — Medium</span><span>75% — High</span><span>100% — Very High</span>
              </div>
            </div>

            {/* ── Nearby POIs ───────────────────────────────────────────── */}
            {pois?.grouped && Object.keys(pois.grouped).length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">📍 Nearby Places of Interest</h4>
                  {extraLoading && <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />}
                </div>
                <div className="space-y-3">
                  {Object.entries(pois.grouped).map(([type, items]) => (
                    <div key={type}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{items[0].icon} {type}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.slice(0, 4).map((poi, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{poi.name}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{poi.distance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Toll Plazas ──────────────────────────────────────────── */}
            {tolls?.tolls?.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🚧 Nearby Toll Plazas</h4>
                <div className="space-y-2">
                  {tolls.tolls.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.operator} · {t.distance}</p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {Object.entries(t.charges).map(([v, amt]) => (
                          <span key={v} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/30 font-semibold">
                            {v}: {amt}
                          </span>
                        ))}
                        {t.fastag && <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px] font-bold">FASTag ✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Accident Hotspots ─────────────────────────────────────── */}
            {accidents?.hotspots?.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">⚠️ Accident Hotspots Nearby</h4>
                <div className="space-y-2">
                  {accidents.hotspots.slice(0, 6).map((h, i) => (
                    <div key={i} className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl px-4 py-2.5">
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">{h.type}</p>
                        {h.note && <p className="text-[10px] text-gray-500">{h.note}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.severity === 'High' ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300'}`}>{h.severity}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Road Conditions ───────────────────────────────────────── */}
            {conditions?.conditions?.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🚦 Road Conditions</h4>
                <div className="space-y-2">
                  {conditions.conditions.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{c.type}</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{c.info}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nearby roads ─────────────────────────────────────────── */}
            {result.nearby_roads?.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🛣️ Nearby Roads & Intersections</h4>
                <div className="flex flex-wrap gap-2">
                  {result.nearby_roads.map((r, i) => (
                    <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30 px-3 py-1 rounded-full font-medium">
                      🛣️ {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Routes ───────────────────────────────────────────────── */}
            {result.routes?.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🗺️ Available Routes</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.routes.map((r, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${r.is_recommended ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">R{i+1}</span>
                        {r.is_recommended && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✅ Best</span>}
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <p>📏 {r.distance}</p>
                        <p>⏱️ {r.duration}</p>
                        <p>💨 {r.avg_speed}</p>
                      </div>
                      {r.steps?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {r.steps.slice(0, 3).map((s, j) => s && (
                            <p key={j} className="text-[10px] text-gray-400 truncate">• {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Report Incident ──────────────────────────────────────── */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">🚨 Report an Incident</h4>
                <button onClick={() => setShowIncidentForm(v => !v)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium">
                  {showIncidentForm ? '✕ Cancel' : '+ Report'}
                </button>
              </div>
              {incidentMsg && (
                <p className={`text-xs mb-3 px-3 py-2 rounded-xl ${incidentMsg.startsWith('✅') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                  {incidentMsg}
                </p>
              )}
              <AnimatePresence>
                {showIncidentForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { value: 'accident',  icon: '💥', label: 'Accident' },
                        { value: 'jam',       icon: '🚦', label: 'Traffic Jam' },
                        { value: 'roadblock', icon: '🚧', label: 'Road Block' },
                        { value: 'pothole',   icon: '🕳️', label: 'Pothole' },
                      ].map(t => (
                        <button key={t.value} onClick={() => setIncidentForm(f => ({ ...f, type: t.value }))}
                          className={`text-xs flex flex-col items-center gap-1 py-3 rounded-xl border transition-all font-medium ${incidentForm.type === t.value ? 'bg-red-500 text-white border-red-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                          <span className="text-xl">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" placeholder="Brief description (optional)…"
                      value={incidentForm.description}
                      onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <p className="text-[10px] text-gray-400">
                      📍 Reporting at: {result.location.lat.toFixed(4)}, {result.location.lng.toFixed(4)}
                    </p>
                    <button onClick={submitIncident} disabled={reportingInc}
                      className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {reportingInc
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                        : '🚨 Submit Incident Report'
                      }
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {!showIncidentForm && !incidentMsg && (
                <p className="text-xs text-gray-400">Help others by reporting accidents, jams, road blocks, or potholes at this location.</p>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold text-gray-600 dark:text-gray-300">Search any city or location</p>
          <p className="text-sm mt-1">Try: Tadepalligudem, Hyderabad, Vijayawada, Bengaluru</p>
          <p className="text-xs mt-3 text-blue-500">Or use 📍 <strong>Use My Live Location</strong> to search near you</p>
        </div>
      )}
    </div>
  );
}
