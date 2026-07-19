/**
 * Dashboard.jsx — Smart City Glassmorphism Dashboard
 * Real-time traffic data, AI insights, download PDF, refresh
 */
import React, { useEffect, useState, useCallback } from 'react';
import { dashboardService, trafficService, predictService } from '../services/trafficService';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Dashboard.css';

/* ── helpers ── */
const levelColor  = (l) => l === 'High' ? '#ef4444' : l === 'Medium' ? '#f59e0b' : '#22c55e';
const levelBg     = (l) => l === 'High' ? 'rgba(239,68,68,.12)' : l === 'Medium' ? 'rgba(245,158,11,.12)' : 'rgba(34,197,94,.12)';
const levelBorder = (l) => l === 'High' ? 'rgba(239,68,68,.4)' : l === 'Medium' ? 'rgba(245,158,11,.4)' : 'rgba(34,197,94,.4)';
const levelIcon   = (l) => l === 'High' ? '🔴' : l === 'Medium' ? '🟡' : '🟢';

const StatusPill = ({ level }) => (
  <span className="db-pill" style={{ color: levelColor(level), background: levelBg(level) }}>
    {levelIcon(level)} {level}
  </span>
);

const CongestionBar = ({ label, count, total, color }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="congestion-bar-row">
      <div className="congestion-bar-label">
        <span>{label}</span>
        <span className="congestion-bar-count">{count} ({pct}%)</span>
      </div>
      <div className="congestion-bar-track">
        <div className="congestion-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

/* ── PDF Export ── */
const exportPDF = () => {
  toast.info('Preparing PDF report…');
  setTimeout(() => window.print(), 300);
};

/* ── Skeleton ── */
const DashSkeleton = () => (
  <div>
    <div className="db-skel-row">
      {[1,2,3,4,5].map(i => <div key={i} className="db-skel-card skeleton" />)}
    </div>
    <div className="db-skel-grid">
      <div className="db-skel-panel skeleton" />
      <div className="db-skel-panel skeleton" />
      <div className="db-skel-panel skeleton" />
      <div className="db-skel-panel skeleton" />
    </div>
  </div>
);

/* ── main component ── */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats,     setStats]     = useState(null);
  const [locations, setLocations] = useState([]);
  const [bulkPreds, setBulkPreds] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, locsRes] = await Promise.all([
        dashboardService.getStats(),
        trafficService.getAll({ limit: 100 }),
      ]);
      setStats(statsRes.data);
      const locs = locsRes.data || [];
      setLocations(locs);
      if (locs.length > 0) {
        try {
          const bp = await predictService.bulkPredict();
          setBulkPreds(bp.data || []);
        } catch { /* non-critical */ }
      }
      if (silent) toast.success('Dashboard refreshed');
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashSkeleton />;
  if (!stats)  return <div className="loading-overlay"><p>Failed to load dashboard.</p></div>;

  const { overview, congestionBreakdown, topCongested, recentLocations } = stats;
  const totalLocs = overview.totalLocations || 0;
  const cbTotal   = (congestionBreakdown.low + congestionBreakdown.medium + congestionBreakdown.high) || 1;

  const highRoads = locations
    .filter(l => l.congestionLevel === 'High' || l.congestionLevel === 'Accident')
    .sort((a, b) => b.vehicleCount - a.vehicleCount)
    .slice(0, 5);

  const aiRoutes = locations
    .filter(l => l.congestionLevel === 'Low' || l.congestionLevel === 'Medium')
    .sort((a, b) => a.vehicleCount - b.vehicleCount)
    .slice(0, 4);

  const avgWait = bulkPreds.length > 0
    ? Math.round(bulkPreds.reduce((s, p) => s + (p.prediction?.estimatedWaitingTime || 0), 0) / bulkPreds.length)
    : null;

  const recentPreds = bulkPreds.slice(0, 5);

  const statusSummary = {
    low:    congestionBreakdown.low    || 0,
    medium: congestionBreakdown.medium || 0,
    high:   congestionBreakdown.high   || 0,
  };

  return (
    <div>
      {/* Hero welcome bar */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <h2>Welcome back, {user?.name} 👋</h2>
          <p>Smart city traffic control — real-time AI-powered overview</p>
        </div>
        <div className="dash-hero-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh all data"
          >
            {refreshing ? '⏳' : '🔄'} Refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportPDF} title="Download PDF report">
            📄 PDF Report
          </button>
          <Link to="/traffic" className="btn btn-primary btn-sm">+ Add Location</Link>
          <Link to="/predict" className="btn btn-ghost btn-sm">🤖 AI Predict</Link>
        </div>
      </div>

      {/* KPI stat row */}
      <div className="db-stat-row">
        {[
          { border: '#0ea5e9', iconBg: 'rgba(14,165,233,.12)', icon: '📍', val: totalLocs,            label: 'Monitoring Locations', valColor: '#0ea5e9' },
          { border: '#ef4444', iconBg: 'rgba(239,68,68,.12)',  icon: '🔴', val: highRoads.length,     label: 'High Traffic Roads',   valColor: '#ef4444' },
          { border: '#22c55e', iconBg: 'rgba(34,197,94,.12)',  icon: '🛣️', val: aiRoutes.length,      label: 'AI Clear Routes',       valColor: '#22c55e' },
          { border: '#f59e0b', iconBg: 'rgba(245,158,11,.12)', icon: '⏱️', val: avgWait !== null ? `${avgWait}s` : '—', label: 'Avg Wait Time', valColor: '#f59e0b' },
          { border: '#8b5cf6', iconBg: 'rgba(139,92,246,.12)', icon: '🚦', val: overview.activeSignals, label: 'Active Signals',     valColor: '#8b5cf6' },
          ...(overview.emergencyAlerts > 0 ? [{ border: '#dc2626', iconBg: 'rgba(220,38,38,.12)', icon: '🚨', val: overview.emergencyAlerts, label: 'Emergency Alerts', valColor: '#dc2626' }] : []),
        ].map((s, i) => (
          <div className="db-stat-card" key={i} style={{ borderLeftColor: s.border }}>
            <span className="db-stat-icon" style={{ background: s.iconBg }}>{s.icon}</span>
            <div>
              <div className="db-stat-value" style={{ color: s.valColor }}>{s.val}</div>
              <div className="db-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dash-grid">

        {/* Traffic Status Summary */}
        <div className="card card-accent-blue">
          <div className="card-header">
            <h3 className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Traffic Status Summary
            </h3>
          </div>
          <div className="card-body">
            {totalLocs === 0 ? (
              <div className="empty-msg"><span className="empty-icon">📡</span><span>No locations monitored yet. <Link to="/traffic">Add one →</Link></span></div>
            ) : (
              <>
                <div className="db-status-pills">
                  <div className="db-status-pill" style={{ background: 'rgba(34,197,94,.08)', borderColor: 'rgba(34,197,94,.3)' }}>
                    <span className="db-spc-icon">🟢</span>
                    <span className="db-spc-count" style={{ color: '#22c55e' }}>{statusSummary.low}</span>
                    <span className="db-spc-label">Low</span>
                  </div>
                  <div className="db-status-pill" style={{ background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.3)' }}>
                    <span className="db-spc-icon">🟡</span>
                    <span className="db-spc-count" style={{ color: '#f59e0b' }}>{statusSummary.medium}</span>
                    <span className="db-spc-label">Medium</span>
                  </div>
                  <div className="db-status-pill" style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.3)' }}>
                    <span className="db-spc-icon">🔴</span>
                    <span className="db-spc-count" style={{ color: '#ef4444' }}>{statusSummary.high}</span>
                    <span className="db-spc-label">Heavy</span>
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <CongestionBar label="🟢 Low"    count={statusSummary.low}    total={cbTotal} color="#22c55e" />
                  <CongestionBar label="🟡 Medium" count={statusSummary.medium} total={cbTotal} color="#f59e0b" />
                  <CongestionBar label="🔴 High"   count={statusSummary.high}   total={cbTotal} color="#ef4444" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Heavy Congestion Roads */}
        <div className="card card-accent-red">
          <div className="card-header">
            <h3 className="card-title">🔴 Heavy Congestion Roads</h3>
            <Link to="/traffic" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {highRoads.length === 0 ? (
              <div className="empty-msg"><span className="empty-icon">🎉</span><span>No heavy congestion right now!</span></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Road / Area</th><th>Vehicles</th><th>Signal</th></tr></thead>
                  <tbody>
                    {highRoads.map(r => (
                      <tr key={r._id}>
                        <td className="font-semibold">{r.areaName}</td>
                        <td><span className="badge badge-high">{r.vehicleCount}</span></td>
                        <td>
                          <span className={`badge badge-${r.signalStatus === 'Green' ? 'green' : r.signalStatus === 'Red' ? 'red' : 'yellow'}`}>
                            {r.signalStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommended Routes */}
        <div className="card card-accent-green">
          <div className="card-header">
            <h3 className="card-title">🤖 AI Recommended Routes</h3>
            <Link to="/predict" className="btn btn-ghost btn-sm">Predict</Link>
          </div>
          <div className="card-body">
            {aiRoutes.length === 0 ? (
              <div className="empty-msg"><span className="empty-icon">🛣️</span><span>No clear routes available. <Link to="/predict">Run AI Prediction →</Link></span></div>
            ) : (
              <div className="db-route-list">
                {aiRoutes.map((r, i) => (
                  <div key={r._id} className="db-route-item">
                    <span className="db-route-rank">#{i + 1}</span>
                    <div className="db-route-info">
                      <span className="db-route-name">{r.areaName}</span>
                      <span className="db-route-meta">{r.vehicleCount} vehicles · {r.signalStatus}</span>
                    </div>
                    <StatusPill level={r.congestionLevel} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent AI Predictions */}
        <div className="card card-accent-purple">
          <div className="card-header">
            <h3 className="card-title">🧠 Recent AI Predictions</h3>
            <Link to="/predict" className="btn btn-ghost btn-sm">Run New</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentPreds.length === 0 ? (
              <div className="empty-msg"><span className="empty-icon">🔮</span><span>No predictions yet. <Link to="/predict">Run AI →</Link></span></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Location</th><th>Congestion</th><th>Wait</th><th>Signal</th></tr></thead>
                  <tbody>
                    {recentPreds.map(p => {
                      const cong = p.prediction?.estimatedCongestion || p.congestionLevel || '—';
                      const wait = p.prediction?.estimatedWaitingTime;
                      const sig  = p.prediction?.recommendedSignalDuration;
                      return (
                        <tr key={p._id}>
                          <td className="font-semibold">{p.areaName}</td>
                          <td><StatusPill level={cong} /></td>
                          <td className="text-muted font-mono">{wait != null ? `${wait}s` : '—'}</td>
                          <td className="text-muted font-mono">{sig  != null ? `${sig}s`  : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Active Monitoring Locations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📍 Active Monitoring Locations</h3>
            <Link to="/traffic" className="btn btn-ghost btn-sm">Manage</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLocations.length === 0 ? (
              <div className="empty-msg"><span className="empty-icon">📍</span><span>No locations yet. <Link to="/traffic">Add one →</Link></span></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Area</th><th>Status</th><th>Vehicles</th><th>Updated</th></tr></thead>
                  <tbody>
                    {recentLocations.map(t => (
                      <tr key={t._id}>
                        <td className="font-semibold">{t.areaName}</td>
                        <td><StatusPill level={t.congestionLevel} /></td>
                        <td><span className="badge badge-neutral">{t.vehicleCount}</span></td>
                        <td className="text-muted text-xs">{new Date(t.lastUpdated).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Traffic Insights panel */}
        <div className="card card-accent-amber">
          <div className="card-header">
            <h3 className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 6.5-6 7.4V19h-2v-2.6C7.5 15.5 5 12.5 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              AI Traffic Insights
            </h3>
          </div>
          <div className="card-body">
            <div className="db-insights">
              {totalLocs === 0 && (
                <div className="db-insight-item db-insight-info">
                  <span>📡</span>
                  <span>Start by adding traffic locations in the Traffic Monitor to enable AI analysis.</span>
                </div>
              )}
              {statusSummary.high > 0 && (
                <div className="db-insight-item db-insight-danger">
                  <span>🚨</span>
                  <span><strong>{statusSummary.high}</strong> road{statusSummary.high > 1 ? 's are' : ' is'} experiencing heavy congestion. Consider alternate routes.</span>
                </div>
              )}
              {statusSummary.medium > 0 && (
                <div className="db-insight-item db-insight-warn">
                  <span>⚠️</span>
                  <span><strong>{statusSummary.medium}</strong> location{statusSummary.medium > 1 ? 's have' : ' has'} moderate traffic. Monitor closely.</span>
                </div>
              )}
              {statusSummary.low > 0 && (
                <div className="db-insight-item db-insight-ok">
                  <span>✅</span>
                  <span><strong>{statusSummary.low}</strong> road{statusSummary.low > 1 ? 's are' : ' is'} clear — optimal conditions.</span>
                </div>
              )}
              {avgWait !== null && (
                <div className="db-insight-item db-insight-info">
                  <span>⏱️</span>
                  <span>Average estimated waiting time across all monitored locations: <strong>{avgWait} seconds</strong>.</span>
                </div>
              )}
              {overview.emergencyAlerts > 0 && (
                <div className="db-insight-item db-insight-danger">
                  <span>🚑</span>
                  <span><strong>{overview.emergencyAlerts}</strong> emergency alert{overview.emergencyAlerts > 1 ? 's are' : ' is'} active. Emergency routes have been prioritised.</span>
                </div>
              )}
              {totalLocs > 0 && statusSummary.high === 0 && statusSummary.medium === 0 && (
                <div className="db-insight-item db-insight-ok">
                  <span>🎉</span>
                  <span>All monitored roads are clear. Traffic is flowing smoothly across the city.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="quick-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Quick Actions
        </h3>
        <div className="quick-grid">
          {[
            { to: '/traffic',   icon: '🚦', label: 'Traffic Monitor', color: '#0ea5e9' },
            { to: '/predict',   icon: '🤖', label: 'AI Prediction',   color: '#f59e0b' },
            { to: '/ai-report', icon: '📝', label: 'AI Reports',      color: '#8b5cf6' },
            { to: '/emergency', icon: '🚨', label: 'Emergency',       color: '#ef4444' },
          ].map(({ to, icon, label, color }) => (
            <Link key={to} to={to} className="quick-card" style={{ '--qc-color': color }}>
              <span className="quick-icon" style={{ color }}>{icon}</span>
              <span className="quick-label">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
