/**
 * Sidebar.jsx — Traffic Management System
 * Deep-asphalt navigation with SVG traffic icons
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Sidebar.css';

/* ── SVG icon set ── */
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Traffic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="16" rx="3"/>
      <circle cx="12" cy="6"  r="1.3" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="10" r="1.3" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  ),
  Analytics: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 7 11 11 14 15 7 21 10"/>
      <line x1="3" y1="20" x2="21" y2="20"/>
    </svg>
  ),
  Predict: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 6.5-6 7.4V19h-2v-2.6C7.5 15.5 5 12.5 5 9a7 7 0 0 1 7-7z"/>
      <line x1="10" y1="22" x2="14" y2="22"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  ),
  Report: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  Alerts: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Incidents: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9"  x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Emergency: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>
      <line x1="12" y1="8" x2="12" y2="4"/>
      <line x1="4"  y1="4" x2="7"  y2="7"/>
      <line x1="20" y1="4" x2="17" y2="7"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const navItems = [
  { to: '/dashboard', icon: 'Dashboard', label: 'Dashboard'      },
  { to: '/traffic',   icon: 'Traffic',   label: 'Traffic Monitor' },
  { to: '/analytics', icon: 'Analytics', label: 'Analytics'       },
  { to: '/predict',   icon: 'Predict',   label: 'AI Prediction'   },
  { to: '/ai-report', icon: 'Report',    label: 'AI Reports'      },
  { to: '/alerts',    icon: 'Alerts',    label: 'Alerts'          },
  { to: '/incidents', icon: 'Incidents', label: 'Incidents'       },
  { to: '/emergency', icon: 'Emergency', label: 'Emergency'       },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>

        {/* ── Logo ── */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚦</div>
          <div className="sidebar-logo-text">
            <span className="logo-title">AI Traffic</span>
            <span className="logo-subtitle">Management System</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6"  y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>

          {navItems.map(({ to, icon, label }) => {
            const IconComp = Icons[icon];
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon-wrap">
                  <IconComp />
                </span>
                <span className="nav-label">{label}</span>
                {/* Live dot for traffic-related pages */}
                {(to === '/traffic' || to === '/alerts') && (
                  <span className="nav-dot nav-dot-green" />
                )}
                {to === '/emergency' && (
                  <span className="nav-dot nav-dot-red" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Bottom ── */}
        <div className="sidebar-bottom">
          <button className="nav-item theme-toggle-btn" onClick={toggleTheme}>
            <span className="nav-icon-wrap">
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
            </span>
            <span className="nav-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {user && (
            <div className="sidebar-user">
              <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Sign out">
                <Icons.Logout />
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
