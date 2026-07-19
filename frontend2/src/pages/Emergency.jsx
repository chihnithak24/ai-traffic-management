/**
 * Emergency.jsx — Emergency vehicle management module
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trafficSvc } from '../services/trafficService';
import { toast } from 'react-toastify';

const TYPES = ['Ambulance', 'Police', 'Fire'];
const TYPE_ICONS = { Ambulance: '🚑', Police: '🚔', Fire: '🚒' };
const TYPE_COLORS = {
  Ambulance: 'from-red-500/15 to-pink-500/15 border-red-200 dark:border-red-800/40',
  Police:    'from-blue-500/15 to-indigo-500/15 border-blue-200 dark:border-blue-800/40',
  Fire:      'from-orange-500/15 to-red-500/15 border-orange-200 dark:border-orange-800/40',
};

export default function Emergency() {
  const [locations, setLocations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selType, setSelType]       = useState('Ambulance');

  const load = async () => {
    setLoading(true);
    try { const r = await trafficSvc.getAll({}); setLocations(r.data); }
    catch { toast.error('Load failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (loc) => {
    setProcessing(loc._id);
    try {
      await trafficSvc.toggleEmergency(loc._id, { emergencyType: selType });
      toast.success(loc.isEmergency ? 'Emergency deactivated' : `${selType} emergency activated!`);
      load();
    } catch { toast.error('Failed'); }
    finally { setProcessing(null); }
  };

  const active = locations.filter(l => l.isEmergency);
  const normal = locations.filter(l => !l.isEmergency);
  const clearance = (vc) => Math.ceil(vc * 0.5);

  return (
    <div className="space-y-6">
      {/* Emergency Banner */}
      <AnimatePresence>
        {active.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-glow-red">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🚨</span>
              <div>
                <p className="font-bold">EMERGENCY ALERT — {active.length} Location(s) Active</p>
                <p className="text-red-200 text-xs">{active.map(l => `${TYPE_ICONS[l.emergencyType] || '🚨'} ${l.areaName}`).join('  •  ')}</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Emergency Module</h2>
          <p className="text-sm text-gray-500 mt-0.5">Green signal priority for emergency vehicles</p>
        </div>
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setSelType(t)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${selType === t ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
              {TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '🚨', val: active.length,   label: 'Active Emergencies', color: 'text-red-500' },
          { icon: '✅', val: normal.length,    label: 'Normal Locations',   color: 'text-emerald-500' },
          { icon: '📍', val: locations.length, label: 'Total Monitored',    color: 'text-indigo-500' },
        ].map(({ icon, val, label, color }) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Active emergencies */}
      {active.length > 0 && (
        <div>
          <h3 className="font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Active Emergency Locations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(loc => (
              <motion.div key={loc._id} layout
                className={`rounded-2xl border bg-gradient-to-br ${TYPE_COLORS[loc.emergencyType] || TYPE_COLORS.Ambulance} p-4 shadow-md`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{loc.areaName}</p>
                    <p className="text-xs text-gray-500">{loc.city}, {loc.state}</p>
                  </div>
                  <span className="text-2xl">{TYPE_ICONS[loc.emergencyType]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  {[
                    ['🚗', 'Vehicles', loc.vehicleCount],
                    ['⏱️', 'Clearance', `~${clearance(loc.vehicleCount)}s`],
                    ['🚦', 'Signal', 'Emergency Green'],
                    ['📊', 'Type', loc.emergencyType],
                  ].map(([icon, label, val]) => (
                    <div key={label} className="bg-white/50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500">{icon} {label}</span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{val}</p>
                    </div>
                  ))}
                </div>
                {/* Clearance animation */}
                <div className="h-1.5 bg-white/30 dark:bg-gray-700/50 rounded-full overflow-hidden mb-3">
                  <motion.div animate={{ width: ['20%', '90%', '20%'] }} transition={{ duration: 3, repeat: Infinity }}
                    className="h-full rounded-full bg-red-500" />
                </div>
                <button onClick={() => toggle(loc)} disabled={processing === loc._id}
                  className="btn-secondary w-full justify-center text-xs">
                  {processing === loc._id ? '⏳ Processing...' : '✅ Deactivate Emergency'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All locations */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">📍 All Traffic Locations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locations.map(loc => (
              <motion.div key={loc._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`glass rounded-2xl p-4 ${loc.isEmergency ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{loc.areaName}</p>
                    <p className="text-xs text-gray-500">{loc.city}</p>
                  </div>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    loc.signalStatus === 'Emergency Green' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                    : loc.signalStatus === 'Green' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : loc.signalStatus === 'Red'   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>{loc.signalStatus}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>🚗 {loc.vehicleCount} vehicles</span>
                  <span className={`badge ${loc.congestionLevel === 'High' ? 'badge-high' : loc.congestionLevel === 'Medium' ? 'badge-medium' : 'badge-low'}`}>{loc.congestionLevel}</span>
                </div>
                <button onClick={() => toggle(loc)} disabled={processing === loc._id}
                  className={`w-full text-xs font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    loc.isEmergency
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40'
                      : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                  }`}>
                  {processing === loc._id ? '⏳ Processing...'
                    : loc.isEmergency ? `✅ Deactivate ${loc.emergencyType}`
                    : `🚨 Activate ${selType} Emergency`}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass rounded-2xl p-5 border-l-4 border-indigo-400">
        <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-2">ℹ️ How Emergency Mode Works</h4>
        <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          {[
            '🚨 Activating emergency changes signal to Emergency Green for instant clearance',
            '⚡ Alert banner appears site-wide with real-time location updates',
            '📊 Estimated clearance time calculated from current vehicle count',
            '🔔 Notification sent to dashboard with emergency type and location',
            '✅ Deactivate once the emergency vehicle has safely passed the location',
          ].map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}
