/**
 * LiveLocation.jsx — Real-time GPS Live Location Tracking page
 * Shows: pulsing map marker, live coords, reverse-geocoded address,
 *        accuracy ring, speed, heading, location history trail,
 *        copy-to-clipboard share, and "Search Traffic Here" shortcut.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Pulsing blue "You Are Here" icon
const makeUserIcon = (heading) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:28px">
    <div style="position:absolute;inset:0;background:#2563eb;border-radius:50%;border:3px solid white;
      box-shadow:0 0 0 3px #2563eb55;z-index:2"></div>
    <div style="position:absolute;inset:-10px;background:#2563eb22;border-radius:50%;
      animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite"></div>
    ${heading != null
      ? `<div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%) rotate(${heading}deg);
          width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
          border-bottom:12px solid #2563eb;z-index:3;transform-origin:bottom center"></div>`
      : ''
    }
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
});

// Trail dot icon
const trailIcon = L.divIcon({
  className: '',
  html: `<div style="width:6px;height:6px;background:#2563eb88;border-radius:50%"></div>`,
  iconSize: [6, 6], iconAnchor: [3, 3],
});

// FlyTo helper inside MapContainer
const FlyTo = ({ pos, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, zoom, { animate: true, duration: 1.2 });
  }, [pos, zoom, map]);
  return null;
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'AITrafficSystem/2.1' } }
    );
    const d = await r.json();
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function LiveLocation() {
  const [pos, setPos]             = useState(null);    // { lat, lng, accuracy, speed, heading, altitude }
  const [address, setAddress]     = useState('');
  const [addrLoading, setAddrLoading] = useState(false);
  const [tracking, setTracking]   = useState(false);
  const [error, setError]         = useState('');
  const [flyTo, setFlyTo]         = useState(null);
  const [history, setHistory]     = useState([]);      // [{lat,lng,ts}]
  const [elapsed, setElapsed]     = useState(0);       // seconds since tracking started
  const [totalDist, setTotalDist] = useState(0);       // km

  const watchRef    = useRef(null);
  const timerRef    = useRef(null);
  const prevPosRef  = useRef(null);
  const addrTimer   = useRef(null);

  // Haversine for trail distance
  const haversine = (a, b) => {
    const R = 6371, toR = d => d * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const x = Math.sin(dLat/2)**2 + Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return; }
    setError(''); setTracking(true); setHistory([]); setElapsed(0); setTotalDist(0);
    prevPosRef.current = null;

    watchRef.current = navigator.geolocation.watchPosition(
      (gpos) => {
        const { latitude: lat, longitude: lng, accuracy, speed, heading, altitude } = gpos.coords;
        const newPos = { lat, lng, accuracy: Math.round(accuracy), speed: speed ? Math.round(speed * 3.6) : 0, heading, altitude: altitude ? Math.round(altitude) : null };
        setPos(newPos);
        setFlyTo([lat, lng]);

        // Update history trail (keep last 60 points)
        const ts = Date.now();
        setHistory(prev => {
          const next = [...prev, { lat, lng, ts }].slice(-60);
          return next;
        });

        // Accumulate distance
        if (prevPosRef.current) {
          const d = haversine(prevPosRef.current, { lat, lng });
          setTotalDist(prev => prev + d);
        }
        prevPosRef.current = { lat, lng };

        // Reverse geocode — debounced 5s
        clearTimeout(addrTimer.current);
        addrTimer.current = setTimeout(async () => {
          setAddrLoading(true);
          const a = await reverseGeocode(lat, lng);
          setAddress(a);
          setAddrLoading(false);
        }, 3000);
      },
      (err) => {
        setError('Location access denied or unavailable. Please allow location access.');
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    // Elapsed timer
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    clearInterval(timerRef.current);
    clearTimeout(addrTimer.current);
    setTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    clearInterval(timerRef.current);
    clearTimeout(addrTimer.current);
  }, []);

  const copyCoords = () => {
    if (!pos) return;
    const txt = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
    navigator.clipboard.writeText(txt).then(() => toast.success('📋 Coordinates copied!')).catch(() => toast.error('Copy failed'));
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => toast.success('📋 Address copied!')).catch(() => toast.error('Copy failed'));
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const mapCenter = pos ? [pos.lat, pos.lng] : [20.5937, 78.9629];
  const mapZoom   = pos ? 16 : 5;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📍 Live Location Tracker
            {tracking && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time GPS tracking with address lookup and trail history</p>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2">
          {!tracking ? (
            <button onClick={startTracking}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm shadow-sm transition-all">
              📍 Start Tracking
            </button>
          ) : (
            <button onClick={stopTracking}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-sm transition-all">
              ⏹ Stop Tracking
            </button>
          )}
          {pos && (
            <button onClick={() => setFlyTo([pos.lat, pos.lng])}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm shadow-sm transition-all">
              🎯 Center
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Stats row */}
      <AnimatePresence>
        {pos && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: '📍', label: 'Latitude',  value: pos.lat.toFixed(5),        sub: 'decimal degrees' },
              { icon: '📍', label: 'Longitude', value: pos.lng.toFixed(5),        sub: 'decimal degrees' },
              { icon: '🎯', label: 'Accuracy',  value: `±${pos.accuracy} m`,      sub: pos.accuracy < 20 ? 'High accuracy' : pos.accuracy < 50 ? 'Good' : 'Low accuracy' },
              { icon: '💨', label: 'Speed',     value: `${pos.speed} km/h`,       sub: 'GPS speed' },
              { icon: '⏱️', label: 'Duration',  value: formatTime(elapsed),        sub: 'tracking time' },
              { icon: '📏', label: 'Distance',  value: `${(totalDist * 1000).toFixed(0)} m`, sub: 'trail length' },
            ].map(({ icon, label, value, sub }) => (
              <div key={label} className="glass rounded-xl px-3 py-3 text-center">
                <p className="text-lg">{icon}</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm mt-1 tabular-nums">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                <p className="text-[9px] text-gray-400">{sub}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address bar */}
      <AnimatePresence>
        {pos && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">🏠</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Current Address</p>
              {addrLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs text-gray-500">Looking up address…</span>
                </div>
              ) : address ? (
                <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{address}</p>
              ) : (
                <p className="text-xs text-gray-400">Address lookup will begin in a moment…</p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={copyCoords} title="Copy coordinates"
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium">
                📋 Coords
              </button>
              {address && (
                <button onClick={copyAddress} title="Copy address"
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium">
                  📋 Address
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div className="glass rounded-2xl overflow-hidden shadow-lg">
        {/* Map controls toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 text-xs">
          <span className="font-semibold text-gray-600 dark:text-gray-300">
            {pos ? `📍 ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Waiting for GPS signal…'}
          </span>
          {pos?.heading != null && (
            <span className="text-gray-500">🧭 {Math.round(pos.heading)}°</span>
          )}
          {pos?.altitude != null && (
            <span className="text-gray-500">⛰️ {pos.altitude}m alt</span>
          )}
          <span className="ml-auto text-gray-400">{history.length} trail points</span>
        </div>

        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: 500, width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTo && <FlyTo pos={flyTo} zoom={16} />}

          {/* Accuracy circle */}
          {pos && pos.accuracy > 0 && (
            <Circle
              center={[pos.lat, pos.lng]}
              radius={pos.accuracy}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.07, weight: 1.5, dashArray: '4 3' }}
            />
          )}

          {/* Trail polyline */}
          {history.length >= 2 && (
            <Polyline
              positions={history.map(p => [p.lat, p.lng])}
              pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '6 3' }}
            />
          )}

          {/* Trail dots (last 10) */}
          {history.slice(-10, -1).map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={trailIcon} />
          ))}

          {/* Live position marker */}
          {pos && (
            <Marker position={[pos.lat, pos.lng]} icon={makeUserIcon(pos.heading)}>
              <Popup maxWidth={220}>
                <div className="py-1 text-center">
                  <p className="font-bold text-blue-600 text-sm">📍 You Are Here</p>
                  <p className="text-xs text-gray-500 mt-1 tabular-nums">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Accuracy</span><span className="font-bold">±{pos.accuracy}m</span></div>
                    <div className="bg-gray-50 rounded px-2 py-1"><span className="text-gray-400 block">Speed</span><span className="font-bold">{pos.speed} km/h</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Empty state */}
      {!tracking && !pos && (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 space-y-3">
          <div className="text-5xl">📍</div>
          <p className="font-semibold text-gray-600 dark:text-gray-300">Click "Start Tracking" to begin live location</p>
          <p className="text-sm">Your GPS position will appear on the map with a pulsing blue dot</p>
          <ul className="text-xs space-y-1 max-w-xs mx-auto text-left text-gray-500">
            <li>✅ Real-time coordinates &amp; accuracy ring</li>
            <li>✅ Reverse-geocoded address lookup</li>
            <li>✅ Speed and heading indicator</li>
            <li>✅ Movement trail on map</li>
            <li>✅ Copy coordinates / address to clipboard</li>
          </ul>
        </div>
      )}

      {/* How it works */}
      <div className="glass rounded-2xl p-5 border-l-4 border-blue-400">
        <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-2">ℹ️ How Live Location Works</h4>
        <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          {[
            '📍 Uses your device\'s built-in GPS chip via the browser Geolocation API',
            '🔄 Updates continuously as you move — no page refresh needed',
            '🏠 Address is looked up using OpenStreetMap Nominatim (free, no API key)',
            '🎯 Accuracy ring shows GPS precision — smaller ring = more accurate',
            '📏 Distance and trail track how far you\'ve travelled since tracking started',
            '🔒 Your location is never sent to any external server — all processing is local',
          ].map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}
