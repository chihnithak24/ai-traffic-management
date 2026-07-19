/**
 * Notifications.jsx — Notifications page with read/clear
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifSvc } from '../services/trafficService';
import { toast } from 'react-toastify';

const TYPE_META = {
  info:      { icon: 'ℹ️', bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-800/40',   text: 'text-blue-600 dark:text-blue-400' },
  warning:   { icon: '⚠️', bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-600 dark:text-amber-400' },
  danger:    { icon: '🚨', bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-800/40',     text: 'text-red-600 dark:text-red-400' },
  success:   { icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400' },
  emergency: { icon: '🆘', bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-300 dark:border-red-700/60',     text: 'text-red-700 dark:text-red-400' },
};

export default function Notifications() {
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = async () => {
    setLoading(true);
    try { const r = await notifSvc.getAll({}); setNotifs(r.data); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try { await notifSvc.markRead(); toast.success('All marked as read'); load(); }
    catch { toast.error('Failed'); }
  };

  const clearAll = async () => {
    try { await notifSvc.clear(); setNotifs([]); toast.success('Cleared'); }
    catch { toast.error('Failed'); }
  };

  const visible = filter === 'all' ? notifs : filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs.filter(n => n.type === filter);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{notifs.length} total alerts</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={markAll}>✓ Mark All Read</button>
          <button className="btn-danger text-xs"    onClick={clearAll}>🗑️ Clear All</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all','All'],['unread','Unread'],['emergency','Emergency'],['danger','Danger'],['warning','Warning'],['success','Success'],['info','Info']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${filter === val ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 space-y-3 text-gray-400">
          <div className="text-5xl">🔔</div>
          <p className="font-semibold">No notifications</p>
          <p className="text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((n, i) => {
              const meta = TYPE_META[n.type] || TYPE_META.info;
              return (
                <motion.div key={n._id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-4 p-4 rounded-2xl border ${meta.bg} ${meta.border} ${!n.isRead ? 'shadow-md' : 'opacity-70'}`}
                >
                  <div className={`text-2xl flex-shrink-0`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm ${meta.text}`}>{n.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                        <span className="text-[10px] text-gray-400">
                          {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                    {n.area && <span className="text-xs text-gray-400 mt-1 inline-block">📍 {n.area}</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
