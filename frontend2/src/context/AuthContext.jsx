/**
 * AuthContext.jsx — JWT + localStorage auth state
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem('traffic_user_v2')); } catch { return null; } });
  const [token, setToken]   = useState(() => localStorage.getItem('traffic_token_v2'));
  const [loading, setLoading] = useState(false);

  const persist = (userData, tok) => {
    setUser(userData);
    setToken(tok);
    localStorage.setItem('traffic_user_v2', JSON.stringify(userData));
    localStorage.setItem('traffic_token_v2', tok);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email, password });
      const { token: tok, ...u } = r.data.data;
      persist(u, tok);
      toast.success(`Welcome back, ${u.name}! 👋`);
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.message || 'Login failed';
      toast.error(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const r = await api.post('/auth/register', { name, email, password });
      const { token: tok, ...u } = r.data.data;
      persist(u, tok);
      toast.success('Account created! 🎉');
      return { success: true };
    } catch (e) {
      // Show the actual server error message so the user knows what went wrong
      const msg = e.response?.data?.message
        || (e.code === 'ERR_NETWORK' ? 'Cannot reach server — is the backend running on port 5000?' : 'Registration failed');
      toast.error(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  };

  const logout = useCallback(() => {
    setUser(null); setToken(null);
    localStorage.removeItem('traffic_user_v2');
    localStorage.removeItem('traffic_token_v2');
    toast.info('Signed out');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuth: !!token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
};
