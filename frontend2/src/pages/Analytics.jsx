/**
 * Analytics.jsx — Chart.js powered analytics page
 */
import React, { useEffect, useState } from 'react';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import { motion } from 'framer-motion';
import { trafficSvc, dashboardSvc } from '../services/trafficService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

const chartOpts = (title) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 11, family: 'Inter' }, usePointStyle: true } }, title: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: 'rgba(99,102,241,0.08)' }, ticks: { font: { size: 10 } } } }
});

const ChartCard = ({ title, children, span = 1 }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    className={`glass rounded-2xl p-5 ${span === 2 ? 'col-span-2' : ''}`}>
    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 text-sm">{title}</h3>
    {children}
  </motion.div>
);

// Export locations data as CSV
function exportCSV(locations) {
  const headers = ['Area Name','City','State','Vehicle Count','Traffic Density %','Avg Speed km/h','Congestion Level','Signal Status'];
  const rows = locations.map(l => [
    `"${l.areaName}"`, `"${l.city}"`, `"${l.state || ''}"`,
    l.vehicleCount, Math.round(l.trafficDensity), Math.round(l.averageSpeed || 0),
    `"${l.congestionLevel}"`, `"${l.signalStatus}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `traffic_data_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Analytics() {
  const [locations, setLocations] = useState([]);
  const [dash, setDash]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('daily');

  useEffect(() => {
    Promise.all([trafficSvc.getAll({}), dashboardSvc.getStats()])
      .then(([tr, ds]) => { setLocations(tr.data); setDash(ds.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-72"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" /></div>;
  if (!locations.length) return <div className="text-center py-20 text-gray-400">No data. Add traffic locations first.</div>;

  const top10 = [...locations].sort((a, b) => b.vehicleCount - a.vehicleCount).slice(0, 10);
  const labels10 = top10.map(l => l.areaName.length > 14 ? l.areaName.slice(0, 14) + '…' : l.areaName);

  const vehicleBarData = {
    labels: labels10,
    datasets: [{
      label: 'Vehicle Count',
      data: top10.map(l => l.vehicleCount),
      backgroundColor: top10.map(l => l.congestionLevel === 'High' ? 'rgba(239,68,68,.75)' : l.congestionLevel === 'Medium' ? 'rgba(245,158,11,.75)' : 'rgba(34,197,94,.75)'),
      borderRadius: 6, borderSkipped: false,
    }]
  };

  const densityLineData = {
    labels: labels10,
    datasets: [{
      label: 'Traffic Density %', data: top10.map(l => Math.round(l.trafficDensity)),
      borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1'
    }]
  };

  const congDoughnutData = {
    labels: ['Low', 'Medium', 'High', 'Accident', 'Road Closed'],
    datasets: [{
      data: ['Low','Medium','High','Accident','Road Closed'].map(l => locations.filter(x => x.congestionLevel === l).length),
      backgroundColor: ['#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6'],
      borderWidth: 3, borderColor: 'white', hoverOffset: 8,
    }]
  };

  const speedRadarData = {
    labels: top10.slice(0, 6).map(l => l.areaName.slice(0, 8)),
    datasets: [{
      label: 'Avg Speed (km/h)', data: top10.slice(0, 6).map(l => Math.round(l.averageSpeed)),
      backgroundColor: 'rgba(99,102,241,.15)', borderColor: '#6366f1', pointBackgroundColor: '#6366f1', pointRadius: 4,
    }]
  };

  const trendData = tab === 'daily' ? dash?.trends?.daily : tab === 'weekly' ? dash?.trends?.weekly : dash?.trends?.monthly;
  const trendLabels = trendData?.map(d => d.date || d.week || d.month) || [];
  const trendValues = trendData?.map(d => d.vehicles) || [];

  const trendLineData = {
    labels: trendLabels,
    datasets: [{
      label: `${tab.charAt(0).toUpperCase() + tab.slice(1)} Vehicle Count`,
      data: trendValues,
      borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.12)', fill: true, tension: 0.45, pointRadius: 5, pointBackgroundColor: '#8b5cf6',
    }]
  };

  const h = { height: 260 };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Traffic Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Visual insights from {locations.length} monitored locations</p>
        </div>
        <button onClick={() => exportCSV(locations)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-sm">
          ⬇️ Export CSV
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { l: 'Total Locations', v: locations.length, c: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
          { l: 'Total Vehicles',  v: locations.reduce((s, l) => s + l.vehicleCount, 0).toLocaleString(), c: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
          { l: 'High Congestion', v: locations.filter(l => l.congestionLevel === 'High').length, c: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
          { l: 'Cities Covered',  v: new Set(locations.map(l => l.city)).size, c: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        ].map(({ l, v, c }) => (
          <div key={l} className={`px-4 py-2 rounded-xl text-sm font-semibold ${c}`}>{l}: <strong>{v}</strong></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vehicle count bar – full width */}
        <ChartCard title="🚗 Vehicle Count by Location (Top 10)" span={2}>
          <div style={h}><Bar data={vehicleBarData} options={chartOpts()} /></div>
        </ChartCard>

        {/* Congestion doughnut */}
        <ChartCard title="🎯 Congestion Distribution">
          <div style={h} className="relative">
            <Doughnut data={congDoughnutData} options={{ ...chartOpts(), cutout: '62%', plugins: { ...chartOpts().plugins } }} />
          </div>
        </ChartCard>

        {/* Density line */}
        <ChartCard title="📊 Traffic Density % (Top 10)" span={2}>
          <div style={h}><Line data={densityLineData} options={{ ...chartOpts(), scales: { ...chartOpts().scales, y: { ...chartOpts().scales.y, min: 0, max: 100 } } }} /></div>
        </ChartCard>

        {/* Speed radar */}
        <ChartCard title="💨 Average Speed Radar">
          <div style={h}>
            <Radar data={speedRadarData} options={{ responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { r: { grid: { color: 'rgba(99,102,241,0.1)' }, ticks: { font: { size: 9 } } } }
            }} />
          </div>
        </ChartCard>

        {/* Trend line with tabs */}
        <div className="col-span-full glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">📈 Traffic Trend</h3>
            <div className="flex gap-2">
              {['daily','weekly','monthly'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${tab === t ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={h}><Line data={trendLineData} options={chartOpts()} /></div>
        </div>
      </div>
    </div>
  );
}
