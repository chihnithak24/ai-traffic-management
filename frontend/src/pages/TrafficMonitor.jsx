/**
 * TrafficMonitor.jsx — Premium Smart City Traffic Dashboard
 * Map-first layout · glassmorphism sidebar · live analytics · route planner
 */
import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  useMap, CircleMarker, Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { trafficService } from '../services/trafficService';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import './TrafficMonitor.css';

// ── Fix Leaflet default icon ────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Constants ───────────────────────────────────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM      = 'https://router.project-osrm.org/route/v1/driving';
const EMPTY_FORM = { areaName: '', latitude: '', longitude: '', vehicleCount: '', signalStatus: 'Green' };

// ── Helpers ─────────────────────────────────────────────────────
const congestionColor = (level) =>
  level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e';

const congestionBg = (level) =>
  level === 'High' ? 'rgba(239,68,68,0.1)' : level === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';

const trafficFactor = () => {
  const h = new Date().getHours();
  if ((h >= 7 && h <= 9) || (h >= 17 && h <= 19)) return 1.6 + Math.random() * 0.3;
  if (h >= 10 && h <= 16) return 1.1 + Math.random() * 0.2;
  return 0.7 + Math.random() * 0.2;
};

const routeStatusInfo = (factor, isFastest) => {
  if (isFastest && factor < 1.1) return { color: '#3b82f6', label: 'Fastest · Smooth', icon: '🔵' };
  if (factor >= 1.5)             return { color: '#ef4444', label: 'Heavy Traffic',    icon: '🔴' };
  if (factor >= 1.1)             return { color: '#f59e0b', label: 'Moderate Traffic', icon: '🟡' };
  return                                { color: '#22c55e', label: 'Low Traffic',       icon: '🟢' };
};

const decodePolyline = (str) => {
  let idx = 0, lat = 0, lng = 0, coords = [];
  while (idx < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
};

// ── Map-level hooks ─────────────────────────────────────────────
const FlyTo = ({ target, zoom = 15 }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom, { animate: true, duration: 1.2 });
  }, [target, zoom, map]);
  return null;
};

const FitBounds = ({ locations }) => {
  const map = useMap();
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && locations.length > 0) {
      seeded.current = true;
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [locations, map]);
  return null;
};

const MapClickPicker = ({ onPick }) => {
  const map = useMap();
  useEffect(() => {
    const h = (e) => onPick(e.latlng.lat, e.latlng.lng);
    map.on('click', h);
    return () => map.off('click', h);
  }, [map, onPick]);
  return null;
};

// ── Route polyline layer ────────────────────────────────────────
const RouteLayer = ({ routes, selectedIdx, onSelect }) => {
  const map = useMap();
  useEffect(() => {
    if (routes.length) {
      const all = routes.flatMap(r => r.coords);
      if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [60, 60] });
    }
  }, [routes, map]);
  return (
    <>
      {routes.map((r, i) => (
        <Polyline
          key={i}
          positions={r.coords}
          pathOptions={{
            color:     r.status.color,
            weight:    i === selectedIdx ? 7 : 4,
            opacity:   i === selectedIdx ? 1 : 0.45,
            dashArray: i === selectedIdx ? null : '8 5',
          }}
          eventHandlers={{ click: () => onSelect(i) }}
        >
          <Popup>
            <strong>{r.status.icon} {r.label}</strong><br />
            📏 {r.distanceKm} km &nbsp;·&nbsp; ⏱️ {r.withTraffic} min<br />
            <span style={{ color: r.status.color, fontWeight: 700 }}>{r.status.label}</span>
          </Popup>
        </Polyline>
      ))}
    </>
  );
};

// ── Marker icons ─────────────────────────────────────────────────
const makeDotIcon = (color, size = 14) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2 + 6)],
});

const liveUserIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px">
    <div style="position:absolute;inset:0;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb88;z-index:2"></div>
    <div style="position:absolute;inset:-8px;background:#2563eb22;border-radius:50%;animation:tmPing 1.4s cubic-bezier(0,0,.2,1) infinite"></div>
    <div style="position:absolute;inset:-4px;background:#2563eb33;border-radius:50%;animation:tmPing 1.4s cubic-bezier(0,0,.2,1) infinite;animation-delay:.45s"></div>
  </div>`,
  iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -18],
});

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

const searchedIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:28px">
    <div style="position:absolute;inset:0;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #2563eb44;z-index:1"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:11px;z-index:2;font-weight:700">S</div>
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -20],
});

// ── Nominatim autocomplete hook ─────────────────────────────────
const useNominatim = () => {
  const timer = useRef(null);
  return useCallback(async (q, set) => {
    if (q.length < 2) { set([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=7&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        set(await r.json());
      } catch { set([]); }
    }, 320);
  }, []);
};

// ── SVG Icons ───────────────────────────────────────────────────
const Icons = {
  Search:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pin:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Route:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  Chart:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Plus:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Table:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Close:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Refresh:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Edit:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Delete:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Emergency: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Signal:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="16" rx="3"/><circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>,
};

// ── Add/Edit Modal ───────────────────────────────────────────────
const TrafficModal = ({ isOpen, onClose, onSave, initial }) => {
  const [form, setForm]     = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || EMPTY_FORM); setErrors({}); }, [initial, isOpen]);

  const handleMapPick = useCallback((lat, lng) =>
    setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) })), []);

  const validate = () => {
    const e = {};
    if (!form.areaName.trim()) e.areaName = 'Required';
    if (form.latitude === '' || isNaN(form.latitude)) e.latitude = 'Valid latitude required';
    if (form.longitude === '' || isNaN(form.longitude)) e.longitude = 'Valid longitude required';
    if (form.vehicleCount === '' || isNaN(form.vehicleCount) || form.vehicleCount < 0)
      e.vehicleCount = 'Non-negative number required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    await onSave({
      ...form,
      vehicleCount: Number(form.vehicleCount),
      latitude:     Number(form.latitude),
      longitude:    Number(form.longitude),
    });
    setSaving(false);
  };

  if (!isOpen) return null;

  const hasPin = form.latitude !== '' && form.longitude !== '' && !isNaN(form.latitude) && !isNaN(form.longitude);
  const pinPos = hasPin ? [Number(form.latitude), Number(form.longitude)] : null;

  const field = (key, label, type = 'text', ph = '') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-control ${errors[key] ? 'tm-inp-err' : ''}`}
        placeholder={ph}
        value={form[key] || ''}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
      {errors[key] && <span className="tm-err-msg">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal tm-modal-wide">
        <div className="modal-header">
          <h3 className="modal-title">
            {initial?._id ? (
              <><span className="tm-modal-icon tm-modal-icon-edit"><Icons.Edit /></span> Edit Location</>
            ) : (
              <><span className="tm-modal-icon tm-modal-icon-add"><Icons.Plus /></span> Add Traffic Location</>
            )}
          </h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><Icons.Close /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body tm-modal-body-map">
            {/* Form fields */}
            <div className="tm-modal-fields">
              <div className="grid-2">
                {field('areaName',    'Area Name',     'text',   'MG Road Junction')}
                {field('vehicleCount','Vehicle Count', 'number', '50')}
              </div>
              <div className="grid-2">
                {field('latitude',  'Latitude',  'number', '12.9716')}
                {field('longitude', 'Longitude', 'number', '77.5946')}
              </div>
              <div className="form-group">
                <label className="form-label">Signal Status</label>
                <select className="form-control" value={form.signalStatus}
                  onChange={e => setForm({ ...form, signalStatus: e.target.value })}>
                  {['Red', 'Green', 'Yellow', 'Offline'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="tm-map-pick-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Click on the map to auto-fill coordinates
              </div>
            </div>
            {/* Map picker */}
            <div className="tm-modal-map">
              <MapContainer
                center={pinPos || [20.5937, 78.9629]}
                zoom={pinPos ? 13 : 5}
                style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickPicker onPick={handleMapPick} />
                {pinPos && <Marker position={pinPos} icon={pinIcon} />}
                {pinPos && <FlyTo target={pinPos} />}
              </MapContainer>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><span className="tm-btn-spinner" /> Saving…</>
              ) : initial?._id ? 'Update Location' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Analytics Side Panel ────────────────────────────────────────
const AnalyticsPanel = ({ locations, onSelectLocation, selectedId, onClose }) => {
  const total   = locations.length;
  const high    = locations.filter(l => l.congestionLevel === 'High').length;
  const medium  = locations.filter(l => l.congestionLevel === 'Medium').length;
  const low     = locations.filter(l => l.congestionLevel === 'Low').length;
  const emerg   = locations.filter(l => l.isEmergency).length;
  const avgDens = total ? Math.round(locations.reduce((s, l) => s + (l.trafficDensity || 0), 0) / total) : 0;
  const sorted  = [...locations].sort((a, b) => (b.trafficDensity || 0) - (a.trafficDensity || 0));

  return (
    <aside className="tm-side-panel">
      {/* Header */}
      <div className="tm-panel-header">
        <div className="tm-panel-header-left">
          <span className="tm-panel-icon"><Icons.Chart /></span>
          <span className="tm-panel-title">Live Analytics</span>
        </div>
        <button className="btn btn-icon btn-sm" onClick={onClose} title="Close panel">
          <Icons.Close />
        </button>
      </div>

      {/* Emergency strip */}
      {emerg > 0 && (
        <div className="tm-emerg-strip">
          <span className="tm-emerg-pulse" />
          🚨 {emerg} Emergency Active
        </div>
      )}

      {/* KPI grid */}
      <div className="tm-kpi-grid">
        {[
          { value: total,  label: 'Locations',    color: '#2563eb', bg: 'rgba(37,99,235,0.1)'  },
          { value: high,   label: 'High Traffic',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
          { value: medium, label: 'Moderate',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { value: low,    label: 'Clear',          color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
        ].map(k => (
          <div key={k.label} className="tm-kpi-card" style={{ '--kc': k.color, '--kb': k.bg }}>
            <span className="tm-kpi-val" style={{ color: k.color }}>{k.value}</span>
            <span className="tm-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Average density bar */}
      <div className="tm-density-row">
        <div className="tm-density-top">
          <span className="tm-density-label">Avg Network Density</span>
          <span className="tm-density-pct" style={{ color: avgDens >= 70 ? '#ef4444' : avgDens >= 40 ? '#f59e0b' : '#22c55e' }}>
            {avgDens}%
          </span>
        </div>
        <div className="tm-density-track">
          <div className="tm-density-fill" style={{
            width: `${avgDens}%`,
            background: avgDens >= 70 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : avgDens >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
          }} />
        </div>
      </div>

      {/* Hotspot list header */}
      <div className="tm-list-header">
        <span className="tm-list-title">
          <span className="tm-list-icon">🔥</span>
          Traffic Hotspots
        </span>
        <span className="tm-list-count">{total} zones</span>
      </div>

      {/* Hotspot list */}
      <ul className="tm-hotspot-list">
        {sorted.length === 0 ? (
          <li className="tm-hotspot-empty">No locations added yet</li>
        ) : sorted.map(loc => (
          <li
            key={loc._id}
            className={`tm-hotspot-item ${selectedId === loc._id ? 'tm-hotspot-active' : ''}`}
            onClick={() => onSelectLocation(loc)}
          >
            <span
              className="tm-hotspot-dot"
              style={{ background: congestionColor(loc.congestionLevel) }}
            />
            <div className="tm-hotspot-info">
              <span className="tm-hotspot-name">{loc.areaName}</span>
              <span className="tm-hotspot-meta">
                {Math.round(loc.trafficDensity || 0)}% · {loc.vehicleCount} vehicles
              </span>
            </div>
            <span className="tm-hotspot-badge" style={{
              background: congestionBg(loc.congestionLevel),
              color: congestionColor(loc.congestionLevel),
              border: `1px solid ${congestionColor(loc.congestionLevel)}30`,
            }}>
              {loc.congestionLevel}
            </span>
          </li>
        ))}
      </ul>

      {/* Map legend */}
      <div className="tm-legend">
        <span className="tm-legend-title">Map Legend</span>
        <div className="tm-legend-items">
          {[
            { color: '#22c55e', label: 'Low Traffic'   },
            { color: '#f59e0b', label: 'Moderate'       },
            { color: '#ef4444', label: 'High Traffic'   },
            { color: '#2563eb', label: 'Your Location'  },
          ].map(x => (
            <div key={x.label} className="tm-legend-item">
              <span className="tm-legend-dot" style={{ background: x.color }} />
              <span>{x.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

// ── Route Planner Drawer ────────────────────────────────────────
const RoutePlanner = ({ onRoutesReady, onClose }) => {
  const [srcText, setSrcText]   = useState('');
  const [dstText, setDstText]   = useState('');
  const [srcCoord, setSrcCoord] = useState(null);
  const [dstCoord, setDstCoord] = useState(null);
  const [srcSugg, setSrcSugg]   = useState([]);
  const [dstSugg, setDstSugg]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const searchNominatim         = useNominatim();
  const srcRef = useRef(null);
  const dstRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (srcRef.current && !srcRef.current.contains(e.target)) setSrcSugg([]);
      if (dstRef.current && !dstRef.current.contains(e.target)) setDstSugg([]);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const geocode = async (text) => {
    const r = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const d = await r.json();
    if (!d.length) return null;
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), name: d[0].display_name };
  };

  const analyze = async () => {
    setError('');
    if (!srcText.trim() || !dstText.trim()) { setError('Enter both source and destination.'); return; }
    setLoading(true);
    try {
      const src = srcCoord || await geocode(srcText);
      const dst = dstCoord || await geocode(dstText);
      if (!src) { setError(`"${srcText}" not found.`); setLoading(false); return; }
      if (!dst) { setError(`"${dstText}" not found.`); setLoading(false); return; }
      setSrcCoord(src); setDstCoord(dst);
      const url  = `${OSRM}/${src.lng},${src.lat};${dst.lng},${dst.lat}?alternatives=3&geometries=polyline&overview=full&steps=false`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) {
        setError('No routes found between these points.'); setLoading(false); return;
      }
      const fastestIdx = data.routes.reduce((bi, r, i) => r.duration < data.routes[bi].duration ? i : bi, 0);
      const built = data.routes.map((r, i) => {
        const factor      = trafficFactor() * (1 + i * 0.15);
        const baseMins    = Math.round(r.duration / 60);
        const withTraffic = Math.round(baseMins * factor);
        const distKm      = (r.distance / 1000).toFixed(1);
        const avgSpeed    = r.distance > 0 ? Math.round((r.distance / 1000) / (withTraffic / 60)) : 0;
        const congPct     = Math.min(Math.round((factor - 0.7) / 1.2 * 100), 99);
        const status      = routeStatusInfo(factor, i === fastestIdx);
        return {
          index: i, coords: decodePolyline(r.geometry),
          distanceKm: distKm, withTraffic, avgSpeed, congPct, factor, status,
          label: i === 0 ? 'Primary Route' : `Alternate ${i}`,
        };
      });
      const bestIdx = built.reduce((bi, r, i) => r.withTraffic < built[bi].withTraffic ? i : bi, 0);
      built[bestIdx].recommended = true;
      onRoutesReady({ routes: built, src, dst, bestIdx });
    } catch { setError('Failed to compute routes. Check internet connection.'); }
    setLoading(false);
  };

  const SuggList = ({ sugg, onSelect }) =>
    sugg.length > 0 ? (
      <ul className="tm-rp-sugg">
        {sugg.map(s => (
          <li key={s.place_id} className="tm-rp-sugg-item"
            onMouseDown={() => onSelect(s)}>
            <span className="tm-rp-sugg-icon">📌</span>
            <span className="tm-rp-sugg-text">{s.display_name}</span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="tm-rp-drawer">
      {/* Drawer header */}
      <div className="tm-panel-header">
        <div className="tm-panel-header-left">
          <span className="tm-panel-icon"><Icons.Route /></span>
          <span className="tm-panel-title">Route Planner</span>
        </div>
        <button className="btn btn-icon btn-sm" onClick={onClose}><Icons.Close /></button>
      </div>

      {/* Source input */}
      <div className="tm-rp-field" ref={srcRef}>
        <label className="tm-rp-label">
          <span className="tm-rp-dot" style={{ background: '#22c55e' }} />
          Source
        </label>
        <div className="tm-rp-input-wrap">
          <input
            className="tm-rp-input"
            value={srcText}
            placeholder="City, area or landmark…"
            autoComplete="off"
            onChange={e => { setSrcText(e.target.value); setSrcCoord(null); searchNominatim(e.target.value, setSrcSugg); }}
          />
          {srcText && (
            <button className="tm-rp-clear" onClick={() => { setSrcText(''); setSrcCoord(null); setSrcSugg([]); }}>
              <Icons.Close />
            </button>
          )}
        </div>
        <SuggList sugg={srcSugg} onSelect={(s) => { setSrcText(s.display_name); setSrcCoord({ lat: +s.lat, lng: +s.lon }); setSrcSugg([]); }} />
      </div>

      {/* Swap arrow */}
      <div className="tm-rp-swap-row">
        <div className="tm-rp-swap-line" />
        <div className="tm-rp-swap-icon">⇅</div>
        <div className="tm-rp-swap-line" />
      </div>

      {/* Destination input */}
      <div className="tm-rp-field" ref={dstRef}>
        <label className="tm-rp-label">
          <span className="tm-rp-dot" style={{ background: '#ef4444' }} />
          Destination
        </label>
        <div className="tm-rp-input-wrap">
          <input
            className="tm-rp-input"
            value={dstText}
            placeholder="City, area or landmark…"
            autoComplete="off"
            onChange={e => { setDstText(e.target.value); setDstCoord(null); searchNominatim(e.target.value, setDstSugg); }}
          />
          {dstText && (
            <button className="tm-rp-clear" onClick={() => { setDstText(''); setDstCoord(null); setDstSugg([]); }}>
              <Icons.Close />
            </button>
          )}
        </div>
        <SuggList sugg={dstSugg} onSelect={(s) => { setDstText(s.display_name); setDstCoord({ lat: +s.lat, lng: +s.lon }); setDstSugg([]); }} />
      </div>

      {error && <div className="tm-rp-error">⚠️ {error}</div>}

      <button
        className="btn btn-primary btn-full"
        onClick={analyze}
        disabled={loading || !srcText.trim() || !dstText.trim()}
        style={{ marginTop: 12 }}
      >
        {loading ? <><span className="tm-btn-spinner" /> Analyzing Routes…</> : <><Icons.Route /> Analyze Routes</>}
      </button>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────
const TrafficMonitor = () => {
  const [locations, setLocations]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedId, setSelectedId]         = useState(null);
  const [flyTarget, setFlyTarget]           = useState(null);
  const [flyZoom, setFlyZoom]               = useState(15);

  const [query, setQuery]                   = useState('');
  const [suggestions, setSuggestions]       = useState([]);
  const [searchedPos, setSearchedPos]       = useState(null);
  const [searchedAddr, setSearchedAddr]     = useState('');
  const searchNominatim                     = useNominatim();
  const searchRef                           = useRef(null);

  const [showAnalytics, setShowAnalytics]       = useState(true);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showTable, setShowTable]               = useState(false);

  const [routes, setRoutes]                 = useState([]);
  const [routeSrc, setRouteSrc]             = useState(null);
  const [routeDst, setRouteDst]             = useState(null);
  const [selRouteIdx, setSelRouteIdx]       = useState(0);

  const [userPos, setUserPos]               = useState(null);
  const [locating, setLocating]             = useState(false);
  const [locError, setLocError]             = useState('');
  const watchRef                            = useRef(null);

  const [modalOpen, setModalOpen]           = useState(false);
  const [editTarget, setEditTarget]         = useState(null);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);

  const [search, setSearch]                 = useState('');
  const [filterLevel, setFilterLevel]       = useState('All');

  // ── Data fetch ─────────────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trafficService.getAll({ search, congestionLevel: filterLevel });
      setLocations(res.data);
    } catch { toast.error('Failed to load traffic data'); }
    finally { setLoading(false); }
  }, [search, filterLevel]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // ── Search bar ─────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSuggestions([]); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    searchNominatim(val, setSuggestions);
  };

  const selectSuggestion = (s) => {
    const pos = [parseFloat(s.lat), parseFloat(s.lon)];
    setQuery(s.display_name);
    setSearchedPos(pos);
    setSearchedAddr(s.display_name);
    setFlyTarget(pos);
    setFlyZoom(14);
    setSuggestions([]);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions([]);
    try {
      const r = await fetch(
        `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const d = await r.json();
      if (d.length) selectSuggestion(d[0]);
      else toast.warn('Location not found. Try a different search.');
    } catch { toast.error('Search failed.'); }
  };

  // ── Live location ──────────────────────────────────────────────
  const startLiveLocation = () => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported.'); return; }
    setLocating(true); setLocError('');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords);
        setFlyTarget(coords);
        setFlyZoom(15);
        setLocating(false);
      },
      () => { setLocError('Location access denied.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  const stopLiveLocation = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setUserPos(null); setLocating(false);
  };

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  // ── CRUD handlers ──────────────────────────────────────────────
  const handleSave = async (data) => {
    try {
      if (editTarget?._id) {
        await trafficService.update(editTarget._id, data);
        toast.success('Location updated!');
      } else {
        await trafficService.create(data);
        toast.success('Location added!');
      }
      setModalOpen(false); setEditTarget(null); fetchLocations();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await trafficService.delete(id);
      toast.success('Location deleted');
      setDeleteConfirm(null); fetchLocations();
    } catch { toast.error('Delete failed'); }
  };

  const handleEmergency = async (id) => {
    try {
      const res = await trafficService.toggleEmergency(id);
      toast.success(res.message); fetchLocations();
    } catch { toast.error('Emergency toggle failed'); }
  };

  // ── Route planner callback ─────────────────────────────────────
  const handleRoutesReady = ({ routes: r, src, dst, bestIdx }) => {
    setRoutes(r); setRouteSrc(src); setRouteDst(dst); setSelRouteIdx(bestIdx);
    setFlyTarget([src.lat, src.lng]); setFlyZoom(10);
  };

  const clearRoutes = () => { setRoutes([]); setRouteSrc(null); setRouteDst(null); };

  // ── Memoised icons ─────────────────────────────────────────────
  const srcIcon = useMemo(() => makeDotIcon('#22c55e', 16), []);
  const dstIcon = useMemo(() => makeDotIcon('#ef4444', 16), []);

  // ── Summary counters ───────────────────────────────────────────
  const counts = useMemo(() => ({
    total:  locations.length,
    high:   locations.filter(l => l.congestionLevel === 'High').length,
    medium: locations.filter(l => l.congestionLevel === 'Medium').length,
    low:    locations.filter(l => l.congestionLevel === 'Low').length,
    emerg:  locations.filter(l => l.isEmergency).length,
  }), [locations]);

  return (
    <div className="tm-root">

      {/* ── Top header bar ──────────────────────────────────────── */}
      <div className="tm-header">
        <div className="tm-header-left">
          <div className="tm-header-title">
            <span className="tm-header-icon"><Icons.Signal /></span>
            <div>
              <h2 className="tm-title-text">Traffic Monitor</h2>
              <p className="tm-title-sub">
                <span className="tm-live-dot" />
                Live · {counts.total} locations · {counts.high} high congestion
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form className="tm-search-form" onSubmit={handleSearchSubmit} ref={searchRef}>
          <div className="tm-search-inner">
            <span className="tm-search-icon"><Icons.Search /></span>
            <input
              className="tm-search-input"
              type="text"
              placeholder="Search city, area or landmark…"
              value={query}
              onChange={handleQueryChange}
              autoComplete="off"
            />
            {query && (
              <button type="button" className="tm-search-clear"
                onClick={() => { setQuery(''); setSuggestions([]); setSearchedPos(null); }}>
                <Icons.Close />
              </button>
            )}
          </div>
          {suggestions.length > 0 && (
            <ul className="tm-search-sugg">
              {suggestions.map(s => (
                <li key={s.place_id} className="tm-search-sugg-item" onMouseDown={() => selectSuggestion(s)}>
                  <span className="tm-sugg-pin">📌</span>
                  <span className="tm-sugg-text">{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </form>

        {/* Action buttons */}
        <div className="tm-header-actions">
          <button
            className={`tm-action-btn ${userPos ? 'tm-action-active' : ''}`}
            onClick={userPos ? stopLiveLocation : startLiveLocation}
            disabled={locating}
            title={userPos ? 'Stop tracking' : 'Use my location'}
          >
            <span className="tm-action-btn-icon"><Icons.Pin /></span>
            <span className="tm-action-btn-label">{locating ? 'Locating…' : userPos ? 'Stop' : 'My Location'}</span>
          </button>

          <button
            className={`tm-action-btn ${showRoutePlanner ? 'tm-action-active' : ''}`}
            onClick={() => { setShowRoutePlanner(v => !v); if (showRoutePlanner) clearRoutes(); }}
            title="Route Planner"
          >
            <span className="tm-action-btn-icon"><Icons.Route /></span>
            <span className="tm-action-btn-label">Routes</span>
          </button>

          <button
            className={`tm-action-btn ${showAnalytics ? 'tm-action-active' : ''}`}
            onClick={() => setShowAnalytics(v => !v)}
            title="Analytics Panel"
          >
            <span className="tm-action-btn-icon"><Icons.Chart /></span>
            <span className="tm-action-btn-label">Analytics</span>
          </button>

          <button
            className="tm-action-btn tm-action-primary"
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            title="Add location"
          >
            <span className="tm-action-btn-icon"><Icons.Plus /></span>
            <span className="tm-action-btn-label">Add</span>
          </button>

          <button
            className={`tm-action-btn ${showTable ? 'tm-action-active' : ''}`}
            onClick={() => setShowTable(v => !v)}
            title="Location table"
          >
            <span className="tm-action-btn-icon"><Icons.Table /></span>
            <span className="tm-action-btn-label">Table</span>
          </button>

          <button className="tm-action-btn" onClick={fetchLocations} title="Refresh data">
            <span className="tm-action-btn-icon"><Icons.Refresh /></span>
            <span className="tm-action-btn-label">Refresh</span>
          </button>
        </div>
      </div>

      {locError && <div className="tm-loc-error">⚠️ {locError}</div>}

      {/* ── Mini KPI strip (below header) ───────────────────────── */}
      <div className="tm-kpi-strip">
        {[
          { icon: '📍', val: counts.total,  label: 'Monitoring',   color: '#2563eb' },
          { icon: '🔴', val: counts.high,   label: 'High Traffic', color: '#ef4444' },
          { icon: '🟡', val: counts.medium, label: 'Moderate',     color: '#f59e0b' },
          { icon: '🟢', val: counts.low,    label: 'Clear Roads',  color: '#22c55e' },
          { icon: '🚨', val: counts.emerg,  label: 'Emergency',    color: '#dc2626' },
        ].map(k => (
          <div key={k.label} className="tm-strip-card" style={{ '--sc': k.color }}>
            <span className="tm-strip-icon">{k.icon}</span>
            <span className="tm-strip-val" style={{ color: k.color }}>{k.val}</span>
            <span className="tm-strip-label">{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Map + side panels layout ─────────────────────────────── */}
      <div className="tm-body">

        {/* Map area */}
        <div className="tm-map-wrap">
          {loading && locations.length === 0 ? (
            <div className="tm-map-loader">
              <div className="spinner" />
              <span>Loading traffic data…</span>
            </div>
          ) : (
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {locations.length > 0 && <FitBounds locations={locations} />}
              {flyTarget && <FlyTo target={flyTarget} zoom={flyZoom} />}

              {/* Heat circles */}
              {locations.map(loc => (
                <CircleMarker
                  key={`heat-${loc._id}`}
                  center={[loc.latitude, loc.longitude]}
                  radius={Math.max(22, (loc.trafficDensity || 50) * 0.5)}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: congestionColor(loc.congestionLevel),
                    fillOpacity: 0.16,
                  }}
                />
              ))}

              {/* Location markers */}
              {locations.map(loc => (
                <Marker
                  key={loc._id}
                  position={[loc.latitude, loc.longitude]}
                  icon={
                    selectedId === loc._id
                      ? makeDotIcon('#2563eb', 20)
                      : makeDotIcon(
                          loc.isEmergency ? '#b91c1c' : congestionColor(loc.congestionLevel),
                          loc.isEmergency ? 18 : 14,
                        )
                  }
                  eventHandlers={{
                    click: () => {
                      setSelectedId(loc._id);
                      setFlyTarget([loc.latitude, loc.longitude]);
                      setFlyZoom(15);
                    },
                  }}
                >
                  <Popup maxWidth={260}>
                    <div className="tm-popup">
                      <div className="tm-popup-title">
                        {loc.areaName}
                        {loc.isEmergency && <span className="badge badge-emergency" style={{ fontSize: '.68rem', marginLeft: 6 }}>🚨</span>}
                      </div>
                      <div className="tm-popup-grid">
                        <div className="tm-popup-row"><span>🚗 Vehicles</span><strong>{loc.vehicleCount}</strong></div>
                        <div className="tm-popup-row"><span>📊 Density</span><strong>{Math.round(loc.trafficDensity || 0)}%</strong></div>
                        <div className="tm-popup-row"><span>🚦 Signal</span><strong>{loc.signalStatus}</strong></div>
                        <div className="tm-popup-row">
                          <span>⚡ Level</span>
                          <strong style={{ color: congestionColor(loc.congestionLevel) }}>{loc.congestionLevel}</strong>
                        </div>
                      </div>
                      <div className="tm-popup-actions">
                        <button className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); setEditTarget(loc); setModalOpen(true); }}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEmergency(loc._id)}>
                          🚨
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(loc)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Searched location */}
              {searchedPos && (
                <Marker position={searchedPos} icon={searchedIcon}>
                  <Popup>
                    <div className="tm-popup">
                      <div className="tm-popup-title">📍 Search Result</div>
                      <p style={{ fontSize: '.78rem', color: '#64748b', marginTop: 4 }}>{searchedAddr}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Live user position */}
              {userPos && (
                <Marker position={userPos} icon={liveUserIcon}>
                  <Popup maxWidth={200}>
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <strong style={{ color: '#2563eb', display: 'block', marginBottom: 4 }}>📍 You Are Here</strong>
                      <span style={{ fontSize: '.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route polylines */}
              {routes.length > 0 && (
                <RouteLayer routes={routes} selectedIdx={selRouteIdx} onSelect={setSelRouteIdx} />
              )}
              {routeSrc && (
                <Marker position={[routeSrc.lat, routeSrc.lng]} icon={srcIcon}>
                  <Popup><strong>🟢 Source</strong><br />{routeSrc.name?.slice(0, 60)}</Popup>
                </Marker>
              )}
              {routeDst && (
                <Marker position={[routeDst.lat, routeDst.lng]} icon={dstIcon}>
                  <Popup><strong>🔴 Destination</strong><br />{routeDst.name?.slice(0, 60)}</Popup>
                </Marker>
              )}
            </MapContainer>
          )}

          {/* Map badge overlay */}
          <div className="tm-map-badge">
            <span className="tm-badge-live-dot" />
            Live Traffic · {locations.length} zones
          </div>

          {/* Route cards overlay */}
          {routes.length > 0 && (
            <div className="tm-route-overlay">
              <div className="tm-route-overlay-header">
                <span>🗺️ Route Options</span>
                <button className="btn btn-icon btn-sm" onClick={clearRoutes}><Icons.Close /></button>
              </div>
              <div className="tm-route-cards">
                {routes.map((r, i) => (
                  <div
                    key={i}
                    className={`tm-route-card ${selRouteIdx === i ? 'tm-route-card-sel' : ''}`}
                    style={{ '--rc': r.status.color }}
                    onClick={() => setSelRouteIdx(i)}
                  >
                    <div className="tm-rc-top">
                      <span className="tm-rc-dot" style={{ background: r.status.color }} />
                      <span className="tm-rc-name">{r.label}</span>
                      {r.recommended && <span className="tm-rc-best">★ Best</span>}
                    </div>
                    <div className="tm-rc-meta">
                      <span>📏 {r.distanceKm} km</span>
                      <span>⏱ {r.withTraffic} min</span>
                      <span style={{ color: r.status.color, fontWeight: 700 }}>{r.status.icon} {r.status.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Route Planner drawer */}
        {showRoutePlanner && (
          <RoutePlanner
            onRoutesReady={handleRoutesReady}
            onClose={() => { setShowRoutePlanner(false); clearRoutes(); }}
          />
        )}

        {/* Analytics panel */}
        {showAnalytics && (
          <AnalyticsPanel
            locations={locations}
            selectedId={selectedId}
            onSelectLocation={(loc) => {
              setSelectedId(loc._id);
              setFlyTarget([loc.latitude, loc.longitude]);
              setFlyZoom(15);
            }}
            onClose={() => setShowAnalytics(false)}
          />
        )}
      </div>

      {/* ── Collapsible Location Table ───────────────────────────── */}
      {showTable && (
        <div className="card tm-table-section" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Icons.Table />
              Traffic Locations
              <span className="tm-table-count">{locations.length}</span>
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-input-wrap" style={{ minWidth: 180 }}>
                <span className="search-icon">🔍</span>
                <input className="form-control" placeholder="Search…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ maxWidth: 130 }}
                value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                {['All','Low','Medium','High'].map(l => <option key={l}>{l}</option>)}
              </select>
              <button className="btn btn-icon" onClick={fetchLocations} title="Refresh"><Icons.Refresh /></button>
              <button className="btn btn-icon" onClick={() => setShowTable(false)} title="Close"><Icons.Close /></button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner" /><span>Loading…</span></div>
            ) : locations.length === 0 ? (
              <div className="loading-overlay">
                <p style={{ color: 'var(--text-muted)' }}>
                  No locations yet.{' '}
                  <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>Add first</button>
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Area</th><th>Coordinates</th><th>Vehicles</th>
                      <th>Density</th><th>Congestion</th><th>Signal</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc, idx) => (
                      <tr
                        key={loc._id}
                        className={`${loc.isEmergency ? 'row-emergency' : ''} ${selectedId === loc._id ? 'tm-row-selected' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSelectedId(loc._id); setFlyTarget([loc.latitude, loc.longitude]); setFlyZoom(15); }}
                      >
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <div className="font-semibold">{loc.areaName}</div>
                          {loc.isEmergency && <span className="badge badge-emergency" style={{ fontSize: '.65rem' }}>🚨 Emergency</span>}
                        </td>
                        <td className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                          {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                        </td>
                        <td><strong>{loc.vehicleCount}</strong></td>
                        <td>
                          <div className="tm-density-cell">
                            <div className="tm-density-mini">
                              <div style={{
                                width: `${loc.trafficDensity}%`,
                                background: congestionColor(loc.congestionLevel),
                                height: '100%', borderRadius: 'var(--radius-full)',
                              }} />
                            </div>
                            <span className="text-xs text-muted">{Math.round(loc.trafficDensity)}%</span>
                          </div>
                        </td>
                        <td><span className={`badge badge-${loc.congestionLevel?.toLowerCase()}`}>{loc.congestionLevel}</span></td>
                        <td>
                          <span className={`badge badge-${
                            loc.signalStatus === 'Green' || loc.signalStatus === 'Emergency Green' ? 'green'
                            : loc.signalStatus === 'Red' ? 'red'
                            : loc.signalStatus === 'Yellow' ? 'yellow' : 'offline'
                          }`}>{loc.signalStatus}</span>
                        </td>
                        <td>
                          <div className="action-btns" onClick={e => e.stopPropagation()}>
                            <button className="btn btn-icon btn-sm" title="Edit"
                              onClick={() => { setEditTarget(loc); setModalOpen(true); }}>
                              <Icons.Edit />
                            </button>
                            <button className={`btn btn-icon btn-sm ${loc.isEmergency ? 'btn-warning' : 'btn-ghost'}`}
                              title="Toggle emergency" onClick={() => handleEmergency(loc._id)}>
                              <Icons.Emergency />
                            </button>
                            <button className="btn btn-icon btn-sm btn-danger" title="Delete"
                              onClick={() => setDeleteConfirm(loc)}>
                              <Icons.Delete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────────── */}
      <TrafficModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* ── Delete Confirm Modal ─────────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Icons.Delete /> Confirm Delete
              </h3>
            </div>
            <div className="modal-body">
              <p>Delete <strong>{deleteConfirm.areaName}</strong>? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficMonitor;
