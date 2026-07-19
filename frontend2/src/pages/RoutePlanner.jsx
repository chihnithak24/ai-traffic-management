/**
 * RoutePlanner.jsx — Route Planning with source/destination and suggestions
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, label) => L.divIcon({
  className: '',
  html: `<div style="background:${color};color:white;font-size:11px;font-weight:700;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px ${color}88">${label}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
});

// Nominatim geocoder (OpenStreetMap)
const geocode = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await r.json();
  if (!data.length) throw new Error('Location not found');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
};

// Haversine distance (km)
const haversine = (a, b) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const FitRoute = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

const ROUTE_OPTIONS = [
  { id: 'shortest',  label: 'Shortest Route',      icon: '📏', desc: 'Minimum distance path',    speedFactor: 0.9,  trafficFactor: 1.1 },
  { id: 'fastest',   label: 'Fastest Route',        icon: '⚡', desc: 'Optimised for speed',     speedFactor: 1.2,  trafficFactor: 0.9 },
  { id: 'traffic',   label: 'Traffic-Free Route',   icon: '🟢', desc: 'Avoids congested areas',  speedFactor: 0.85, trafficFactor: 0.5 },
];

const SUGGESTIONS = [
  { icon: '🛣️',  text: 'Use the outer ring road to bypass city traffic.' },
  { icon: '🕐',  text: 'Avoid 8–10 AM and 5–8 PM peak hours.' },
  { icon: '🚦',  text: 'Green signal coordination active on selected route.' },
  { icon: '🚨',  text: 'Emergency vehicles have route priority — allow clearance.' },
  { icon: '🔄',  text: 'Traffic diversion active near city centre.' },
  { icon: '⛽',  text: 'Fuel stations available every 15 km on this route.' },
];

export default function RoutePlanner() {
  const [source, setSource]       = useState('');
  const [dest,   setDest]         = useState('');
  const [srcPt,  setSrcPt]        = useState(null);
  const [dstPt,  setDstPt]        = useState(null);
  const [planning, setPlanning]   = useState(false);
  const [routes,  setRoutes]      = useState([]);
  const [activeRoute, setActiveRoute] = useState('fastest');
  const [locating,   setLocating]    = useState(false);

  // Use device GPS to fill the source field
  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode with Nominatim
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'AITrafficSystem/2.1' } }
          );
          const d = await r.json();
          const addr = d.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setSource(addr);
          toast.success('📍 Current location set as source!');
        } catch {
          setSource(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => { toast.error('Location access denied'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const plan = async (e) => {
    e.preventDefault();
    if (!source.trim() || !dest.trim()) { toast.error('Enter both source and destination'); return; }
    setPlanning(true);
    try {
      const [s, d] = await Promise.all([geocode(source), geocode(dest)]);
      setSrcPt(s); setDstPt(d);
      const dist   = haversine(s, d);
      const built  = ROUTE_OPTIONS.map(opt => {
        const d_adj = dist * (opt.id === 'shortest' ? 1 : opt.id === 'fastest' ? 1.08 : 1.22);
        const speed = 45 * opt.speedFactor;
        const time  = (d_adj / speed) * 60; // minutes
        const delay = time * (opt.trafficFactor - 1);
        // Simple midpoint offset for visual distinction
        const offsets = { shortest: 0, fastest: 0.01, traffic: -0.015 };
        const mid = {
          lat: (s.lat + d.lat) / 2 + offsets[opt.id],
          lng: (s.lng + d.lng) / 2 + offsets[opt.id] * 0.5,
        };
        return { ...opt, distance: d_adj.toFixed(1), time: Math.round(time), delay: Math.max(0, Math.round(delay)), mid, src: s, dst: d };
      });
      setRoutes(built);
      toast.success('Routes calculated!');
    } catch (err) { toast.error(err.message || 'Route planning failed'); }
    finally { setPlanning(false); }
  };

  const active = routes.find(r => r.id === activeRoute);
  const routeColor = { shortest: '#6366f1', fastest: '#22c55e', traffic: '#3b82f6' };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Route Planner</h2>
        <p className="text-sm text-gray-500 mt-0.5">Plan the best route between two locations</p>
      </div>

      {/* Input Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5">
        <form onSubmit={plan} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">📍 Source</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. Madhapur, Hyderabad"
                value={source} onChange={e => setSource(e.target.value)} />
              <button type="button" onClick={useMyLocation} disabled={locating}
                title="Use my current location"
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-all disabled:opacity-60 flex items-center gap-1">
                {locating
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : '📍'}
              </button>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">🏁 Destination</label>
            <input className="input" placeholder="e.g. Charminar, Hyderabad"
              value={dest} onChange={e => setDest(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={planning}>
            {planning ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Planning...</> : '🗺️ Plan Route'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {routes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Route Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {routes.map(r => (
                <motion.button key={r.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveRoute(r.id)}
                  className={`glass rounded-2xl p-4 text-left transition-all border-2 ${activeRoute === r.id ? 'border-indigo-400 dark:border-indigo-500 shadow-lg' : 'border-transparent'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{r.icon}</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{r.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{r.desc}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ['📏', `${r.distance} km`, 'Distance'],
                      ['⏱️', `${r.time} min`,    'Est. Time'],
                      ['🚦', r.delay > 0 ? `+${r.delay}m` : 'None', 'Delay'],
                    ].map(([icon, val, lbl]) => (
                      <div key={lbl} className="bg-gray-50 dark:bg-gray-800 rounded-xl py-2 px-1">
                        <p className="text-base">{icon}</p>
                        <p className="font-bold text-xs text-gray-800 dark:text-gray-200 mt-0.5">{val}</p>
                        <p className="text-[9px] text-gray-400">{lbl}</p>
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Map */}
            {srcPt && dstPt && (
              <div className="glass rounded-2xl overflow-hidden">
                <MapContainer center={[srcPt.lat, srcPt.lng]} zoom={12} style={{ height: 400, width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitRoute points={[srcPt, dstPt]} />
                  <Marker position={[srcPt.lat, srcPt.lng]} icon={makeIcon('#22c55e', 'A')}>
                    <Popup><strong>Source</strong><br />{srcPt.display?.split(',').slice(0,2).join(',')}</Popup>
                  </Marker>
                  <Marker position={[dstPt.lat, dstPt.lng]} icon={makeIcon('#ef4444', 'B')}>
                    <Popup><strong>Destination</strong><br />{dstPt.display?.split(',').slice(0,2).join(',')}</Popup>
                  </Marker>
                  {/* Draw routes with slight offsets */}
                  {routes.map(r => (
                    <Polyline key={r.id}
                      positions={[[srcPt.lat, srcPt.lng], [r.mid.lat, r.mid.lng], [dstPt.lat, dstPt.lng]]}
                      color={routeColor[r.id]}
                      weight={r.id === activeRoute ? 5 : 2.5}
                      opacity={r.id === activeRoute ? 1 : 0.35}
                      dashArray={r.id === activeRoute ? null : '6 4'}
                    />
                  ))}
                </MapContainer>
              </div>
            )}

            {/* Smart Suggestions */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">💡 Smart Suggestions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                    <span className="text-xl">{s.icon}</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{s.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {routes.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="font-semibold text-gray-600 dark:text-gray-300">Enter source & destination to plan your route</p>
          <p className="text-sm mt-1">Compares shortest, fastest & traffic-free options</p>
        </div>
      )}
    </div>
  );
}
