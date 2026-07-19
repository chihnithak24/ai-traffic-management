/**
 * AiPredict.jsx — AI prediction page with framer-motion cards
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { predictSvc, trafficSvc } from '../services/trafficService';
import { toast } from 'react-toastify';

const LevelColor = { Low: 'text-emerald-500', Medium: 'text-amber-500', High: 'text-red-500' };
const LevelBg    = { Low: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800/40',
                     Medium: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800/40',
                     High: 'from-red-500/10 to-pink-500/10 border-red-200 dark:border-red-800/40' };
const LevelIcon  = { Low: '🟢', Medium: '🟡', High: '🔴' };

const ConfidenceBar = ({ score }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
      <span>🎯 AI Confidence</span><span>{score}%</span>
    </div>
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, delay: 0.3 }}
        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
    </div>
  </div>
);

// Time-based forecast
const TimeForecast = ({ vehicleCount }) => {
  const forecasts = [
    { label: '15 min', mult: 1.11, icon: '⏩' },
    { label: '30 min', mult: 1.21, icon: '⏭️' },
    { label: '1 hour', mult: 1.44, icon: '🕐' },
    { label: '3 hours',mult: 1.72, icon: '🕒' },
  ].map(f => {
    const v = Math.round(vehicleCount * f.mult);
    const level = v < 50 ? 'Low' : v <= 150 ? 'Medium' : 'High';
    return { ...f, vehicles: v, level };
  });
  return (
    <div className="px-5 py-4 border-t border-white/20 dark:border-gray-700/30">
      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">📈 Traffic Forecast</p>
      <div className="grid grid-cols-2 gap-2">
        {forecasts.map(f => (
          <div key={f.label} className="bg-white/30 dark:bg-gray-800/40 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">{f.icon} {f.label}</span>
            <div className="text-right">
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{f.vehicles}</span>
              <span className={`ml-1 text-[10px] font-semibold ${LevelColor[f.level]}`}>{f.level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PredCard = ({ area, vehicleCount, prediction, onClose }) => {
  if (!prediction) return null;
  const { estimatedCongestion: ec, signalDuration, waitingTime, suggestedRoute, peakHour, confidenceScore } = prediction;
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`rounded-2xl border bg-gradient-to-br ${LevelBg[ec] || LevelBg.Medium} backdrop-blur-sm shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/30 dark:border-gray-700/40 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{area}</p>
            <p className="text-xs text-gray-500">{vehicleCount} vehicles currently</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${LevelColor[ec] || ''}`}>{LevelIcon[ec]} {ec}</span>
          {onClose && <button onClick={onClose} className="btn-icon text-xs">✕</button>}
        </div>
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-white/30 dark:divide-gray-700/40">
        {[
          { icon: '⏱️', label: 'Signal', value: `${signalDuration}s` },
          { icon: '⌛', label: 'Wait',   value: `${waitingTime}s` },
          { icon: '📊', label: 'Level',  value: ec, color: LevelColor[ec] },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="px-4 py-3 text-center">
            <span className="text-lg">{icon}</span>
            <p className={`font-bold text-sm mt-1 ${color || 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
            <p className="text-[10px] text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      {/* Time-based forecast */}
      <TimeForecast vehicleCount={vehicleCount} />
      {/* Route */}
      <div className="px-5 py-3 flex gap-2.5 items-start bg-white/30 dark:bg-gray-800/30 border-t border-white/20 dark:border-gray-700/30">
        <span className="text-base mt-0.5 flex-shrink-0">🛣️</span>
        <p className="text-xs text-gray-700 dark:text-gray-300">{suggestedRoute}</p>
      </div>
      {/* Peak */}
      <div className="px-5 py-3 flex gap-2.5 items-start border-t border-white/20 dark:border-gray-700/30">
        <span className="text-base mt-0.5 flex-shrink-0">🕐</span>
        <p className="text-xs text-gray-700 dark:text-gray-300">{peakHour}</p>
      </div>
      {/* Confidence */}
      <div className="px-5 py-4 border-t border-white/20 dark:border-gray-700/30">
        <ConfidenceBar score={confidenceScore} />
      </div>
    </motion.div>
  );
};

export default function AiPredict() {
  const [form, setForm]           = useState({ vehicleCount: '', areaName: '' });
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [bulk, setBulk]           = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  useEffect(() => { trafficSvc.getAll({}).then(r => setLocations(r.data)).catch(() => {}); }, []);

  const runManual = async (e) => {
    e.preventDefault();
    if (!form.vehicleCount || isNaN(form.vehicleCount)) { toast.error('Enter valid vehicle count'); return; }
    setLoading(true);
    try {
      const r = await predictSvc.predict({ vehicleCount: +form.vehicleCount, areaName: form.areaName || 'Manual Input' });
      setResult(r);
    } catch { toast.error('Prediction failed'); }
    finally { setLoading(false); }
  };

  const runLocation = async () => {
    if (!selectedId) { toast.error('Select a location'); return; }
    setLoading(true);
    try {
      const r = await predictSvc.predict({ trafficId: selectedId });
      setResult(r);
    } catch { toast.error('Prediction failed'); }
    finally { setLoading(false); }
  };

  const runBulk = async () => {
    setBulkLoading(true);
    try {
      const r = await predictSvc.bulk();
      setBulk(r.data);
      toast.success(`Analyzed ${r.data.length} locations`);
    } catch { toast.error('Bulk failed'); }
    finally { setBulkLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Prediction Engine</h2>
          <p className="text-sm text-gray-500 mt-0.5">Smart congestion forecasting powered by AI simulation</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">AI Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Manual */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-4">🔢 Manual Prediction</h3>
            <form onSubmit={runManual} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Area Name <span className="text-gray-400">(optional)</span></label>
                <input className="input" placeholder="e.g. MG Road" value={form.areaName} onChange={e => setForm({ ...form, areaName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Vehicle Count <span className="text-red-400">*</span></label>
                <input type="number" min="0" className="input" placeholder="e.g. 85" value={form.vehicleCount} onChange={e => setForm({ ...form, vehicleCount: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[['<30','Low','#22c55e'],['30–70','Medium','#f59e0b'],['>70','High','#ef4444']].map(([r, l, c]) => (
                  <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-2">
                    <p style={{ color: c }} className="font-bold">{r}</p>
                    <p className="text-gray-400">{l}</p>
                  </div>
                ))}
              </div>
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : '🤖 Run AI Prediction'}
              </button>
            </form>
          </div>

          {/* From location */}
          {locations.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-4">📍 Predict from Location</h3>
              <select className="input mb-3" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">-- Select location --</option>
                {locations.map(l => <option key={l._id} value={l._id}>{l.areaName} — {l.city} ({l.vehicleCount}v)</option>)}
              </select>
              <button className="btn-primary w-full justify-center" onClick={runLocation} disabled={loading || !selectedId}>
                📊 Analyze Location
              </button>
            </div>
          )}
        </div>

        {/* Result panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <PredCard key="result" area={result.area} vehicleCount={result.vehicleCount} prediction={result.prediction} onClose={() => setResult(null)} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300">AI Prediction Engine</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-xs">Enter a vehicle count or select a location from the database to receive an AI-powered traffic analysis.</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Congestion Estimation', 'Signal Timing', 'Wait Time', 'Route Suggestion', 'Peak Hours'].map(f => (
                    <span key={f} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 px-3 py-1 rounded-full font-medium">✓ {f}</span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bulk analysis */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">📋 Bulk AI Analysis</h3>
          <button className="btn-primary text-xs px-4 py-2" onClick={runBulk} disabled={bulkLoading}>
            {bulkLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : '🔄 Analyze All Locations'}
          </button>
        </div>
        {bulk.length > 0 ? (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bulk.map(item => <PredCard key={item._id} area={item.areaName} vehicleCount={item.vehicleCount} prediction={item.prediction} />)}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">Click "Analyze All Locations" to run bulk AI analysis</div>
        )}
      </div>
    </div>
  );
}
