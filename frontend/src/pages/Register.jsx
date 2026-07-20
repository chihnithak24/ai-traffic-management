/**
 * Register.jsx — Cinematic AI Traffic System Register Page
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Particle canvas (shared style with Login) ── */
const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > W) d.vx *= -1;
        if (d.y < 0 || d.y > H) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,92,246,0.5)'; ctx.fill();
      });
      dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(139,92,246,${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.6; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const result = await register(form.name, form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setErrors({ general: result.message || 'Registration failed' });
  };

  const set = (key) => (e) => { setForm({ ...form, [key]: e.target.value }); setErrors({}); };

  const fields = [
    { key: 'name',     label: 'Full Name',        type: 'text',                          icon: '👤', placeholder: 'John Doe' },
    { key: 'email',    label: 'Email Address',    type: 'email',                         icon: '✉️', placeholder: 'john@example.com' },
    { key: 'password', label: 'Password',         type: showPass ? 'text' : 'password',  icon: '🔒', placeholder: '••••••••', eye: true },
    { key: 'confirm',  label: 'Confirm Password', type: showPass ? 'text' : 'password',  icon: '🔑', placeholder: '••••••••' },
  ];

  return (
    <div style={S.page}>
      <ParticleCanvas />
      <div style={{ ...S.orb, width: 600, height: 600, top: -150, left: -150, background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)' }} />
      <div style={{ ...S.orb, width: 400, height: 400, bottom: -100, right: -100, background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />
      <div style={S.grid} />

      <div style={S.card}>
        <div style={S.cardLine} />
        <div style={S.cardInner}>

          {/* Logo */}
          <div style={S.logoWrap}>
            <div style={S.logoIcon}>🚦</div>
            <div>
              <div style={S.logoTitle}>Create Account</div>
              <div style={S.logoSub}>Join the AI Traffic Management System</div>
            </div>
          </div>

          {errors.general && (
            <div style={S.errorBanner}>⚠️ {errors.general}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {fields.map(({ key, label, type, icon, placeholder, eye }) => (
              <div key={key} style={S.fieldWrap}>
                <label style={S.label}>{label}</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>{icon}</span>
                  <input
                    type={type}
                    style={{ ...S.input, paddingRight: eye ? 44 : 14, ...(errors[key] ? S.inputErr : {}) }}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={set(key)}
                    autoComplete={key === 'confirm' ? 'new-password' : key}
                  />
                  {eye && (
                    <button type="button" onClick={() => setShowPass(p => !p)} style={S.eyeBtn}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  )}
                </div>
                {errors[key] && <span style={S.errMsg}>{errors[key]}</span>}
              </div>
            ))}

            <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><span style={S.spinner} /> Creating account…</> : <><span>✅</span> Create Account</>}
            </button>
          </form>

          <p style={S.footer}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600 }}>Sign in →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);} }
        @keyframes orbFloat { 0%,100%{transform:scale(1);}50%{transform:scale(1.08) translate(-10px,10px);} }
        @keyframes gridPan { 0%{background-position:0 0;}100%{background-position:50px 50px;} }
        @keyframes logoBounce { 0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);} }
      `}</style>
    </div>
  );
};

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #020817 0%, #0d0a28 40%, #060d1f 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative', overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  orb: { position: 'absolute', borderRadius: '50%', pointerEvents: 'none', zIndex: 1, animation: 'orbFloat 10s ease-in-out infinite' },
  grid: {
    position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
    backgroundSize: '50px 50px', animation: 'gridPan 25s linear infinite',
  },
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 440,
    background: 'rgba(10,8,30,0.92)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(124,58,237,0.22)',
    borderRadius: 24,
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    overflow: 'hidden',
    animation: 'fadeSlideUp .6s cubic-bezier(.22,1,.36,1) both',
  },
  cardLine: { height: 3, background: 'linear-gradient(90deg, transparent 0%, #7c3aed 30%, #2563eb 70%, transparent 100%)' },
  cardInner: { padding: '32px 36px 36px' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 },
  logoIcon: {
    width: 52, height: 52, borderRadius: 16,
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(124,58,237,0.5)',
    animation: 'logoBounce 3s ease-in-out infinite', flexShrink: 0,
  },
  logoTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#e8f0fc', letterSpacing: '-.02em' },
  logoSub: { fontSize: '.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 500 },
  errorBanner: {
    marginBottom: 16, padding: '10px 14px', borderRadius: 10,
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', fontSize: '.82rem', fontWeight: 600,
  },
  fieldWrap: { marginBottom: 14 },
  label: { display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '.02em' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.85rem', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '10px 14px 10px 40px',
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#e8f0fc', fontSize: '.875rem',
    outline: 'none', transition: 'all .2s', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
  },
  inputErr: { borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', padding: 2 },
  errMsg: { display: 'block', color: '#f87171', fontSize: '.73rem', marginTop: 5, fontWeight: 500 },
  submitBtn: {
    width: '100%', padding: '13px 20px', marginTop: 8,
    background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
    border: 'none', borderRadius: 12, color: '#fff',
    fontSize: '.9rem', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 6px 24px rgba(124,58,237,0.45)',
    transition: 'all .2s', letterSpacing: '-.01em', fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(255,255,255,.25)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin .7s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: '.84rem', color: 'rgba(255,255,255,0.25)' },
};

export default Register;
