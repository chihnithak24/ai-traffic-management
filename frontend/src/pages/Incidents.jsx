import React, { useEffect, useState, useCallback } from 'react';
import { incidentService } from '../services/trafficService';
import { toast } from 'react-toastify';
import './Incidents.css';

const TYPES     = ['Accident', 'Road Block', 'Construction', 'Heavy Traffic', 'Flood', 'Broken Signal', 'Vehicle Breakdown'];
const SEVERITIES= ['Low', 'Medium', 'High', 'Critical'];
const STATUSES  = ['Open', 'In Progress', 'Resolved'];

const EMPTY_FORM = { type: 'Accident', location: '', city: '', description: '', severity: 'Medium' };

const severityColor = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#dc2626' };
const statusColor   = { Open: '#ef4444', 'In Progress': '#f59e0b', Resolved: '#22c55e' };
const typeIcon = {
  'Accident': '💥', 'Road Block': '🚧', 'Construction': '🏗️',
  'Heavy Traffic': '🚗', 'Flood': '🌊', 'Broken Signal': '🚦', 'Vehicle Breakdown': '🔧'
};

const IncidentModal = ({ isOpen, onClose, onSave, initial }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || EMPTY_FORM); }, [initial, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim()) { toast.error('Location is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 className="modal-title">{initial?._id ? '✏️ Edit Incident' : '🚨 Report Incident'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-control" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-control" placeholder="MG Road, Junction 4" value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" placeholder="Bangalore" value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            {initial?._id && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} placeholder="Describe the incident..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : initial?._id ? 'Update' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Incidents = () => {
  const [incidents, setIncidents]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterStatus, setFilterStatus]   = useState('All');
  const [filterType, setFilterType]       = useState('All');
  const [search, setSearch]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incidentService.getAll({ status: filterStatus, type: filterType });
      setIncidents(res.data);
    } catch { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (editTarget?._id) {
        await incidentService.update(editTarget._id, data);
        toast.success('Incident updated');
      } else {
        await incidentService.create(data);
        toast.success('Incident reported');
      }
      setModalOpen(false);
      setEditTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await incidentService.remove(id);
      toast.success('Incident deleted');
      setDeleteConfirm(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const handleStatusChange = async (incident, status) => {
    try {
      await incidentService.update(incident._id, { ...incident, status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const filtered = incidents.filter(i =>
    i.location.toLowerCase().includes(search.toLowerCase()) ||
    (i.city || '').toLowerCase().includes(search.toLowerCase()) ||
    i.type.toLowerCase().includes(search.toLowerCase())
  );

  // Summary counts
  const open       = incidents.filter(i => i.status === 'Open').length;
  const inProgress = incidents.filter(i => i.status === 'In Progress').length;
  const resolved   = incidents.filter(i => i.status === 'Resolved').length;
  const critical   = incidents.filter(i => i.severity === 'Critical' || i.severity === 'High').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🚧 Incident Reports</h2>
          <p className="page-subtitle">Track and manage road incidents in real-time</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          + Report Incident
        </button>
      </div>

      {/* Summary */}
      <div className="inc-summary">
        {[
          { label: 'Total',       value: incidents.length, color: '#3b82f6' },
          { label: 'Open',        value: open,             color: '#ef4444' },
          { label: 'In Progress', value: inProgress,       color: '#f59e0b' },
          { label: 'Resolved',    value: resolved,         color: '#22c55e' },
          { label: 'High Risk',   value: critical,         color: '#dc2626' },
        ].map((s, i) => (
          <div className="inc-stat" key={i}>
            <span className="inc-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="inc-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="search-bar">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input className="form-control" placeholder="Search by location, city, or type..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-control filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="All">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={load}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Incidents ({filtered.length})</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>Loading incidents...</span></div>
          ) : filtered.length === 0 ? (
            <div className="loading-overlay">
              <div style={{ fontSize: '2.5rem' }}>✅</div>
              <p>{incidents.length === 0 ? 'No incidents reported yet.' : 'No incidents match your filters.'}</p>
              {incidents.length === 0 && (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
                  Report First Incident
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Reported</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc, idx) => (
                    <tr key={inc._id} className={inc.severity === 'Critical' ? 'row-emergency' : ''}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>
                        <div className="inc-type-cell">
                          <span className="inc-type-icon">{typeIcon[inc.type] || '⚠️'}</span>
                          <span className="font-semibold">{inc.type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">{inc.location}</div>
                        {inc.city && <div className="text-xs text-muted">{inc.city}</div>}
                      </td>
                      <td>
                        <span className="inc-severity-badge" style={{
                          color: severityColor[inc.severity],
                          background: `${severityColor[inc.severity]}18`,
                          border: `1px solid ${severityColor[inc.severity]}40`
                        }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <select
                          className="inc-status-select"
                          value={inc.status}
                          style={{ color: statusColor[inc.status] }}
                          onChange={e => handleStatusChange(inc, e.target.value)}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="text-xs text-muted inc-desc">
                        {inc.description || '—'}
                      </td>
                      <td className="text-xs text-muted">
                        {new Date(inc.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-ghost btn-sm" title="Edit"
                            onClick={() => { setEditTarget(inc); setModalOpen(true); }}>✏️</button>
                          <button className="btn btn-danger btn-sm" title="Delete"
                            onClick={() => setDeleteConfirm(inc)}>🗑️</button>
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

      {/* Add/Edit Modal */}
      <IncidentModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Delete incident at <strong>{deleteConfirm.location}</strong>?</p>
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

export default Incidents;
