/**
 * MapView.jsx — Leaflet interactive map with all traffic locations
 *             + Real-world Location Search (no Google key needed)
 */
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { trafficSvc } from '../services/trafficService';
import { toast } from 'react-toastify';
import LocationSearch from '../components/ui/LocationSearch';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MARKER_COLORS = {
  Low:          '#22c55e',
  Medium:       '#f59e0b',
  High:         '#ef4444',
  Accident:     '#3b82f6',
  'Road Closed':'#8b5cf6',
};

const LEGEND = [
  { label: 'Low Traffic',  color: '#22c55e' },
  { label: 'Medium',       color: '#f59e0b' },
  { label: 'Heavy',        color: '#ef4444' },
  { label: 'Accident',     color: '#3b82f6' },
  { label: 'Road Closed',  color: '#8b5cf6' },
  { label: 'Emergency',    color: '#dc2626', pulse: true },
  { label: 'You Are Here', color: '#2563eb' },
];

const createIcon = (level, isEmergency) => {
  const color = isEmergency ? '#dc2626' : (MARKER_COLORS[level] || '#6366f1');
  const s = isEmergency ? 18 : 14;
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px ${color}66${isEmergency?';animation:pulse 1s infinite':''}"></div>`,
    iconSize: [s, s], iconAnchor: [s/2, s/2], popupAnchor: [0, -s/2-4]
  });
};

const FitMap = ({ locations }) => {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [locations, map]);
  return null;
};

// Flies the map to a given latlng when the flyTo ref fires
const FlyToUser = ({ flyTo }) => {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15, { animate: true, duration: 1.2 });
  }, [flyTo, map]);
  return null;
};

// Pulsing blue "You Are Here" marker
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

export default function MapView() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('All');
  const [activeTab, setActiveTab] = useState('leaflet'); // 'leaflet' | 'search'

  // Live location state
  const [userPos, setUserPos]       = useState(null);
  const [locError, setLocError]     = useState(null);
  const [flyTo, setFlyTo]           = useState(null);
  const watchIdRef                   = useRef(null);

  useEffect(() => {
    trafficSvc.getAll({}).then(r => setLocations(r.data)).catch(() => toast.error('Map load failed')).finally(() => setLoading(false));
  }, []);

  // Start watching position when on the leaflet tab
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
      },
      err => setLocError('Location access denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [activeTab]);

  const handleLocateMe = () => {
    if (userPos) { setFlyTo([...userPos]); }
    else toast.info('Waiting for your location…');
  };

  const visible = filter === 'All' ? locations : locations.filter(l => l.congestionLevel === filter);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  const counts = ['Low','Medium','High','Accident','Road Closed'].reduce((acc, l) => {
    acc[l] = locations.filter(x => x.congestionLevel === l).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Traffic Map</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live traffic & location search</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-2">
          {[['leaflet', '🗺️ Live Map'], ['search', '🔍 Location Search']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Leaflet OSM Map ─────────────────────────────────────── */}
      {activeTab === 'leaflet' && (
        <>
          {/* Filter buttons + Locate Me */}
          <div className="flex gap-2 flex-wrap items-center">
            {['All', 'Low', 'Medium', 'High', 'Accident', 'Road Closed'].map(l => (
              <button key={l}
                onClick={() => setFilter(l)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${filter === l ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {l}{l !== 'All' ? ` (${counts[l] || 0})` : ` (${locations.length})`}
              </button>
            ))}
            <button onClick={handleLocateMe}
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-sm">
              📍 Locate Me
            </button>
          </div>
          {locError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl">{locError}</p>
          )}

          {/* Legend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-xl p-3 flex flex-wrap items-center gap-4 text-xs">
            {LEGEND.map(({ label, color, pulse }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ background: color, width: 10, height: 10, borderRadius: '50%', border: '2px solid white', boxShadow: `0 0 6px ${color}66` }}
                  className={pulse ? 'animate-pulse' : ''} />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
              </div>
            ))}
          </motion.div>

          {/* Leaflet Map */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass rounded-2xl overflow-hidden shadow-lg">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '560px', width: '100%' }}
              className="rounded-2xl"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitMap locations={visible} />
              <FlyToUser flyTo={flyTo} />
              {/* Live user location marker */}
              {userPos && (
                <Marker position={userPos} icon={userIcon}>
                  <Popup maxWidth={200}>
                    <div className="text-center py-1">
                      <p className="font-bold text-blue-600 text-sm">📍 You Are Here</p>
                      <p className="text-xs text-gray-500 mt-1">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              {visible.map(loc => (
                <Marker key={loc._id} position={[loc.latitude, loc.longitude]}
                  icon={createIcon(loc.congestionLevel, loc.isEmergency)}>
                  <Popup maxWidth={280} minWidth={240}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                      <div style={{ background: `linear-gradient(135deg, ${MARKER_COLORS[loc.congestionLevel] || '#6366f1'}22, ${MARKER_COLORS[loc.congestionLevel] || '#6366f1'}11)` }}
                        className="px-4 py-3 border-b">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-gray-900 leading-tight">{loc.areaName}</p>
                            <p className="text-xs text-gray-500">{loc.city}, {loc.state}</p>
                          </div>
                          {loc.isEmergency && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold animate-pulse flex-shrink-0">🚨 {loc.emergencyType}</span>}
                        </div>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                        {[
                          ['🚗 Vehicles',   loc.vehicleCount],
                          ['💨 Avg Speed',  `${Math.round(loc.averageSpeed)} km/h`],
                          ['📊 Density',    `${Math.round(loc.trafficDensity)}%`],
                          ['🚦 Signal',     loc.signalStatus],
                          ['⚡ Congestion', loc.congestionLevel],
                          ['🤖 AI Predict', loc.vehicleCount > 70 ? 'High — avoid' : loc.vehicleCount > 30 ? 'Moderate' : 'Clear'],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                            <span className="text-gray-500 block">{k}</span>
                            <span className="font-semibold text-gray-800">{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 pb-2 text-[10px] text-gray-400">
                        📍 {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        </>
      )}

      {/* ── TAB: Real-World Location Search ──────────────────────────── */}
      {activeTab === 'search' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <LocationSearch
            onLocationFound={({ lat, lng, address }) => {
              console.log('Location found:', address, lat, lng);
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
