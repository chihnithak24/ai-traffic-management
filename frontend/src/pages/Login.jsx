/**
 * Login.jsx — Cinematic AI Traffic System Auth Page
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Animated canvas particles ── */
const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 80 }, () => ({
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
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,179,237,0.55)';
        ctx.fill();
      });
      dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(99,179,237,${0.18 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

/* ── Animated traffic light ── */
const TrafficLight = () => {
  const [phase, setPhase] = useState(0); // 0=red,1=amber,2=green
  useEffect(() => {
    const durations = [3000, 1000, 3000];
    const tick = () => setPhase(p => { const next = (p + 1) % 3; setTimeout(tick, durations[next]); return next; });
    const t = setTimeout(tick, durations[0]);
    return () => clearTimeout(t);
  }, []);
  const colors = [
    { bg: '#ef4444', glow: '#ef4444', label: 'STOP' },
    { bg: '#f59e0b', glow: '#f59e0b', label: 'READY' },
    { bg: '#22c55e', glow: '#22c55e', label: 'GO' },
  ];
  return (
    <div style={TL.housing}>
      <div style={TL.pole} />
      {colors.map((c, i) => (
        <div key={i} style={{
          ...TL.bulb,
          background: phase === i ? c.bg : 'rgba(255,255,255,0.06)',
          boxShadow: phase === i ? `0 0 18px 6px ${c.glow}88, 0 0 40px 10px ${c.glow}33` : 'none',
          transition: 'all 0.4s ease',
        }} />
      ))}
      <div style={TL.label}>{colors[phase].label}</div>
    </div>
  );
};
const TL = {
  housing: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    border: '2px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '18px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    position: 'relative',
  },
  pole: { width: 4, height: 0, background: 'transparent' },
  bulb: { width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' },
  label: {
    fontSize: '.55rem', fontWeight: 800, letterSpacing: '.12em',
    color: 'rgba(255,255,255,0.3)', marginTop: 4,
  },
};

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setErrors({ general: result.message || 'Invalid credentials' });
  };

  return (
    <div style={S.page}>
      <ParticleCanvas />

      {/* Ambient orbs */}
      <div style={{ ...S.orb, width: 700, height: 700, top: -200, right: -200, background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
      <div style={{ ...S.orb, width: 500, height: 500, bottom: -150, left: -100, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

      {/* Grid overlay */}
      <div style={S.grid} />

      {/* Main layout */}
      <div style={S.layout}>

        {/* Left hero panel */}
        <div style={S.hero}>
          <TrafficLight />
          <div style={S.heroText}>
            <div style={S.heroTag}>🌐 Smart City Infrastructure</div>
            <h1 style={S.heroTitle}>
              AI-Powered<br />
              <span style={S.heroAccent}>Traffic Control</span>
            </h1>
            <p style={S.heroDesc}>
              Real-time congestion monitoring, predictive signal optimization,
              and emergency response — all in one intelligent platform.
            </p>
            <div style={S.heroStats}>
              {[
                { val: '99.9%', label: 'Uptime' },
                { val: '<2s',   label: 'Response' },
                { val: 'AI',    label: 'Powered' },
              ].map(({ val, label }) => (
                <div key={label} style={S.heroStat}>
                  <span style={S.heroStatVal}>{val}</span>
                  <span style={S.heroStatLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right auth card */}
        <div style={S.card}>
          {/* Top gradient line */}
          <div style={S.cardLine} />

          <div style={S.cardInner}>
            {/* Logo */}
            <div style={S.logoWrap}>
              <div style={S.logoIcon}>🚦</div>
              <div>
                <div style={S.logoTitle}>AI Traffic System</div>
                <div style={S.logoSub}>Smart City Control Centre</div>
              </div>
            </div>

            {/* Status bar */}
            <div style={S.statusBar}>
              <span style={{ ...S.dot, background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span style={{ ...S.dot, background: '#f59e0b', opacity: 0.25 }} />
              <span style={{ ...S.dot, background: '#ef4444', opacity: 0.25 }} />
              <span style={S.statusText}>All Systems Operational</span>
              <span style={S.statusBadge}>● LIVE</span>
            </div>

            <h2 style={S.formTitle}>Welcome back</h2>
            <p style={S.formSub}>Sign in to your control centre</p>

            {errors.general && (
              <div style={S.errorBanner}>⚠️ {errors.general}</div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ marginTop: 20 }}>
              {/* Email */}
              <div style={S.fieldWrap}>
                <label style={S.label}>Email Address</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>✉️</span>
                  <input
                    type="email"
                    style={{ ...S.input, ...(errors.email ? S.inputErr : {}) }}
                    placeholder="admin@traffic.com"
                    value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({}); }}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span style={S.errMsg}>{errors.email}</span>}
              </div>

              {/* Password */}
              <div style={S.fieldWrap}>
                <label style={S.label}>Password</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    style={{ ...S.input, paddingRight: 44, ...(errors.password ? S.inputErr : {}) }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({}); }}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={S.eyeBtn}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <span style={S.errMsg}>{errors.password}</span>}
              </div>

              <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? (
                  <><span style={S.spinner} /> Authenticating…</>
                ) : (
                  <><span>🔐</span> Sign In to Control Centre</>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setForm({ email: 'admin@traffic.com', password: 'admin123' })}
              style={S.demoBtn}
            >
              ⚡ Fill Demo Credentials
            </button>

            <p style={S.footer}>
              No account?{' '}
              <Link to="/register" style={{ color: '#38bdf8', fontWeight: 600 }}>
                Register here →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes orbFloat { 0%,100%{transform:scale(1) translate(0,0);} 50%{transform:scale(1.08) translate(-15px,15px);} }
        @keyframes gridPan { 0%{background-position:0 0;} 100%{background-position:50px 50px;} }
        @keyframes logoBounce { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
      `}</style>
    </div>
  );
};

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #020817 0%, #0a1628 40%, #060d1f 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative', overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  orb: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
    animation: 'orbFloat 10s ease-in-out infinite',
  },
  grid: {
    position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
    animation: 'gridPan 25s linear infinite',
  },
  layout: {
    position: 'relative', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: 60,
    maxWidth: 960, width: '100%',
    animation: 'fadeSlideUp .6s cubic-bezier(.22,1,.36,1) both',
  },
  /* Hero */
  hero: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 32,
    '@media(max-width:768px)': { display: 'none' },
  },
  heroText: { display: 'flex', flexDirection: 'column', gap: 14 },
  heroTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', borderRadius: 999,
    background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
    color: '#93c5fd', fontSize: '.75rem', fontWeight: 600, letterSpacing: '.04em',
  },
  heroTitle: {
    fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.1,
    color: '#f0f9ff', letterSpacing: '-.04em',
  },
  heroAccent: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroDesc: {
    fontSize: '.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7,
    maxWidth: 340,
  },
  heroStats: { display: 'flex', gap: 28, marginTop: 8 },
  heroStat: { display: 'flex', flexDirection: 'column', gap: 3 },
  heroStatVal: { fontSize: '1.4rem', fontWeight: 800, color: '#e0f2fe', letterSpacing: '-.03em' },
  heroStatLabel: { fontSize: '.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' },
  /* Card */
  card: {
    width: '100%', maxWidth: 420, flexShrink: 0,
    background: 'rgba(10,18,40,0.92)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(37,99,235,0.22)',
    borderRadius: 24,
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    overflow: 'hidden', position: 'relative',
  },
  cardLine: {
    height: 3,
    background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #8b5cf6 70%, transparent 100%)',
  },
  cardInner: { padding: '32px 36px 36px' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 },
  logoIcon: {
    width: 52, height: 52, borderRadius: 16,
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.6rem',
    boxShadow: '0 8px 24px rgba(37,99,235,0.5)',
    animation: 'logoBounce 3s ease-in-out infinite',
    flexShrink: 0,
  },
  logoTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#e8f0fc', letterSpacing: '-.02em' },
  logoSub: { fontSize: '.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 500 },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, marginBottom: 20,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  statusText: { fontSize: '.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '.04em', flex: 1 },
  statusBadge: { fontSize: '.62rem', color: '#22c55e', fontWeight: 700, letterSpacing: '.06em' },
  formTitle: { fontSize: '1.35rem', fontWeight: 800, color: '#e8f0fc', letterSpacing: '-.03em' },
  formSub: { fontSize: '.82rem', color: 'rgba(255,255,255,0.3)', marginTop: 4, marginBottom: 4 },
  errorBanner: {
    marginTop: 12, padding: '10px 14px', borderRadius: 10,
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', fontSize: '.82rem', fontWeight: 600,
  },
  fieldWrap: { marginBottom: 16 },
  label: { display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 7, letterSpacing: '.02em' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.85rem', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '11px 14px 11px 40px',
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#e8f0fc', fontSize: '.875rem',
    outline: 'none', transition: 'all .2s',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  },
  inputErr: { borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', padding: 2,
  },
  errMsg: { display: 'block', color: '#f87171', fontSize: '.73rem', marginTop: 5, fontWeight: 500 },
  submitBtn: {
    width: '100%', padding: '13px 20px', marginTop: 6,
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    border: 'none', borderRadius: 12, color: '#fff',
    fontSize: '.9rem', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
    transition: 'all .2s', letterSpacing: '-.01em',
    fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(255,255,255,.25)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin .7s linear infinite',
  },
  demoBtn: {
    width: '100%', marginTop: 10, padding: '10px 16px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, color: 'rgba(255,255,255,0.4)',
    fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
    transition: 'all .2s', fontFamily: "'Inter', sans-serif",
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: '.84rem', color: 'rgba(255,255,255,0.25)' },
};

export default Login;
