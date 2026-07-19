/**
 * App.jsx - Root Application Component
 * Sets up routing, context providers, and main layout
 */
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TrafficMonitor from './pages/TrafficMonitor';
import MapPage from './pages/MapPage';
import Analytics from './pages/Analytics';
import Predict from './pages/Predict';
import Emergency from './pages/Emergency';
import AIReport from './pages/AIReport';
import Alerts from './pages/Alerts';
import Incidents from './pages/Incidents';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="page-container fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"         element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/traffic" element={
              <ProtectedRoute>
                <AppLayout><TrafficMonitor /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/map"       element={<Navigate to="/traffic" replace />} />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AppLayout><Analytics /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/predict" element={
              <ProtectedRoute>
                <AppLayout><Predict /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/emergency" element={
              <ProtectedRoute>
                <AppLayout><Emergency /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai-report" element={
              <ProtectedRoute>
                <AppLayout><AIReport /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute>
                <AppLayout><Alerts /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/incidents" element={
              <ProtectedRoute>
                <AppLayout><Incidents /></AppLayout>
              </ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
