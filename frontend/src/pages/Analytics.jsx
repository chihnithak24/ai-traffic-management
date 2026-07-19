/**
 * Analytics.jsx — Modern Traffic Analytics Dashboard
 * Live data · 30-second auto-refresh · Today / Week / Month filters
 * Light + dark theme · Smooth animations · Zero hardcoded values
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { trafficService, dashboardService, predictService } from '../services/trafficService';
import { useTheme } from '../context/ThemeContext';
import './Analytics.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

/* ─── theme-aware chart colours ─────────────────────────────────────────────── */
const mkOpts = (isDark) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        font: { size: 12, family: 'Inter, system-ui, sans-serif' },
        color: isDark ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        pointStyleWidth: 8,
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: isDark ? '#1e293b' : '#fff',
      titleColor: isDark ? '#f1f5f9' : '#0f172a',
      bodyColor: isDark ? '#94a3b8' : '#64748b',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      grid: { color: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)', drawBorder: false },
      ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } }
    },
    y: {
      grid: { color: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)', drawBorder: false },
      ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } },
      beginAtZero: true
    }
  }
});

const mkDoughnutOpts = (isDark) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 700, easing: 'easeInOutQuart' },
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        font: { size: 12 },
        color: isDark ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        pointStyleWidth: 8,
      }
    },
    tooltip: {
      backgroundColor: isDark ? '#1e293b' : '#fff',
      titleColor: isDark ? '#f1f5f9' : '#0f172a',
      bodyColor: isDark ? '#94a3b8' : '#64748b',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  }
});

/* ─── KPI card ───────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, unit = '', color, sub, trend }) => (
  <div className="an-kpi-card an-fade-in" style={{ '--kpi-color': color }}>
    <div className="an-kpi-top">
      <span className="an-kpi-icon">{icon}</span>
      {trend != null && (
        <span className={`an-kpi-trend ${trend >= 0 ? 'an-trend-up' : 'an-trend-down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="an-kpi-value">
      {value ?? <span className="an-kpi-null">—</span>}
      {value != null && unit && <span className="an-kpi-unit"> {unit}</span>}
    </div>
    <div className="an-kpi-label">{label}</div>
    {sub && <div className="an-kpi-sub">{sub}</div>}
    <div className="an-kpi-bar" />
  </div>
);

/* ─── section header ─────────────────────────────────────────────────────────── */
const SectionTitle = ({ icon, title, badge }) => (
  <div className="an-section-title">
    <span className="an-section-icon">{icon}</span>
    <h3>{title}</h3>
    {badge && <span className="an-section-badge">{badge}</span>}
  </div>
);

/* ─── mini congestion bar ────────────────────────────────────────────────────── */
const DensityBar = ({ value, color }) => (
  <div className="an-density-bar-wrap">
    <div className="an-density-bar-track">
      <div className="an-density-bar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
    <span className="an-density-pct">{value}%</span>
  </div>
);

/* ─── status badge ───────────────────────────────────────────────────────────── */
const StatusBadge = ({ level }) => {
  const map = {
    High:     { bg: '#fee2e2', color: '#b91c1c', label: 'Heavy'    },
    Medium:   { bg: '#fef9c3', color: '#92400e', label: 'Moderate' },
    Low:      { bg: '#dcfce7', color: '#15803d', label: 'Clear'    },
    Accident: { bg: '#fecaca', color: '#991b1b', label: 'Accident' },
  };
  const s = map[level] || { bg: '#f1f5f9', color: '#64748b', label: level };
  return (
    <span className="an-status-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

/* ─── filter pill group ──────────────────────────────────────────────────────── */
const FilterPills = ({ value, onChange }) => (
  <div className="an-filter-pills">
    {['Today', 'Week', 'Month'].map(f => (
      <button
        key={f}
        className={`an-pill ${value === f ? 'an-pill-active' : ''}`}
        onClick={() => onChange(f)}
      >
        {f === 'Today' ? '📅' : f === 'Week' ? '📆' : '🗓️'} {f}
      </button>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const { isDark } = useTheme();
  const [locations,   setLocations]   = useState([]);
  const [dashData,    setDashData]    = useState(null);
  const [bulkPreds,   setBulkPreds]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter,      setFilter]      = useState('Today');
  const [countdown,   setCountdown]   = useState(30);
  const timerRef    = useRef(null);
  const countRef    = useRef(null);

  /* ── data fetch ──────────────────────────────────────────────────────────── */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [trafficRes, dashRes] = await Promise.all([
        trafficService.getAll({ limit: 500 }),
        dashboardService.getStats()
      ]);
      setLocations(trafficRes.data || []);
      setDashData(dashRes.data);
      setLastUpdated(new Date());
      setError(null);
      setCountdown(30);

      if ((trafficRes.data || []).length > 0) {
        predictService.bulkPredict()
          .then(bp => setBulkPreds(bp.data || []))
          .catch(() => {});
      }
    } catch (err) {
      const status = err?.response?.status;
      setError(
        !err?.response
          ? 'Cannot reach the server. Make sure the backend is running on port 5000.'
          : status === 401
            ? 'Session expired. Please log in again.'
            : `API error (${status ?? '?'}): ${err?.response?.data?.message || err.message}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current  = setInterval(() => load(true), 30000);
    countRef.current  = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countRef.current); };
  }, [load]);

  /* ── chart options (theme-aware, memoised) ───────────────────────────────── */
  const chartOpts    = useMemo(() => mkOpts(isDark),         [isDark]);
  const doughnutOpts = useMemo(() => mkDoughnutOpts(isDark), [isDark]);

  /* ── filter-based dataset selection ─────────────────────────────────────── */
  const trendDataset = useMemo(() => {
    if (!dashData) return [];
    const t = dashData.trends;
    if (filter === 'Today')  return dashData.dailyTrend   || [];
    if (filter === 'Week')   return t?.weekly  || [];
    if (filter === 'Month')  return t?.monthly || [];
    return dashData.dailyTrend || [];
  }, [dashData, filter]);

  const trendKey = filter === 'Today' ? 'date' : filter === 'Week' ? 'week' : 'month';

  /* ── early-exit states ───────────────────────────────────────────────────── */
  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Loading analytics...</span>
    </div>
  );

  if (error) return (
    <div className="loading-overlay" style={{ flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: '2.5rem' }}>⚠️</span>
      <p style={{ color: '#ef4444', fontWeight: 600, textAlign: 'center', maxWidth: 380 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => load()}>🔄 Retry</button>
    </div>
  );

  if (!locations.length) return (
    <div className="loading-overlay" style={{ flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: '3rem' }}>🗄️</span>
      <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No traffic data yet</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', textAlign: 'center', maxWidth: 340 }}>
        Run <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>node seed.js</code> inside the backend folder, or add locations in Traffic Monitor.
      </p>
    </div>
  );

  /* ── derived values ──────────────────────────────────────────────────────── */
  const overview  = dashData?.overview  || {};
  const cBreak    = dashData?.congestionBreakdown || { low: 0, medium: 0, high: 0 };
  const cbTotal   = (cBreak.low + cBreak.medium + cBreak.high) || 1;

  const totalVehicles = overview.totalVehicles
    ?? locations.reduce((s, l) => s + l.vehicleCount, 0);
  const avgSpeed   = overview.avgSpeed
    ?? Math.round(locations.reduce((s, l) => s + (l.averageSpeed || 0), 0) / locations.length);
  const avgDensity = overview.avgDensity
    ?? Math.round(locations.reduce((s, l) => s + (l.trafficDensity || 0), 0) / locations.length);

  const top10      = [...locations].sort((a, b) => b.vehicleCount - a.vehicleCount).slice(0, 10);
  const top10Speed = [...locations].sort((a, b) => (a.averageSpeed || 0) - (b.averageSpeed || 0)).slice(0, 10);

  // AI accuracy proxy — % of predictions matching DB congestion level
  const matchCount = bulkPreds.filter(p => {
    const pred = p.prediction?.estimatedCongestion;
    const real = p.congestionLevel;
    return pred && real && pred.toLowerCase() === real.toLowerCase();
  }).length;
  const aiAccuracy = bulkPreds.length > 0 ? Math.round((matchCount / bulkPreds.length) * 100) : null;

  /* ── chart data ──────────────────────────────────────────────────────────── */
  const COLORS = {
    red:    'rgba(239,68,68,.85)',
    amber:  'rgba(245,158,11,.85)',
    green:  'rgba(34,197,94,.85)',
    blue:   '#3b82f6',
    purple: '#8b5cf6',
    teal:   '#14b8a6',
  };

  const congestionColor = (level) =>
    level === 'High' ? COLORS.red : level === 'Medium' ? COLORS.amber : COLORS.green;

  const vehicleChart = {
    labels: top10.map(l => l.areaName.length > 16 ? l.areaName.slice(0, 16) + '…' : l.areaName),
    datasets: [{
      label: 'Vehicle Count',
      data: top10.map(l => l.vehicleCount),
      backgroundColor: top10.map(l => congestionColor(l.congestionLevel)),
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    }]
  };

  const densityChart = {
    labels: top10.map(l => l.areaName.length > 12 ? l.areaName.slice(0, 12) + '…' : l.areaName),
    datasets: [{
      label: 'Traffic Density %',
      data: top10.map(l => Math.round(l.trafficDensity || 0)),
      borderColor: COLORS.blue,
      backgroundColor: isDark ? 'rgba(59,130,246,.18)' : 'rgba(59,130,246,.1)',
      fill: true,
      tension: 0.42,
      pointBackgroundColor: COLORS.blue,
      pointBorderColor: isDark ? '#111827' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
    }]
  };

  const doughnutChart = {
    labels: ['Low / Clear', 'Moderate', 'Heavy'],
    datasets: [{
      data: [cBreak.low, cBreak.medium, cBreak.high],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: isDark ? 3 : 4,
      borderColor: isDark ? '#111827' : '#ffffff',
      hoverOffset: 10,
    }]
  };

  const trendChartData = trendDataset.length > 0 ? {
    labels: trendDataset.map(d => d[trendKey]),
    datasets: [{
      label: 'Total Vehicles',
      data: trendDataset.map(d => d.vehicles),
      borderColor: COLORS.purple,
      backgroundColor: isDark ? 'rgba(139,92,246,.2)' : 'rgba(139,92,246,.1)',
      fill: true,
      tension: 0.42,
      pointBackgroundColor: COLORS.purple,
      pointBorderColor: isDark ? '#111827' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
    }]
  } : null;

  const speedChart = {
    labels: top10Speed.map(l => l.areaName.length > 14 ? l.areaName.slice(0, 14) + '…' : l.areaName),
    datasets: [{
      label: 'Avg Speed km/h',
      data: top10Speed.map(l => l.averageSpeed || 0),
      backgroundColor: top10Speed.map(l =>
        (l.averageSpeed || 0) < 20 ? COLORS.red :
        (l.averageSpeed || 0) < 40 ? COLORS.amber : COLORS.green
      ),
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    }]
  };

  const signalGroups = { Green: 0, Yellow: 0, Red: 0, 'Emergency Green': 0, Offline: 0 };
  locations.forEach(l => { if (signalGroups[l.signalStatus] !== undefined) signalGroups[l.signalStatus]++; });
  const signalChart = {
    labels: Object.keys(signalGroups),
    datasets: [{
      label: 'Signals',
      data: Object.values(signalGroups),
      backgroundColor: [COLORS.green, COLORS.amber, COLORS.red, 'rgba(220,38,38,.85)', 'rgba(100,116,139,.85)'],
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    }]
  };

  const predGroups = { Low: 0, Medium: 0, High: 0 };
  bulkPreds.forEach(p => {
    const c = p.prediction?.estimatedCongestion;
    if (c && predGroups[c] !== undefined) predGroups[c]++;
  });
  const aiPredChart = bulkPreds.length > 0 ? {
    labels: ['Low / Clear', 'Moderate', 'Heavy'],
    datasets: [{
      label: 'AI Predictions',
      data: [predGroups.Low, predGroups.Medium, predGroups.High],
      backgroundColor: [COLORS.green, COLORS.amber, COLORS.red],
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    }]
  } : null;

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="an-root an-fade-in">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="an-page-header">
        <div className="an-header-left">
          <h2 className="an-page-title">Traffic Analytics</h2>
          <p className="an-page-sub">
            Live insights from <strong>{locations.length}</strong> monitored locations
          </p>
        </div>
        <div className="an-header-right">
          {lastUpdated && (
            <div className="an-live-badge">
              <span className="an-live-dot" />
              Live · {lastUpdated.toLocaleTimeString()}
              <span className="an-countdown">{countdown}s</span>
            </div>
          )}
          <FilterPills value={filter} onChange={setFilter} />
          <button
            className="an-refresh-btn"
            onClick={() => load()}
            title="Refresh now"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="an-kpi-row">
        <KpiCard
          icon="📍" label="Monitored Locations"
          value={locations.length} color="#3b82f6"
          sub={`${cBreak.low + cBreak.medium + cBreak.high} classified`}
        />
        <KpiCard
          icon="🚗" label="Total Vehicles"
          value={totalVehicles.toLocaleString()} color="#8b5cf6"
          sub={`Top: ${top10[0]?.areaName?.split(',')[0] ?? '—'}`}
        />
        <KpiCard
          icon="⚡" label="Avg Speed"
          value={avgSpeed} unit="km/h" color="#22c55e"
          sub={avgSpeed >= 40 ? 'Traffic flowing well' : avgSpeed >= 20 ? 'Moderate conditions' : 'Heavy congestion'}
        />
        <KpiCard
          icon="📊" label="Avg Density"
          value={`${avgDensity}`} unit="%" color="#f59e0b"
          sub={avgDensity < 40 ? 'Low density' : avgDensity < 70 ? 'Moderate' : 'High density'}
        />
        <KpiCard
          icon="🔴" label="Heavy Traffic Roads"
          value={cBreak.high} color="#ef4444"
          sub={`${cBreak.medium} moderate · ${cBreak.low} clear`}
        />
        <KpiCard
          icon="🚦" label="Active Signals"
          value={overview.activeSignals} color="#14b8a6"
          sub={signalGroups['Emergency Green'] > 0 ? `${signalGroups['Emergency Green']} emergency active` : 'All operational'}
        />
        {aiAccuracy !== null && (
          <KpiCard
            icon="🤖" label="AI Accuracy"
            value={aiAccuracy} unit="%" color="#6366f1"
            sub={`${bulkPreds.length} predictions analysed`}
          />
        )}
        {(overview.emergencyAlerts ?? 0) > 0 && (
          <KpiCard
            icon="🚨" label="Emergency Alerts"
            value={overview.emergencyAlerts} color="#dc2626"
            sub="Immediate action required"
          />
        )}
      </div>

      {/* ── Congestion Summary Strip ──────────────────────────────────────────── */}
      <div className="an-congestion-strip">
        {[
          { label: 'Clear Roads',    count: cBreak.low,    color: '#22c55e', bg: isDark ? '#052e16' : '#dcfce7', pct: Math.round((cBreak.low    / cbTotal) * 100) },
          { label: 'Moderate Roads', count: cBreak.medium, color: '#f59e0b', bg: isDark ? '#1c1400' : '#fef9c3', pct: Math.round((cBreak.medium / cbTotal) * 100) },
          { label: 'Heavy Roads',    count: cBreak.high,   color: '#ef4444', bg: isDark ? '#1c0505' : '#fee2e2', pct: Math.round((cBreak.high   / cbTotal) * 100) },
        ].map(s => (
          <div key={s.label} className="an-cstrip-item" style={{ background: s.bg, borderColor: s.color }}>
            <div className="an-cstrip-bar-track">
              <div className="an-cstrip-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
            <div className="an-cstrip-info">
              <span className="an-cstrip-count" style={{ color: s.color }}>{s.count}</span>
              <span className="an-cstrip-label">{s.label}</span>
              <span className="an-cstrip-pct">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Grid ──────────────────────────────────────────────────────── */}
      <div className="an-grid">

        {/* Vehicle Count — span 2 */}
        <div className="an-card an-span2 an-fade-in">
          <div className="an-card-header">
            <SectionTitle icon="🚗" title="Vehicle Count — Top 10 Busiest Roads" />
            <span className="an-card-hint">Colour = congestion level</span>
          </div>
          <div className="an-chart-body">
            <Bar data={vehicleChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, title: { display: true, text: 'Vehicles', color: isDark ? '#64748b' : '#94a3b8' } } } }} />
          </div>
        </div>

        {/* Congestion Doughnut */}
        <div className="an-card an-fade-in" style={{ animationDelay: '.05s' }}>
          <div className="an-card-header">
            <SectionTitle icon="🎯" title="Congestion Distribution" />
          </div>
          <div className="an-chart-body an-doughnut-wrap">
            <Doughnut data={doughnutChart} options={doughnutOpts} />
            <div className="an-doughnut-center">
              <span className="an-dc-total">{locations.length}</span>
              <span className="an-dc-label">Roads</span>
            </div>
          </div>
        </div>

        {/* Traffic Trend — span 2 */}
        <div className="an-card an-span2 an-fade-in" style={{ animationDelay: '.08s' }}>
          <div className="an-card-header">
            <SectionTitle icon="📈" title={`Traffic Trend — ${filter}`} />
            <FilterPills value={filter} onChange={setFilter} />
          </div>
          <div className="an-chart-body">
            {trendChartData
              ? <Line data={trendChartData} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, beginAtZero: false, title: { display: true, text: 'Total Vehicles', color: isDark ? '#64748b' : '#94a3b8' } } } }} />
              : <div className="an-no-data">No trend data for this period</div>
            }
          </div>
        </div>

        {/* Avg Speed */}
        <div className="an-card an-fade-in" style={{ animationDelay: '.1s' }}>
          <div className="an-card-header">
            <SectionTitle icon="⚡" title="Avg Speed — Slowest Roads" />
            <span className="an-card-hint">🔴 &lt;20 · 🟡 20–40 · 🟢 &gt;40 km/h</span>
          </div>
          <div className="an-chart-body">
            <Bar data={speedChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, title: { display: true, text: 'km/h', color: isDark ? '#64748b' : '#94a3b8' } } } }} />
          </div>
        </div>

        {/* Density Line */}
        <div className="an-card an-span2 an-fade-in" style={{ animationDelay: '.12s' }}>
          <div className="an-card-header">
            <SectionTitle icon="📊" title="Traffic Density % — Top 10 Roads" />
          </div>
          <div className="an-chart-body">
            <Line data={densityChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 0, max: 100, title: { display: true, text: 'Density %', color: isDark ? '#64748b' : '#94a3b8' } } } }} />
          </div>
        </div>

        {/* Signal Status */}
        <div className="an-card an-fade-in" style={{ animationDelay: '.14s' }}>
          <div className="an-card-header">
            <SectionTitle icon="🚦" title="Signal Status Breakdown" />
          </div>
          <div className="an-chart-body">
            <Bar data={signalChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, stepSize: 1 } } } }} />
          </div>
        </div>

        {/* AI Prediction Distribution */}
        {aiPredChart && (
          <div className="an-card an-fade-in" style={{ animationDelay: '.16s' }}>
            <div className="an-card-header">
              <SectionTitle icon="🤖" title="AI Prediction Distribution" badge={`${bulkPreds.length} records`} />
              {aiAccuracy !== null && (
                <div className="an-accuracy-pill">
                  <div className="an-accuracy-bar-wrap">
                    <div className="an-accuracy-bar-fill" style={{ width: `${aiAccuracy}%` }} />
                  </div>
                  <span>{aiAccuracy}% accuracy</span>
                </div>
              )}
            </div>
            <div className="an-chart-body">
              <Bar data={aiPredChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, stepSize: 1 } } } }} />
            </div>
          </div>
        )}

        {/* ── Top 10 Roads Table — span 3 ──────────────────────────────────── */}
        <div className="an-card an-span3 an-fade-in" style={{ animationDelay: '.18s' }}>
          <div className="an-card-header">
            <SectionTitle icon="🏆" title="Top 10 Busiest Roads — Live Data" />
            <span className="an-card-hint">{locations.length} total locations monitored</span>
          </div>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th className="an-th-rank">#</th>
                  <th>Road / Area</th>
                  <th>Vehicles</th>
                  <th>Avg Speed</th>
                  <th>Density</th>
                  <th>Status</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((l, i) => {
                  const c = l.congestionLevel === 'High' ? '#ef4444' : l.congestionLevel === 'Medium' ? '#f59e0b' : '#22c55e';
                  return (
                    <tr key={l._id} className="an-table-row">
                      <td className="an-td-rank">{i + 1}</td>
                      <td className="an-td-name">{l.areaName}</td>
                      <td><span className="an-num-badge">{l.vehicleCount}</span></td>
                      <td className="an-td-mono">{l.averageSpeed ?? '—'} km/h</td>
                      <td><DensityBar value={Math.round(l.trafficDensity || 0)} color={c} /></td>
                      <td><StatusBadge level={l.congestionLevel} /></td>
                      <td className="an-td-signal">{l.signalStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── AI Predictions Table — span 3 ────────────────────────────────── */}
        {bulkPreds.length > 0 && (
          <div className="an-card an-span3 an-fade-in" style={{ animationDelay: '.2s' }}>
            <div className="an-card-header">
              <SectionTitle icon="🧠" title="AI Predictions — All Locations" badge={`${bulkPreds.length} analysed`} />
            </div>
            <div className="an-table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table className="an-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Vehicles</th>
                    <th>AI Verdict</th>
                    <th>Signal (s)</th>
                    <th>Wait (s)</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreds.map(p => {
                    const cong  = p.prediction?.estimatedCongestion || '—';
                    const c     = cong === 'High' ? '#ef4444' : cong === 'Medium' ? '#f59e0b' : '#22c55e';
                    const conf  = p.prediction?.confidenceScore;
                    return (
                      <tr key={p._id} className="an-table-row">
                        <td className="an-td-name">{p.areaName}</td>
                        <td><span className="an-num-badge">{p.vehicleCount}</span></td>
                        <td><StatusBadge level={cong} /></td>
                        <td className="an-td-mono">{p.prediction?.recommendedSignalDuration ?? '—'}</td>
                        <td className="an-td-mono">{p.prediction?.estimatedWaitingTime ?? '—'}</td>
                        <td>
                          {conf != null ? (
                            <div className="an-conf-wrap">
                              <div className="an-conf-track">
                                <div className="an-conf-fill" style={{ width: `${conf}%` }} />
                              </div>
                              <span className="an-conf-pct">{conf}%</span>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Analytics;
