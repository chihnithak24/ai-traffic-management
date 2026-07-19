/**
 * MapPage.jsx - Interactive Leaflet Map Page + Location Search Module
 * Displays color-coded traffic markers on OpenStreetMap,
 * plus full Google Maps location search with traffic layer.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { trafficService } from '../services/trafficService';
import { toast } from 'react-toastify';
import LocationSearch from '../components/ui/LocationSearch';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

// ─── Simulation presets ──────────────────────────────────────────────────────
const SIM_PRESETS = [
  { id: 'low',    label: '🟢 Low',    color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  { id: 'medium', label: '🟡 Medium', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  { id: 'high',   label: '🔴 Heavy',  color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
];

// Google Maps API key from .env  (VITE_GOOGLE_MAPS_API_KEY)
const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Fix default Leaflet icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create colored circle icon based on congestion level
const createIcon = (congestionLevel, isEmergency) => {
  const colors = {
    Low:    '#22c55e',
    Medium: '#f59e0b',
    High:   '#ef4444'
  };
  const color = isEmergency ? '#dc2626' : (colors[congestionLevel] || '#3b82f6');
  const size   = isEmergency ? 18 : 14;

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      ${isEmergency ? 'animation:pulse 1s infinite;' : ''}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)]
  });
};

// Re-center map to fit all markers
const FitBounds = ({ locations }) => {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, map]);
  return null;
};

// Flies the map to the user's position
const FlyToUser = ({ flyTo }) => {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15, { animate: true, duration: 1.2 });
  }, [flyTo, map]);
  return null;
};

// Pulsing blue "You Are Here" icon
const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb88;z-index:1"></div>
    <div style="position:absolute;inset:-6px;background:#2563eb33;border-radius:50%;animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -16],
});

const MapPage = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('All');
  const [activeTab, setActiveTab] = useState('leaflet');
  const [heatmap, setHeatmap]     = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [simActive, setSimActive] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Live location state
  const [userPos, setUserPos]   = useState(null);
  const [locError, setLocError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo]       = useState(null);
  const watchIdRef               = useRef(null);

  const loadLocations = async () => {
    try {
      const res = await trafficService.getAll({});
      setLocations(res.data);
    } catch { toast.error('Failed to load map data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLocations(); }, []);

  const runSimulation = async (preset) => {
    setSimLoading(true);
    try {
      const res = await trafficService.simulate(preset);
      setSimActive(preset);
      toast.success(res.message || `Simulation applied: ${preset}`);
      await loadLocations();       // refresh map markers after simulation
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Simulation failed');
    } finally { setSimLoading(false); }
  };

  // Watch GPS position when on the leaflet tab
  useEffect(() => {
    if (activeTab !== 'leaflet') return;
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocError(null);
        setLocating(false);
      },
      () => { setLocError('Location access denied or unavailable.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [activeTab]);

  const handleLocateMe = () => {
    if (userPos) {
      setFlyTo([...userPos]);
    } else {
      setLocating(true);
      toast.info('Requesting your location…');
    }
  };

  const filtered = filter === 'All' ? locations : locations.filter(l => l.congestionLevel === filter);

  if (loading) return (
    <div className="loading-overlay"><div className="spinner" /><span>Loading map...</span></div>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Traffic Map</h2>
          <p className="page-subtitle">Live traffic visualization & location search</p>
        </div>
        {/* Tab switcher */}
        <div className="map-tab-bar">
          <button
            className={`btn btn-sm ${activeTab === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('leaflet')}
          >
            🗺️ Live Traffic Map
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'search' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Location Search
          </button>
        </div>
      </div>

      {/* ── TAB: Leaflet OSM Map ─────────────────────────────────────── */}
      {activeTab === 'leaflet' && (
        <>
          <div className="map-filters" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['All', 'Low', 'Medium', 'High'].map(level => (
              <button
                key={level}
                className={`btn btn-sm ${filter === level ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(level)}
              >
                {level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : level === 'High' ? '🔴' : '🗺️'} {level}
              </button>
            ))}
            <button
              className={`btn btn-sm ${heatmap ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setHeatmap(h => !h)}
            >
              🔥 Heatmap
            </button>
            <button
              className={`btn btn-sm ${emergencyMode ? 'btn-primary' : 'btn-ghost'}`}
              style={emergencyMode ? { background: '#dc2626' } : {}}
              onClick={() => { setEmergencyMode(e => !e); }}
            >
              🚨 Emergency Route
            </button>
            <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={handleLocateMe}>
              {locating ? '⏳ Locating…' : userPos ? '📍 Re-center' : '📍 My Location'}
            </button>
          </div>
          {userPos && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'6px 12px', background:'#eff6ff', borderRadius:'var(--radius)', border:'1px solid #bfdbfe', fontSize:'.82rem' }}>
              <span style={{ color:'#2563eb', fontWeight:700 }}>📍 Live Location Active</span>
              <span style={{ color:'#64748b', fontFamily:'monospace' }}>{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</span>
              <button className="btn btn-sm btn-ghost" style={{ marginLeft:'auto', padding:'2px 8px', fontSize:'.75rem' }} onClick={() => { navigator.geolocation.clearWatch(watchIdRef.current); setUserPos(null); }}>
                ✕ Stop
              </button>
            </div>
          )}
          {emergencyMode && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 10, fontSize: '.85rem', color: '#dc2626', fontWeight: 600 }}>
              🚨 Emergency Mode Active — Priority corridor highlighted. All high-congestion signals set to Emergency Green.
            </div>
          )}
          {locError && (
            <p style={{ fontSize: '.8rem', color: '#ef4444', marginBottom: 8 }}>{locError}</p>
          )}

          {/* ── Simulation Mode strip ─────────────────────────────────── */}
          <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>🧪 Simulate:</span>
            {SIM_PRESETS.map(p => (
              <button
                key={p.id}
                disabled={simLoading}
                onClick={() => runSimulation(p.id)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: '.78rem', fontWeight: 600, cursor: simLoading ? 'wait' : 'pointer',
                  border: `2px solid ${simActive === p.id ? p.color : p.border}`,
                  background: simActive === p.id ? p.bg : 'transparent',
                  color: simActive === p.id ? p.color : 'var(--text-secondary)',
                  transition: 'all .15s'
                }}
              >
                {p.label}
              </button>
            ))}
            {simActive && (
              <button
                onClick={() => setSimActive(null)}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: '.74rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 'auto' }}
              >
                ✕ Clear sim
              </button>
            )}
            {simLoading && <span style={{ fontSize: '.76rem', color: 'var(--text-secondary)' }}>⏳ Applying…</span>}
          </div>

          <div className="map-legend-bar">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#22c55e' }}></span> Low Traffic</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span> Medium Traffic</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span> High Traffic</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#dc2626', animation: 'pulse 1s infinite' }}></span> Emergency</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#2563eb', boxShadow: '0 0 0 2px #2563eb55' }}></span> You Are Here</span>
            <span className="legend-count">Showing {filtered.length} of {locations.length} locations</span>
          </div>

          <div className="map-wrapper card">
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={12}
              style={{ height: '560px', width: '100%', borderRadius: 'var(--radius-lg)' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds locations={filtered} />
              <FlyToUser flyTo={flyTo} />
              {/* Heatmap overlay using CircleMarkers */}
              {heatmap && filtered.map((loc) => (
                <CircleMarker
                  key={`heat-${loc._id}`}
                  center={[loc.latitude, loc.longitude]}
                  radius={Math.max(20, loc.trafficDensity * 0.5)}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: loc.congestionLevel === 'High' ? '#ef4444' : loc.congestionLevel === 'Medium' ? '#f59e0b' : '#22c55e',
                    fillOpacity: 0.35
                  }}
                />
              ))}
              {/* Live user location marker */}
              {userPos && (
                <Marker position={userPos} icon={userIcon}>
                  <Popup maxWidth={200}>
                    <div className="map-popup" style={{ textAlign: 'center' }}>
                      <strong style={{ color: '#2563eb' }}>📍 You Are Here</strong>
                      <div className="popup-footer">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
              {filtered.map((loc) => (
                <Marker
                  key={loc._id}
                  position={[loc.latitude, loc.longitude]}
                  icon={createIcon(loc.congestionLevel, loc.isEmergency || (emergencyMode && loc.congestionLevel === 'High'))}
                >
                  <Popup maxWidth={260}>
                    <div className="map-popup">
                      <div className="popup-header">
                        <strong>{loc.areaName}</strong>
                        {loc.isEmergency && <span className="badge badge-emergency" style={{ fontSize: '.7rem', padding: '2px 6px' }}>🚨 Emergency</span>}
                      </div>
                      <div className="popup-grid">
                        <div className="popup-row"><span>🚗 Vehicles:</span><strong>{loc.vehicleCount}</strong></div>
                        <div className="popup-row"><span>📊 Density:</span><strong>{Math.round(loc.trafficDensity)}%</strong></div>
                        <div className="popup-row"><span>🚦 Signal:</span><strong>{loc.signalStatus}</strong></div>
                        <div className="popup-row">
                          <span>⚡ Congestion:</span>
                          <strong style={{ color: loc.congestionLevel === 'High' ? '#ef4444' : loc.congestionLevel === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                            {loc.congestionLevel}
                          </strong>
                        </div>
                      </div>
                      <div className="popup-footer">📍 {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      )}

      {/* ── TAB: Google Maps Location Search ────────────────────────── */}
      {activeTab === 'search' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 className="card-title" style={{ marginBottom: 4 }}>🔍 Google Maps Location Search</h3>
            <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>
              Search any city, area, or junction — see live traffic layer, congestion status, travel times &amp; alternate routes.
            </p>
          </div>
          <LocationSearch
            apiKey={GMAP_KEY}
            onLocationFound={({ lat, lng, address }) => {
              console.log('Location found:', address, lat, lng);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MapPage;
