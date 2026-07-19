import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notifSvc } from '../../services/trafficService';

const titles = {
  '/dashboard': { title: 'Dashboard', sub: 'Real-time traffic overview' },
  '/traffic': { title: 'Traffic Management', sub: 'Monitor and manage locations' },
  '/map': { title: 'Live Traffic Map', sub: 'Interactive real-time map' },
  '/live-location': { title: 'Live Location', sub: 'Real-time GPS tracking with address lookup' },
  '/analytics': { title: 'Analytics', sub: 'Traffic trends & insights' },
  '/predict': { title: 'AI Prediction Engine', sub: 'Smart congestion forecasting' },
  '/emergency': { title: 'Emergency Module', sub: 'Emergency vehicle management' },
  '/notifications': { title: 'Notifications', sub: 'Alerts & system messages' },
  '/incidents': { title: 'Incident Reports', sub: 'Report and track road incidents' },
  '/routes': { title: 'Route Planner', sub: 'Plan the best route between locations' },
};

export default function Navbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState(new Date());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const page = titles[pathname] || { title: 'AI Traffic', sub: '' };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    notifSvc.getAll({ unread: true }).then((r) => setUnread(r.unreadCount || 0)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="btn-icon lg:hidden">
            ☰
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">{page.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{page.sub}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400 md:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Live</span>
          </div>

          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 md:block">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>

          <button onClick={toggle} className="btn-icon text-lg">
            {isDark ? '☀️' : '🌙'}
          </button>

          <button onClick={() => navigate('/notifications')} className="btn-icon relative">
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setUserMenuOpen((p) => !p)} className="flex items-center gap-2 rounded-2xl px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">{user?.name}</span>
              <span className="text-xs text-slate-400">▾</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
                <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <button onClick={() => { logout(); navigate('/login'); }} className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20">
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
