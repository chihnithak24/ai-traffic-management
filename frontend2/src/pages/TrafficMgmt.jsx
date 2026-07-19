/**
 * TrafficMgmt.jsx — Full CRUD traffic locations page
 */
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trafficSvc } from '../services/trafficService';
import { toast } from 'react-toastify';

const LEVELS = ['All', 'Low', 'Medium', 'High', 'Accident', 'Road Closed'];
const SIGNALS = ['Green', 'Red', 'Yellow', 'Offline'];
const EMPTY = { areaName: '', city: '', state: '', latitude: '', longitude: '', vehicleCount: '', signalStatus: 'Green', congestionLevel: '' };

// Density level classification
const getDensityLevel = (vc) => {
  if (vc <= 50)  return { label: 'Low',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', bar: 'bg-emerald-400' };
  if (vc <= 150) return { label: 'Medium',     color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-100 dark:bg-amber-900/30',    bar: 'bg-amber-400' };
  if (vc <= 300) return { label: 'High',       color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-100 dark:bg-orange-900/30',  bar: 'bg-orange-400' };
  return           { label: 'Very High',  color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/30',        bar: 'bg-red-400' };
};

// Vehicle breakdown card
const VehicleDetail = ({ loc, onClose }) => {
  const bd = loc.vehicleBreakdown || {};
  const dl = getDensityLevel(loc.vehicleCount);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="glass rounded-2xl p-5 border-l-4 border-indigo-400">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{loc.areaName}</h3>
          <p className="text-xs text-gray-500">{loc.city}{loc.state ? `, ${loc.state}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dl.bg} ${dl.color}`}>{dl.label} Traffic</span>
          <button onClick={onClose} className="btn-icon text-xs">✕</button>
        </div>
      </div>

      {/* Location info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { icon: '📍', label: 'Latitude',  value: loc.latitude?.toFixed(4) },
          { icon: '📍', label: 'Longitude', value: loc.longitude?.toFixed(4) },
          { icon: '📊', label: 'Density',   value: `${Math.round(loc.trafficDensity)}%` },
          { icon: '💨', label: 'Avg Speed', value: `${Math.round(loc.averageSpeed || 0)} km/h` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-base">{icon}</p>
            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Density bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold text-gray-600 dark:text-gray-400">Traffic Density</span>
          <span className={`font-bold ${dl.color}`}>{Math.round(loc.trafficDensity)}% — {dl.label}</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${loc.trafficDensity}%` }} transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${dl.bar}`} />
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>0 — Low</span><span>51 — Medium</span><span>151 — High</span><span>301+ Very High</span>
        </div>
      </div>

      {/* Vehicle breakdown */}
      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Vehicle Breakdown</h4>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { icon: '🚗', label: 'Cars',       value: bd.cars      || 0 },
          { icon: '🏍️', label: 'Bikes',      value: bd.bikes     || 0 },
          { icon: '🚌', label: 'Buses',      value: bd.buses     || 0 },
          { icon: '🚛', label: 'Trucks',     value: bd.trucks    || 0 },
          { icon: '🛺', label: 'Autos',      value: bd.autos     || 0 },
          { icon: '🚑', label: 'Emergency',  value: bd.emergency || 0 },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl py-2 px-2 text-center">
            <p className="text-xl">{icon}</p>
            <p className="font-bold text-lg text-indigo-700 dark:text-indigo-300 leading-none mt-1">{value}</p>
            <p className="text-[10px] text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-indigo-600 dark:bg-indigo-700 rounded-xl text-white">
        <span className="text-sm font-semibold">Total Vehicles</span>
        <span className="text-2xl font-bold">{loc.vehicleCount}</span>
      </div>
    </motion.div>
  );
};

const congBadge = (l) => {
  const m = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Accident: 'badge-accident', 'Road Closed': 'badge-closed' };
  return <span className={`badge ${m[l] || 'badge-medium'}`}>{l}</span>;
};

const sigBadge = (s) => {
  const m = { Green: 'badge-low', Red: 'badge-high', Yellow: 'badge-medium', 'Emergency Green': 'badge-emergency', Offline: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
  return <span className={`badge ${m[s] || ''}`}>{s}</span>;
};

// ── Modal ─────────────────────────────────────────────────────
const TrafficModal = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState({});

  useEffect(() => { setForm(initial || EMPTY); setErrs({}); }, [initial, open]);

  const validate = () => {
    const e = {};
    if (!form.areaName?.trim()) e.areaName = 'Required';
    if (!form.city?.trim())     e.city = 'Required';
    if (!form.state?.trim())    e.state = 'Required';
    if (form.latitude === '' || isNaN(form.latitude))  e.latitude = 'Valid number';
    if (form.longitude === '' || isNaN(form.longitude)) e.longitude = 'Valid number';
    if (form.vehicleCount === '' || isNaN(form.vehicleCount) || +form.vehicleCount < 0) e.vehicleCount = 'Non-negative number';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(); if (Object.keys(e).length) { setErrs(e); return; }
    setSaving(true);
    await onSave({ ...form, latitude: +form.latitude, longitude: +form.longitude, vehicleCount: +form.vehicleCount });
    setSaving(false);
  };

  if (!open) return null;

  const Field = ({ k, label, type = 'text', placeholder, full = false }) => (
    <div className={full ? 'col-span-2' : ''}>
      <label className="form-label text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">{label}</label>
      <input type={type} className={`input ${errs[k] ? 'border-red-400 focus:ring-red-400' : ''}`}
        placeholder={placeholder} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />
      {errs[k] && <p className="text-red-500 text-xs mt-1">{errs[k]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="modal-overlay">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-lg">{initial?._id ? '✏️ Edit Location' : '➕ Add New Location'}</h3>
              <button onClick={onClose} className="btn-icon">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field k="areaName"     label="Area Name *"    placeholder="MG Road Junction"   full />
                <Field k="city"         label="City *"         placeholder="Bengaluru" />
                <Field k="state"        label="State *"        placeholder="Karnataka" />
                <Field k="vehicleCount" label="Vehicle Count"  type="number" placeholder="75" />
                <Field k="latitude"     label="Latitude *"     type="number" placeholder="12.9716" />
                <Field k="longitude"    label="Longitude *"    type="number" placeholder="77.5946" />
                <div>
                  <label className="form-label text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Signal Status</label>
                  <select className="input" value={form.signalStatus} onChange={e => setForm({ ...form, signalStatus: e.target.value })}>
                    {SIGNALS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Congestion Override</label>
                  <select className="input" value={form.congestionLevel} onChange={e => setForm({ ...form, congestionLevel: e.target.value })}>
                    <option value="">Auto (from vehicle count)</option>
                    {['Low','Medium','High','Accident','Road Closed'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : initial?._id ? 'Update' : 'Add Location'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ── Main ──────────────────────────────────────────────────────
export default function TrafficMgmt() {
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState({ open: false, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('All');
  const [detailLoc, setDetailLoc]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await trafficSvc.getAll({ search, congestionLevel: filter });
      setLocations(r.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (data) => {
    try {
      if (modal.data?._id) {
        await trafficSvc.update(modal.data._id, data);
        toast.success('Updated!');
      } else {
        await trafficSvc.create(data);
        toast.success('Location added!');
      }
      setModal({ open: false, data: null });
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async () => {
    try {
      await trafficSvc.remove(deleteTarget._id);
      toast.success('Deleted!');
      setDeleteTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Traffic Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{locations.length} locations monitored</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, data: null })}>➕ Add Location</button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input className="input pl-9" placeholder="Search locations..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input max-w-[180px]" value={filter} onChange={e => setFilter(e.target.value)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button className="btn-secondary gap-1.5" onClick={fetch}>🔄 Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Traffic Locations</h3>
          <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">{locations.length} results</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <div className="text-4xl">📍</div>
            <p>No locations found.</p>
            <button className="btn-primary mt-2" onClick={() => setModal({ open: true, data: null })}>Add First Location</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Area</th><th>City / State</th>
                  <th>Vehicles</th><th>Speed</th><th>Density</th>
                  <th>Congestion</th><th>Signal</th><th>Updated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, idx) => (
                  <motion.tr key={loc._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                    className={loc.isEmergency ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                    <td className="text-gray-400">{idx + 1}</td>
                    <td>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{loc.areaName}</div>
                      {loc.isEmergency && <span className="badge badge-emergency mt-1">🚨 {loc.emergencyType}</span>}
                    </td>
                    <td><div className="text-sm">{loc.city}</div><div className="text-xs text-gray-400">{loc.state}</div></td>
                    <td className="font-bold">{loc.vehicleCount}</td>
                    <td>{Math.round(loc.averageSpeed)} km/h</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${loc.trafficDensity > 70 ? 'bg-red-500' : loc.trafficDensity > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.round(loc.trafficDensity)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(loc.trafficDensity)}%</span>
                      </div>
                    </td>
                    <td>{congBadge(loc.congestionLevel)}</td>
                    <td>{sigBadge(loc.signalStatus)}</td>
                    <td className="text-xs text-gray-400">{new Date(loc.lastUpdated).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="btn-icon text-sm" title="View Details" onClick={() => setDetailLoc(loc)}>🔍</button>
                        <button className="btn-icon text-sm" title="Edit" onClick={() => setModal({ open: true, data: loc })}>✏️</button>
                        <button className={`btn-icon text-sm ${loc.isEmergency ? 'text-red-500' : ''}`} title="Emergency"
                          onClick={async () => { try { await trafficSvc.toggleEmergency(loc._id); toast.success('Emergency toggled'); fetch(); } catch { toast.error('Failed'); } }}>
                          🚨
                        </button>
                        <button className="btn-icon text-sm text-red-400" title="Delete" onClick={() => setDeleteTarget(loc)}>🗑️</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle detail panel */}
      <AnimatePresence>
        {detailLoc && <VehicleDetail loc={detailLoc} onClose={() => setDetailLoc(null)} />}
      </AnimatePresence>

      {/* Add/Edit modal */}
      <TrafficModal open={modal.open} onClose={() => setModal({ open: false, data: null })} onSave={handleSave} initial={modal.data} />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Delete Location?</h3>
              <p className="text-sm text-gray-500 mt-1 mb-5">This will permanently delete <strong>{deleteTarget.areaName}</strong>.</p>
              <div className="flex justify-center gap-3">
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
