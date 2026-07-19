import React, { useEffect, useState, useCallback } from 'react';
import { alertService } from '../services/trafficService';
import { toast } from 'react-toastify';
import './Alerts.css';

const severityConfig = {
  critical:  { color: '#dc2626', bg: '#fee2e2', icon: '🚨' },
  high:      { color: '#ef4444', bg: '#fef2f2', icon: '🔴' },
  medium:    { color: '#f59e0b', bg: '#fffbeb', icon: '🟡' },
};

const Alerts = () => {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await alertService.getAlerts();
      setAlerts(res.data);
      setLastRefresh(new Date());
      if (!silent) toast.success(`${res.data.length} alert(s) loaded`);
    } catch { if (!silent) toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const critical = alerts.filter(a => a.severity === 'critical');
  const high     = alerts.filter(a => a.severity === 'high');
  const medium   = alerts.filter(a => a.severity === 'medium');

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Loading alerts...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🚨 Real-Time Alerts</h2>
          <p className="page-subtitle">
            {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Monitoring congestion hotspots'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="auto-refresh-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            <span>Auto-refresh (30s)</span>
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => load()}>🔄 Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div className="alerts-summary">
        {[
          { label: 'Total Alerts',  value: alerts.length,   color: '#3b82f6' },
          { label: 'Critical',      value: critical.length, color: '#dc2626' },
          { label: 'High',          value: high.length,     color: '#ef4444' },
          { label: 'Medium',        value: medium.length,   color: '#f59e0b' },
        ].map((s, i) => (
          <div className="alert-stat" key={i}>
            <span className="alert-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="alert-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
          <h3>All Clear!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No active congestion alerts at this time.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert, i) => {
            const cfg = severityConfig[alert.severity] || severityConfig.medium;
            return (
              <div key={i} className="alert-card" style={{ borderLeft: `5px solid ${cfg.color}`, background: cfg.bg }}>
                <div className="alert-card-header">
                  <span className="alert-icon">{cfg.icon}</span>
                  <div className="alert-info">
                    <strong className="alert-area">{alert.areaName}</strong>
                    <span className="alert-type" style={{ color: cfg.color }}>
                      {alert.type.toUpperCase()} — {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="alert-meta">
                    <span className="alert-vehicles">🚗 {alert.vehicleCount} vehicles</span>
                    <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <p className="alert-message">{alert.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
