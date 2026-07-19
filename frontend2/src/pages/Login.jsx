import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const FloatingShape = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full opacity-20 ${className}`}
    animate={{ y: [-10, 10, -10], rotate: [0, 180, 360] }}
    transition={{ duration: 8 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

export default function Login() {
  const { login, loading, isAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  if (isAuth) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const validate = () => {
    const e = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const r = await login(form.email, form.password);
    if (r.success) navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.25),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_50%,_#312e81_100%)]">
      <FloatingShape className="-left-20 top-0 h-72 w-72 bg-indigo-500" delay={0} />
      <FloatingShape className="right-10 top-1/4 h-48 w-48 bg-fuchsia-500" delay={2} />
      <FloatingShape className="bottom-20 left-1/4 h-36 w-36 bg-cyan-500" delay={4} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 lg:px-8">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="hidden lg:block">
            <div className="rounded-[32px] border border-white/10 bg-white/10 p-8 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
              <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                City pulse platform
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-white">Command your traffic network from one sleek workspace.</h1>
              <p className="mt-4 max-w-xl text-base text-slate-300">
                Monitor live signals, predict congestion, and respond to incidents with a calm, intelligent control center experience.
              </p>
              <div className="mt-8 space-y-3 text-sm text-slate-200">
                {['Live map intelligence', 'Predictive AI routing', 'Instant incident coordination'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/20 px-4 py-3">
                    <span className="text-lg text-cyan-300">✦</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md justify-self-center">
            <div className="rounded-[30px] border border-white/20 bg-slate-900/70 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
              <div className="mb-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-3xl shadow-lg shadow-indigo-500/30">
                  🚦
                </motion.div>
                <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
                <p className="mt-1 text-sm text-slate-400">Sign in to the AI traffic control center</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {[
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@traffic.ai' },
                  { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
                    <input
                      type={type}
                      className={`w-full rounded-2xl border bg-white/10 px-4 py-3 text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[key] ? 'border-rose-400' : 'border-white/10'}`}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                    {errors[key] && <p className="mt-1 text-xs text-rose-400">{errors[key]}</p>}
                  </div>
                ))}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60">
                  {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in...</> : '🔐 Sign In to Dashboard'}
                </motion.button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-400">
                New here? <Link to="/register" className="font-semibold text-indigo-300 hover:text-indigo-200">Create account</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
