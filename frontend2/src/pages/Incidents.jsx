/**
 * Incidents.jsx — Incident Reporting Page
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import api from '../services/api';

const TYPES = ['Accident', 'Road Block', 'Construction', 'Heavy Traffic', 'Flood', 'Broken Signal', 'Vehicle Breakdown'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

const TYPE_META = {
  'Accident':          { icon: '🚗', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'Road Block':        { icon: '🚧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  'Construction':      { icon: '🏗️', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  'Heavy Traffic':     { icon: '🚦', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  'Flood':             { icon: '🌊', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'Broken Signal':     { icon: '🔴', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  'Vehicle Breakdown': { icon: '🔧', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

const SEV_COLOR = {
  Low:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  High:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_COLOR = {
  Open:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'In Progress':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Resolved:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const EMPTY_FORM = { type: 'Accident', location: '', city: '', description: '', severity: 'Medium' };

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType,   setFilterType]   = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/incidents');
      setIncidents(r.data.data || []);
    } catch { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim()) { toast.error('Location is required'); return; }
    setSaving(true);
    try {
      await api.post('/incidents', form);
      toast.success('Incident reported!');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Submit failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/incidents/${id}`, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const deleteIncident = async (id) => {
    try {
      await api.delete(`/incidents/${id}`);
      toast.success('Incident deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const visible = incidents.filter(i => {
    if (filterStatus !== 'All' && i.status !== filterStatus) return false;
    if (filterType   !== 'All' && i.type   !== filterType)   return false;
    return true;
  });

  const counts = {
    open:     incidents.filter(i => i.status === 'Open').length,
    progress: incidents.filter(i => i.status === 'In Progress').length,
    resolved: incidents.filter(i => i.status === 'Resolved').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Incident Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">{incidents.length} total incidents tracked</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">🚨 Report Incident</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: counts.open,     color: 'text-red-500',     icon: '🔴', border: 'border-red-300 dark:border-red-700' },
          { label: 'In Progress', value: counts.progress, color: 'text-amber-500', icon: '🟡', border: 'border-amber-300 dark:border-amber-700' },
          { label: 'Resolved', value: counts.resolved, color: 'text-emerald-500', icon: '🟢', border: 'border-emerald-300 dark:border-emerald-700' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-2xl p-4 text-center border-l-4 ${s.border}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div>
          <span className="text-xs font-semibold text-gray-500 mr-2">Status:</span>
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl mr-1 transition-all ${filterStatus === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 mr-2">Type:</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <option>All</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{visible.length} results</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 space-y-3 text-gray-400">
          <div className="text-5xl">📋</div>
          <p className="font-semibold">No incidents found</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Report First Incident</button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visible.map((inc, i) => {
              const meta = TYPE_META[inc.type] || { icon: '⚠️', color: '' };
              return (
                <motion.div key={inc._id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{inc.type}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEV_COLOR[inc.severity]}`}>{inc.severity}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inc.status]}`}>{inc.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          📍 {inc.location}{inc.city ? `, ${inc.city}` : ''}
                        </p>
                        {inc.description && (
                          <p className="text-xs text-gray-500 mt-1">{inc.description}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          🕒 {new Date(inc.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {inc.reportedBy?.name && ` · by ${inc.reportedBy.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={inc.status} onChange={e => updateStatus(inc._id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => deleteIncident(inc._id)}
                        className="btn-icon text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="modal">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg">🚨 Report New Incident</h3>
                <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Incident Type *</label>
                    <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Location / Road *</label>
                    <input className="input" placeholder="e.g. MG Road, Madhapur Junction" value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">City</label>
                    <input className="input" placeholder="e.g. Hyderabad" value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Severity</label>
                    <select className="input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                      {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Description</label>
                    <textarea className="input resize-none" rows={3} placeholder="Describe the incident..."
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : '🚨 Submit Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
