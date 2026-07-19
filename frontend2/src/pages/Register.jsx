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

const rules = [
  { key: 'len', label: 'Minimum 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'At least 1 uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'At least 1 lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'num', label: 'At least 1 number', test: (p) => /\d/.test(p) },
  { key: 'spec', label: 'At least 1 special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function Register() {
  const { register, loading, isAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPwRules, setShowPwRules] = useState(false);

  if (isAuth) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const pwPassed = rules.every((r) => r.test(form.password));

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!pwPassed) e.password = 'Password does not meet all requirements';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const r = await register(form.name, form.email, form.password);
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
                Join the network
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-white">Create a smarter, safer city operations profile.</h1>
              <p className="mt-4 max-w-xl text-base text-slate-300">
                Bring your team into a unified traffic control experience with live insights, predictive forecasting, and rapid response tools.
              </p>
              <div className="mt-8 space-y-3 text-sm text-slate-200">
                {['Secure team access', 'Live monitoring', 'Fast incident reporting'].map((item) => (
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
              <div className="mb-7 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-2xl shadow-lg shadow-indigo-500/30">
                  🚦
                </motion.div>
                <h2 className="text-2xl font-semibold text-white">Create account</h2>
                <p className="mt-1 text-sm text-slate-400">Join AI Traffic Management System</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Full Name</label>
                  <input type="text" className={`w-full rounded-2xl border bg-white/10 px-4 py-3 text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-rose-400' : 'border-white/10'}`} placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Email Address</label>
                  <input type="email" className={`w-full rounded-2xl border bg-white/10 px-4 py-3 text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.email ? 'border-rose-400' : 'border-white/10'}`} placeholder="you@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                  <input type="password" className={`w-full rounded-2xl border bg-white/10 px-4 py-3 text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.password ? 'border-rose-400' : form.password && pwPassed ? 'border-emerald-400' : 'border-white/10'}`} placeholder="Traffic@123" value={form.password} onFocus={() => setShowPwRules(true)} onChange={(e) => { setForm({ ...form, password: e.target.value }); setShowPwRules(true); }} />
                  {errors.password && !showPwRules && <p className="mt-1 text-xs text-rose-400">{errors.password}</p>}

                  {(showPwRules || form.password) && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-3">
                      {rules.map((r) => {
                        const ok = r.test(form.password);
                        return (
                          <div key={r.key} className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>{ok ? '✓' : '✗'}</span>
                            <span className={`text-xs ${ok ? 'text-emerald-300' : 'text-slate-400'}`}>{r.label}</span>
                          </div>
                        );
                      })}
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div animate={{ width: `${(rules.filter((r) => r.test(form.password)).length / rules.length) * 100}%` }} className={`h-full rounded-full transition-all ${rules.filter((r) => r.test(form.password)).length <= 1 ? 'bg-rose-500' : rules.filter((r) => r.test(form.password)).length <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      </div>
                      <p className="text-right text-[10px] text-slate-400">{rules.filter((r) => r.test(form.password)).length}/{rules.length} requirements met</p>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm Password</label>
                  <input type="password" className={`w-full rounded-2xl border bg-white/10 px-4 py-3 text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.confirm ? 'border-rose-400' : form.confirm && form.confirm === form.password ? 'border-emerald-400' : 'border-white/10'}`} placeholder="••••••••" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                  {errors.confirm && <p className="mt-1 text-xs text-rose-400">{errors.confirm}</p>}
                  {form.confirm && form.confirm === form.password && <p className="mt-1 text-xs text-emerald-400">✓ Passwords match</p>}
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60">
                  {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creating...</> : '✅ Create Account'}
                </motion.button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-400">
                Already have an account? <Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
