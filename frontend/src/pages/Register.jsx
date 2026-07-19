/**
 * Register.jsx — Smart City dark auth page
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const result = await register(form.name, form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🚦</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the AI Traffic Management System</p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ marginTop: 22 }}>
          {[
            { key: 'name',     label: 'Full Name',        type: 'text',     placeholder: 'John Doe' },
            { key: 'email',    label: 'Email Address',    type: 'email',    placeholder: 'john@example.com' },
            { key: 'password', label: 'Password',         type: 'password', placeholder: '••••••••' },
            { key: 'confirm',  label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
          ].map(({ key, label, type, placeholder }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input
                type={type}
                className={`form-control ${errors[key] ? 'auth-input-err' : ''}`}
                placeholder={placeholder}
                value={form[key]}
                onChange={set(key)}
              />
              {errors[key] && <span className="auth-err">{errors[key]}</span>}
            </div>
          ))}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? <><span className="auth-spinner" /> Creating account…</> : '✅ Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.875rem', color: 'rgba(255,255,255,0.25)' }}>
          Already have an account? <Link to="/login" style={{ color: '#38bdf8' }}>Sign in</Link>
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

export default Register;
