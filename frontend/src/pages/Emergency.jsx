/**
 * Emergency.jsx - Emergency Vehicle Management Page
 * Allows toggling emergency status for traffic locations
 */
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { trafficService } from '../services/trafficService';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import './Emergency.css';

// Nearby emergency services using Nominatim/Overpass
const SERVICE_TYPES = [
  { key: 'hospital',        label: 'Hospitals',         icon: '🏥', amenity: 'hospital',         color: '#ef4444' },
  { key: 'police',          label: 'Police Stations',   icon: '👮', amenity: 'police',           color: '#3b82f6' },
  { key: 'fuel',            label: 'Fuel Stations',     icon: '⛽',  amenity: 'fuel',             color: '#f59e0b' },
  { key: 'charging_station',label: 'EV Charging',       icon: '⚡',  amenity: 'charging_station', color: '#22c55e' },
];

const makeServiceIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:13px;height:13px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [13,13], iconAnchor: [6,6]
});

const NearbyServices = ({ emergencyActive, locations }) => {
  const [services, setServices] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [center,   setCenter]   = useState(null);
  const [searched, setSearched] = useState(false);

  const findServices = async () => {
    // Use first emergency location or first location as center
    const ref = locations.find(l => l.isEmergency) || locations[0];
    if (!ref) { toast.error('No locations available to search nearby services'); return; }
    const lat = ref.latitude, lon = ref.longitude;
    setCenter([lat, lon]);
    setLoading(true);
    const radius = 5000; // 5 km
    const results = {};
    await Promise.all(SERVICE_TYPES.map(async (svc) => {
      try {
        const query = `[out:json][timeout:10];node[amenity=${svc.amenity}](around:${radius},${lat},${lon});out 6;`;
        const r = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST', body: query
        });
        const data = await r.json();
        results[svc.key] = (data.elements || []).map(el => ({
          name: el.tags?.name || svc.label.slice(0,-1),
          lat: el.lat, lon: el.lon,
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
        }));
      } catch { results[svc.key] = []; }
    }));
    setServices(results);
    setLoading(false);
    setSearched(true);
  };

  const totalFound = Object.values(services).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="emg-nearby">
      <div className="emg-nearby-header">
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>📍 Nearby Emergency Services</h3>
          <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Hospitals, Police, Fuel &amp; EV Charging within 5 km
          </p>
        </div>
        <button className="btn btn-primary" onClick={findServices} disabled={loading || !locations.length}>
          {loading ? '⏳ Searching...' : '🔍 Find Nearby Services'}
        </button>
      </div>

      {searched && !loading && (
        <>
          {/* Service summary cards */}
          <div className="emg-svc-grid">
            {SERVICE_TYPES.map(svc => (
              <div key={svc.key} className="emg-svc-card" style={{ borderTop: `3px solid ${svc.color}` }}>
                <span className="emg-svc-icon">{svc.icon}</span>
                <span className="emg-svc-count" style={{ color: svc.color }}>{services[svc.key]?.length || 0}</span>
                <span className="emg-svc-label">{svc.label}</span>
              </div>
            ))}
          </div>

          {totalFound === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>
              No services found within 5 km. Try a location in a more populated area.
            </p>
          )}

          {/* Map + list */}
          {totalFound > 0 && center && (
            <div className="emg-svc-layout">
              <div className="emg-svc-map">
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OSM</a>' />
                  {/* Center marker */}
                  <Marker position={center} icon={L.divIcon({
                    className: '',
                    html: `<div style="width:16px;height:16px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #dc262655"></div>`,
                    iconSize:[16,16],iconAnchor:[8,8]
                  })}>
                    <Popup>🚨 Emergency Reference Point</Popup>
                  </Marker>
                  {/* Service markers */}
                  {SERVICE_TYPES.map(svc =>
                    (services[svc.key] || []).map((s, i) => (
                      <Marker key={`${svc.key}-${i}`} position={[s.lat, s.lon]} icon={makeServiceIcon(svc.color)}>
                        <Popup>
                          <strong>{svc.icon} {s.name}</strong>
                          {s.phone && <><br />📞 {s.phone}</>}
                        </Popup>
                      </Marker>
                    ))
                  )}
                </MapContainer>
              </div>
              <div className="emg-svc-list">
                {SERVICE_TYPES.map(svc => (
                  (services[svc.key] || []).length > 0 && (
                    <div key={svc.key} className="emg-svc-section">
                      <div className="emg-svc-section-title" style={{ color: svc.color }}>
                        {svc.icon} {svc.label} ({services[svc.key].length})
                      </div>
                      {services[svc.key].map((s, i) => (
                        <div key={i} className="emg-svc-item">
                          <span className="emg-svc-item-name">{s.name}</span>
                          {s.phone && <span className="emg-svc-item-phone">📞 {s.phone}</span>}
                          <a
                            href={`https://www.openstreetmap.org/directions?to=${s.lat},${s.lon}`}
                            target="_blank" rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                          >🗯️</a>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Emergency = () => {
  const [locations, setLocations]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [processing, setProcessing]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await trafficService.getAll({});
      setLocations(res.data);
    } catch { toast.error('Failed to load locations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const emergencyLocations = locations.filter(l => l.isEmergency);
  const normalLocations    = locations.filter(l => !l.isEmergency);

  const handleToggle = async (loc) => {
    setProcessing(loc._id);
    try {
      const res = await trafficService.toggleEmergency(loc._id);
      toast.success(res.message);
      load();
    } catch { toast.error('Failed to toggle emergency'); }
    finally { setProcessing(null); }
  };

  // Calculate clearance time (simulated)
  const clearanceTime = (vehicleCount) => Math.ceil(vehicleCount * 0.5);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div>
      {/* Emergency Banner */}
      {emergencyLocations.length > 0 && (
        <div className="emergency-banner">
          🚨 EMERGENCY ALERT — {emergencyLocations.length} Location(s) Active — All signals set to EMERGENCY GREEN
        </div>
      )}

      <div className="page-header" style={{ marginTop: emergencyLocations.length ? '12px' : 0 }}>
        <div>
          <h2 className="page-title">Emergency Module</h2>
          <p className="page-subtitle">Manage emergency vehicle clearance at traffic locations</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>🔄 Refresh</button>
      </div>

      {/* Stats row */}
      <div className="emg-stats">
        <div className="emg-stat-card">
          <span className="emg-stat-icon">🚨</span>
          <span className="emg-stat-val">{emergencyLocations.length}</span>
          <span className="emg-stat-label">Active Emergency</span>
        </div>
        <div className="emg-stat-card">
          <span className="emg-stat-icon">🟢</span>
          <span className="emg-stat-val">{normalLocations.length}</span>
          <span className="emg-stat-label">Normal Locations</span>
        </div>
        <div className="emg-stat-card">
          <span className="emg-stat-icon">📍</span>
          <span className="emg-stat-val">{locations.length}</span>
          <span className="emg-stat-label">Total Locations</span>
        </div>
      </div>

      {/* Active Emergencies */}
      {emergencyLocations.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="section-title">🚨 Active Emergency Locations</h3>
          <div className="emergency-cards">
            {emergencyLocations.map(loc => (
              <div className="emergency-location-card active-emergency" key={loc._id}>
                <div className="elc-top">
                  <div className="elc-info">
                    <h4 className="elc-name">{loc.areaName}</h4>
                    <span className="badge badge-emergency">🚨 Emergency Active</span>
                  </div>
                  <div className="elc-signal emergency-green">⚡ Emergency Green</div>
                </div>
                <div className="elc-details">
                  <div className="elc-detail"><span>🚗 Vehicles</span><strong>{loc.vehicleCount}</strong></div>
                  <div className="elc-detail"><span>⏱️ Est. Clearance</span><strong>~{clearanceTime(loc.vehicleCount)} sec</strong></div>
                  <div className="elc-detail"><span>📊 Congestion</span><strong>{loc.congestionLevel}</strong></div>
                  <div className="elc-detail"><span>📍 Coords</span><strong>{loc.latitude?.toFixed(3)}, {loc.longitude?.toFixed(3)}</strong></div>
                </div>
                <div className="elc-clearance-bar">
                  <div className="clearance-fill" />
                </div>
                <button
                  className="btn btn-warning btn-full"
                  onClick={() => handleToggle(loc)}
                  disabled={processing === loc._id}
                >
                  {processing === loc._id ? '⏳ Processing...' : '✅ Deactivate Emergency'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal Locations */}
      <div>
        <h3 className="section-title">📍 All Traffic Locations</h3>
        {locations.length === 0 ? (
          <div className="loading-overlay">
            <p>No locations found. Add locations in Traffic Monitor first.</p>
          </div>
        ) : (
          <div className="emergency-cards">
            {locations.map(loc => (
              <div
                key={loc._id}
                className={`emergency-location-card ${loc.isEmergency ? 'active-emergency' : ''}`}
              >
                <div className="elc-top">
                  <div className="elc-info">
                    <h4 className="elc-name">{loc.areaName}</h4>
                    <span className={`badge badge-${loc.congestionLevel?.toLowerCase()}`}>{loc.congestionLevel}</span>
                  </div>
                  <div className={`elc-signal ${loc.signalStatus === 'Emergency Green' ? 'emergency-green' : loc.signalStatus.toLowerCase()}`}>
                    {loc.signalStatus === 'Green' ? '🟢' : loc.signalStatus === 'Red' ? '🔴' : loc.signalStatus === 'Yellow' ? '🟡' : '⚡'}
                    {' '}{loc.signalStatus}
                  </div>
                </div>

                <div className="elc-details">
                  <div className="elc-detail"><span>🚗 Vehicles</span><strong>{loc.vehicleCount}</strong></div>
                  <div className="elc-detail"><span>📊 Density</span><strong>{Math.round(loc.trafficDensity)}%</strong></div>
                  {loc.isEmergency && (
                    <div className="elc-detail"><span>⏱️ Est. Clearance</span><strong>~{clearanceTime(loc.vehicleCount)}s</strong></div>
                  )}
                </div>

                <button
                  className={`btn btn-full ${loc.isEmergency ? 'btn-warning' : 'btn-danger'}`}
                  onClick={() => handleToggle(loc)}
                  disabled={processing === loc._id}
                >
                  {processing === loc._id ? '⏳ Processing...' :
                    loc.isEmergency ? '✅ Deactivate Emergency' : '🚨 Activate Emergency'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="emg-info-box">
        <h4>ℹ️ How Emergency Mode Works</h4>
        <ul>
          <li>🚨 Activating emergency changes signal status to <strong>Emergency Green</strong></li>
          <li>⚡ Emergency banner appears at the top of the page</li>
          <li>⏱️ Estimated clearance time is calculated based on vehicle count</li>
          <li>✅ Deactivate once the emergency vehicle has passed</li>
          <li>📊 All changes are reflected in real-time on the map and dashboard</li>
        </ul>
      </div>

      {/* Nearby Emergency Services */}
      <NearbyServices emergencyActive={emergencyLocations.length > 0} locations={locations} />
    </div>
  );
};

export default Emergency;
