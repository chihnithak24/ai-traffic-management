/**
 * Login.jsx — Smart City dark auth page
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
  };

  const fillDemo = () => setForm({ email: 'admin@traffic.com', password: 'admin123' });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🚦</div>
          <h1 className="auth-title">AI Traffic System</h1>
          <p className="auth-subtitle">Smart City Control Centre — Sign In</p>
        </div>

        {/* System status indicator */}
        <div style={S.statusBar}>
          <span style={{ ...S.bulb, background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ ...S.bulb, background: '#f59e0b', opacity: 0.3 }} />
          <span style={{ ...S.bulb, background: '#ef4444', opacity: 0.3 }} />
          <span style={S.statusLabel}>Control System — Online</span>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ marginTop: 22 }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'auth-input-err' : ''}`}
              placeholder="admin@traffic.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <span className="auth-err">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'auth-input-err' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            {errors.password && <span className="auth-err">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? <><span className="auth-spinner" /> Authenticating…</> : '🔐 Sign In'}
          </button>
        </form>

        <button className="btn btn-full" onClick={fillDemo} type="button" style={S.demoBtn}>
          ⚡ Fill Demo Credentials
        </button>

        <p style={S.footer}>
          Don't have an account? <Link to="/register" style={{ color: '#38bdf8' }}>Register here</Link>
        </p>
      </div>

      <style>{`
        .auth-input-err { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important; }
        .auth-err { color: #f87171; font-size: .76rem; margin-top: 5px; display: block; }
        .auth-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
          border-radius: 50%; animation: spin .7s linear infinite; vertical-align: middle;
        }
      `}</style>
    </div>
  );
};

const S = {
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, marginTop: 10,
  },
  bulb: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  statusLabel: {
    fontSize: '.68rem', color: 'rgba(255,255,255,0.3)',
    letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginLeft: 4,
  },
  demoBtn: {
    marginTop: 10,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.45)', fontSize: '.84rem', fontWeight: 600,
    borderRadius: 10,
  },
  footer: {
    textAlign: 'center', marginTop: 20,
    fontSize: '.875rem', color: 'rgba(255,255,255,0.25)',
  },
};

export default Login;
