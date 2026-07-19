/**
 * Navbar.jsx — Smart City Glassmorphism Navbar
 * Live time, date, refresh, signal widget, user chip
 */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const pageTitles = {
  '/dashboard':  { title: 'Dashboard',        subtitle: 'Real-time traffic overview & city intelligence' },
  '/traffic':    { title: 'Traffic Monitor',   subtitle: 'Live map monitoring & route management' },
  '/predict':    { title: 'AI Prediction',     subtitle: 'Smart congestion forecasting & route planning' },
  '/ai-report':  { title: 'AI Reports',        subtitle: 'AI-generated traffic analysis & insights' },
  '/alerts':     { title: 'Alert Centre',      subtitle: 'Real-time congestion & hazard alerts' },
  '/incidents':  { title: 'Incident Tracker',  subtitle: 'Report and manage road incidents' },
  '/analytics':  { title: 'Analytics',         subtitle: 'Traffic trends, patterns & performance KPIs' },
  '/emergency':  { title: 'Emergency Module',  subtitle: 'Emergency vehicle management & services' },
};

const SIG_CYCLE = ['r', 'a', 'g'];

const Navbar = ({ onMenuToggle }) => {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const page = pageTitles[pathname] || { title: 'AI Traffic', subtitle: 'Smart City Management System' };

  const [time,     setTime]     = useState(new Date());
  const [sigIdx,   setSigIdx]   = useState(2);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSigIdx(i => (i + 1) % 3), 3000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setSpinning(true);
    window.location.reload();
    setTimeout(() => setSpinning(false), 800);
  };

  const activeSig = SIG_CYCLE[sigIdx];

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="navbar">
      {/* Left */}
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="17" height="17">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="navbar-page-info">
          <h1 className="navbar-title">{page.title}</h1>
          <p className="navbar-subtitle">{page.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div className="navbar-right">
        {/* Live */}
        <div className="live-badge">
          <span className="live-dot" />
          <span>Live</span>
        </div>

        {/* Traffic light widget */}
        <div className="navbar-signal" title={`Signal phase: ${activeSig === 'r' ? 'Red' : activeSig === 'a' ? 'Amber' : 'Green'}`}>
          <span className={`ns-bulb ns-r ${activeSig === 'r' ? 'ns-on' : ''}`} />
          <span className={`ns-bulb ns-a ${activeSig === 'a' ? 'ns-on' : ''}`} />
          <span className={`ns-bulb ns-g ${activeSig === 'g' ? 'ns-on' : ''}`} />
        </div>

        <div className="navbar-div" />

        {/* Date */}
        <div className="navbar-date">{dateStr}</div>

        {/* Clock */}
        <div className="navbar-time">{timeStr}</div>

        <div className="navbar-div" />

        {/* Refresh */}
        <button
          className={`refresh-btn ${spinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh data"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="16" height="16">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        {/* Theme toggle */}
        <button className="theme-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* User chip */}
        {user && (
          <div className="navbar-user" title={`${user.name} — ${user.role}`}>
            <div className="navbar-user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="navbar-user-name">{user.name?.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
