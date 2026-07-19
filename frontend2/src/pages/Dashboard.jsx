import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { dashboardSvc, trafficSvc } from '../services/trafficService';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon, label, value, color, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className={`glass rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 ${color}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${gradient}`}>{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </motion.div>
);

const CongestionBar = ({ label, count, total, color }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{count} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.5 }}
          className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
};

// Live Clock component
const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center text-center">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">⏰ Live Time</p>
      <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [liveFeed, setLiveFeed]   = useState([]);
  const [feedTick, setFeedTick]   = useState(0);   // increments every 30s to animate

  useEffect(() => {
    dashboardSvc.getStats().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Auto-refreshing live feed — re-fetches top locations every 30 seconds
  useEffect(() => {
    const fetchFeed = () => {
      trafficSvc.getAll({})
        .then(r => {
          const sorted = [...(r.data || [])].sort((a, b) => b.vehicleCount - a.vehicleCount).slice(0, 6);
          setLiveFeed(sorted);
          setFeedTick(t => t + 1);
        })
        .catch(() => {});
    };
    fetchFeed();
    const id = setInterval(fetchFeed, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );

  if (!data) return <div className="text-center py-20 text-gray-500">Failed to load dashboard data.</div>;

  const { overview, congestionBreakdown, topCongested, recentLocations, trends, peakLocation, lowestLocation } = data;
  const total = (congestionBreakdown.low + congestionBreakdown.medium + congestionBreakdown.high) || 1;

  const stats = [
    { icon: '🚗', label: 'Total Vehicles',   value: overview.totalVehicles.toLocaleString(), color: 'border-blue-400',   gradient: 'text-blue-600 dark:text-blue-400',     delay: 0 },
    { icon: '🚦', label: 'Active Signals',   value: overview.active,                         color: 'border-emerald-400', gradient: 'text-emerald-600 dark:text-emerald-400', delay: 0.05 },
    { icon: '🔴', label: 'Congested Areas',  value: overview.high,                           color: 'border-red-400',    gradient: 'text-red-600 dark:text-red-400',         delay: 0.1 },
    { icon: '💨', label: 'Avg Speed (km/h)', value: `${overview.avgSpeed}`,                  color: 'border-purple-400', gradient: 'text-purple-600 dark:text-purple-400',   delay: 0.15 },
    { icon: '🚨', label: 'Emergencies',      value: overview.emergency,                      color: 'border-orange-400', gradient: 'text-orange-600 dark:text-orange-400',   delay: 0.2 },
    { icon: '🚧', label: 'Accidents',        value: overview.accidents,                      color: 'border-pink-400',   gradient: 'text-pink-600 dark:text-pink-400',       delay: 0.25 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white shadow-xl">
        <div className="relative z-10">
          <h2 className="text-xl font-bold">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-indigo-200 text-sm mt-1">Here's your real-time smart city traffic overview</p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <Link to="/traffic"       className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">➕ Add Location</Link>
            <Link to="/map"           className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">🗺️ View Map</Link>
            <Link to="/live-location" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">📍 Live Location</Link>
            <Link to="/predict"       className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">🤖 AI Predict</Link>
            <Link to="/incidents"     className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">🚨 Incidents</Link>
            <Link to="/routes"        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-xl text-sm font-semibold transition-all">🛣️ Route Plan</Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Live Clock + Peak + Lowest */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiveClock />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4 border-l-4 border-red-400">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🔴 Peak Traffic Location</p>
          {peakLocation ? (
            <>
              <p className="font-bold text-gray-900 dark:text-white">{peakLocation.areaName}</p>
              <p className="text-xs text-gray-500">{peakLocation.city}</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{peakLocation.vehicleCount} <span className="text-sm font-normal text-gray-400">vehicles</span></p>
            </>
          ) : <p className="text-gray-400 text-sm">No data yet</p>}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4 border-l-4 border-emerald-400">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🟢 Lowest Traffic Location</p>
          {lowestLocation ? (
            <>
              <p className="font-bold text-gray-900 dark:text-white">{lowestLocation.areaName}</p>
              <p className="text-xs text-gray-500">{lowestLocation.city}</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{lowestLocation.vehicleCount} <span className="text-sm font-normal text-gray-400">vehicles</span></p>
            </>
          ) : <p className="text-gray-400 text-sm">No data yet</p>}
        </motion.div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Congestion breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">🎯 Congestion Overview</h3>
          <div className="space-y-4">
            <CongestionBar label="🟢 Low"      count={congestionBreakdown.low}     total={total} color="bg-emerald-400" />
            <CongestionBar label="🟡 Medium"   count={congestionBreakdown.medium}  total={total} color="bg-amber-400" />
            <CongestionBar label="🔴 High"     count={congestionBreakdown.high}    total={total} color="bg-red-400" />
            <CongestionBar label="🔵 Accident" count={congestionBreakdown.accidents||0} total={total} color="bg-blue-400" />
          </div>
        </motion.div>

        {/* 7-day mini chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">📈 7-Day Vehicle Trend</h3>
          <div className="flex items-end gap-2 h-24 mt-2">
            {(trends?.daily || []).map((d, i) => {
              const maxV = Math.max(...(trends.daily || []).map(x => x.vehicles), 1);
              const h = (d.vehicles / maxV) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t-lg min-h-[4px]"
                    style={{ height: `${h}%` }} title={d.vehicles} />
                  <span className="text-[9px] text-gray-500">{d.date}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top congested */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">🔴 Top Congested</h3>
            <Link to="/traffic" className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">View all →</Link>
          </div>
          <div className="space-y-2">
            {(topCongested || []).slice(0, 5).map(t => (
              <div key={t._id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.areaName}</p>
                  <p className="text-xs text-gray-500">{t.city}</p>
                </div>
                <span className="badge badge-high">{t.vehicleCount}</span>
              </div>
            ))}
            {!topCongested?.length && <p className="text-sm text-gray-400 text-center py-4">No high congestion areas 🎉</p>}
          </div>
        </motion.div>
      </div>

      {/* Recent locations table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">🕒 Recently Updated Locations</h3>
          <Link to="/traffic" className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold btn-secondary text-xs px-3 py-1.5">Manage →</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Location</th><th>City</th><th>Vehicles</th><th>Speed</th><th>Density</th><th>Congestion</th><th>Signal</th></tr>
            </thead>
            <tbody>
              {(recentLocations || []).map(t => (
                <tr key={t._id}>
                  <td className="font-semibold text-gray-800 dark:text-gray-200">{t.areaName}</td>
                  <td className="text-gray-500">{t.city}</td>
                  <td><span className="font-bold text-gray-800 dark:text-gray-200">{t.vehicleCount}</span></td>
                  <td><span className="text-sm">{Math.round(t.averageSpeed || 0)} km/h</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${t.trafficDensity > 70 ? 'bg-red-500' : t.trafficDensity > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.round(t.trafficDensity)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(t.trafficDensity)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${t.congestionLevel?.toLowerCase().replace(' ','-') === 'road-closed' ? 'closed' : t.congestionLevel?.toLowerCase()}`}>
                      {t.congestionLevel}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${t.signalStatus === 'Green' ? 'badge-low' : t.signalStatus === 'Red' ? 'badge-high' : t.signalStatus === 'Emergency Green' ? 'badge-emergency' : 'badge-medium'}`}>
                      {t.signalStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentLocations?.length && <p className="text-center py-8 text-gray-400">No locations yet.</p>}
        </div>
      </motion.div>

      {/* Live Traffic Feed */}
      {liveFeed.length > 0 && (
        <motion.div key={`feed-${feedTick}`} initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
          className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">🔴 Live Traffic Feed</h3>
              <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700">Auto-refreshes every 30s</span>
            </div>
            <Link to="/traffic" className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-gray-50 dark:divide-gray-800">
            {liveFeed.map((loc, i) => {
              const congColor = {
                Low: 'text-emerald-500', Medium: 'text-amber-500',
                High: 'text-red-500', Accident: 'text-blue-500', 'Road Closed': 'text-purple-500'
              }[loc.congestionLevel] || 'text-gray-500';
              const bgColor = {
                Low: 'bg-emerald-50 dark:bg-emerald-900/20',
                Medium: 'bg-amber-50 dark:bg-amber-900/20',
                High: 'bg-red-50 dark:bg-red-900/20',
              }[loc.congestionLevel] || 'bg-gray-50 dark:bg-gray-800';
              return (
                <motion.div key={loc._id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="px-4 py-3 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{loc.areaName}</p>
                  <p className="text-[10px] text-gray-400 truncate mb-1.5">{loc.city}</p>
                  <p className={`text-2xl font-bold tabular-nums ${congColor}`}>{loc.vehicleCount}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">vehicles</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bgColor} ${congColor} mt-1.5 inline-block`}>
                    {loc.congestionLevel}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { to: '/traffic',       icon: '➕', label: 'Add Location',    bg: 'from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border-blue-100 dark:border-blue-800/30' },
            { to: '/map',           icon: '🗺️',  label: 'Live Map',        bg: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-100 dark:border-emerald-800/30' },
            { to: '/live-location', icon: '📍', label: 'Live Location',   bg: 'from-blue-500/10 to-sky-500/10 hover:from-blue-500/20 hover:to-sky-500/20 border-blue-100 dark:border-blue-800/30' },
            { to: '/analytics',     icon: '📊', label: 'Analytics',       bg: 'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-100 dark:border-purple-800/30' },
            { to: '/predict',       icon: '🤖', label: 'AI Prediction',   bg: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-100 dark:border-amber-800/30' },
            { to: '/incidents',     icon: '🚨', label: 'Incidents',       bg: 'from-red-500/10 to-rose-500/10 hover:from-red-500/20 hover:to-rose-500/20 border-red-100 dark:border-red-800/30' },
            { to: '/routes',        icon: '🛣️', label: 'Route Plan',      bg: 'from-teal-500/10 to-cyan-500/10 hover:from-teal-500/20 hover:to-cyan-500/20 border-teal-100 dark:border-teal-800/30' },
          ].map(({ to, icon, label, bg }) => (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${bg} border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">{label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
