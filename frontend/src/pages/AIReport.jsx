import React, { useEffect, useState, useRef } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { aiReportService } from '../services/trafficService';
import { toast } from 'react-toastify';
import './AIReport.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

// CSV export
const exportCSV = (hotspots, summary) => {
  const rows = [
    ['Area', 'Vehicles', 'Density %', 'Speed km/h', 'Level', 'Recommendation'],
    ...hotspots.map(h => [h.areaName, h.vehicleCount, h.trafficDensity, h.averageSpeed, h.congestionLevel, h.recommendation])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `traffic-report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
};

// PDF export via print
const exportPDF = () => window.print();

const AIReport = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await aiReportService.getReport();
      setData(res.data);
    } catch { toast.error('Failed to load AI report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Generating AI Report...</span></div>;
  if (!data)   return <div className="loading-overlay"><p>No data available.</p></div>;

  const { summary, peakHourForecast, vehicleTypeAnalysis, hotspots, insights, generatedAt } = data;

  const peakChart = {
    labels: peakHourForecast.map(p => p.label),
    datasets: [{
      label: 'Estimated Vehicles',
      data: peakHourForecast.map(p => p.estimatedVehicles),
      backgroundColor: peakHourForecast.map(p =>
        p.congestionRisk === 'High' ? 'rgba(239,68,68,.8)' : p.congestionRisk === 'Medium' ? 'rgba(245,158,11,.8)' : 'rgba(34,197,94,.8)'
      ),
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const vehicleChart = {
    labels: ['Cars', 'Bikes', 'Buses', 'Trucks', 'Autos'],
    datasets: [{
      data: [vehicleTypeAnalysis.cars, vehicleTypeAnalysis.bikes, vehicleTypeAnalysis.buses, vehicleTypeAnalysis.trucks, vehicleTypeAnalysis.autos],
      backgroundColor: ['#3b82f6','#f59e0b','#22c55e','#ef4444','#8b5cf6'],
      borderWidth: 3,
      borderColor: 'var(--bg-card)',
      hoverOffset: 8,
    }]
  };

  const severityColor = { critical: '#ef4444', high: '#ef4444', medium: '#f59e0b', warning: '#f59e0b', success: '#22c55e', info: '#3b82f6', emergency: '#dc2626' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🤖 AI Traffic Report</h2>
          <p className="page-subtitle">Generated at {new Date(generatedAt).toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" onClick={load}>🔄 Regenerate Report</button>
        <button className="btn btn-ghost" onClick={() => exportCSV(hotspots, summary)}>📅 Export CSV</button>
        <button className="btn btn-ghost" onClick={() => exportPDF()}>📄 Export PDF</button>
      </div>

      {/* Summary Cards */}
      <div className="aireport-summary">
        {[
          { icon: '🚗', label: 'Total Vehicles',   value: summary.totalVehicles?.toLocaleString(), color: '#3b82f6' },
          { icon: '📍', label: 'Locations',         value: summary.totalLocations,                  color: '#8b5cf6' },
          { icon: '🔴', label: 'High Congestion',   value: summary.highCount,                       color: '#ef4444' },
          { icon: '⚡', label: 'Avg Speed (km/h)',  value: summary.avgSpeed,                        color: '#22c55e' },
          { icon: '📊', label: 'Avg Density %',     value: `${summary.avgDensity}%`,                color: '#f59e0b' },
          { icon: '🚨', label: 'Emergencies',       value: summary.emergencyCount,                  color: '#dc2626' },
        ].map((s, i) => (
          <div className="aireport-stat" key={i}>
            <span className="ars-icon">{s.icon}</span>
            <span className="ars-value" style={{ color: s.color }}>{s.value}</span>
            <span className="ars-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">💡 AI-Generated Insights</h3></div>
        <div className="card-body">
          {insights.map((ins, i) => (
            <div key={i} className="insight-row" style={{ borderLeft: `4px solid ${severityColor[ins.type] || '#3b82f6'}` }}>
              <span className="insight-icon">{ins.icon}</span>
              <p className="insight-text">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="aireport-grid">
        {/* Peak Hour Forecast */}
        <div className="card aireport-card span-2">
          <div className="card-header"><h3 className="card-title">⏰ Peak-Hour Traffic Forecast</h3></div>
          <div className="card-body">
            <div style={{ height: 280 }}>
              <Bar data={peakChart} options={{ ...chartOpts, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>

        {/* Vehicle Type Doughnut */}
        <div className="card aireport-card">
          <div className="card-header"><h3 className="card-title">🚘 Vehicle Type Distribution</h3></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ height: 260, width: '100%' }}>
              <Doughnut data={vehicleChart} options={{ ...chartOpts, cutout: '60%' }} />
            </div>
          </div>
        </div>

        {/* Hotspots Table */}
        <div className="card aireport-card span-2">
          <div className="card-header"><h3 className="card-title">🔥 Congestion Hotspots & Recommendations</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Area</th><th>Vehicles</th><th>Density</th><th>Speed</th><th>Level</th><th>AI Recommendation</th></tr>
                </thead>
                <tbody>
                  {hotspots.map((h, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{h.areaName}</td>
                      <td>{h.vehicleCount}</td>
                      <td>{h.trafficDensity}%</td>
                      <td>{h.averageSpeed} km/h</td>
                      <td>
                        <span className={`badge badge-${h.congestionLevel?.toLowerCase()}`}>{h.congestionLevel}</span>
                      </td>
                      <td style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{h.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIReport;
