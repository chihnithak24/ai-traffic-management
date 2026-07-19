import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/traffic', icon: '🚦', label: 'Traffic Management' },
  { to: '/map', icon: '🗺️', label: 'Live Map' },
  { to: '/live-location', icon: '📍', label: 'Live Location' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/predict', icon: '🤖', label: 'AI Prediction' },
  { to: '/emergency', icon: '🚨', label: 'Emergency' },
  { to: '/incidents', icon: '📋', label: 'Incidents' },
  { to: '/routes', icon: '🛣️', label: 'Route Planner' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-xl shadow-lg shadow-indigo-500/30">
            🚦
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AI Traffic</p>
            <p className="mt-1 text-xs text-slate-400">Smart city operations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Navigation</p>
        {navLinks.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'} rounded-2xl border border-transparent bg-white/0`
            }
          >
            <span className="w-5 text-center text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-3 pb-4 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-300">
            <span>System health</span>
            <span className="text-emerald-300">Stable</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Neural routing synced
          </div>
        </div>
        <button onClick={toggle} className="nav-item nav-item-inactive w-full rounded-2xl border border-white/10 bg-white/5">
          <span className="w-5 text-center text-base">{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {user && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-100">{user.name}</p>
              <p className="text-[10px] capitalize text-slate-400">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-sm text-slate-400 transition-colors hover:text-rose-400">
              ⏏
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 flex-col lg:flex">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="fixed left-0 top-0 z-50 h-full w-72 shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
