/**
 * App.jsx — Root with routing, providers, layout
 */
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TrafficMgmt from './pages/TrafficMgmt';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import AiPredict from './pages/AiPredict';
import Emergency from './pages/Emergency';
import Notifications from './pages/Notifications';
import Incidents from './pages/Incidents';
import RoutePlanner from './pages/RoutePlanner';
import LiveLocation from './pages/LiveLocation';

const Guard = ({ children }) => {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar
        isOpen={sidebarOpen}
        mobileOpen={mobileSidebar}
        onMobileClose={() => setMobileSidebar(false)}
      />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'} ml-0`}>
        <Navbar onMenuToggle={() => { setSidebarOpen((p) => !p); setMobileSidebar((p) => !p); }} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {[
              ['/dashboard', <Dashboard />],
              ['/traffic', <TrafficMgmt />],
              ['/map', <MapView />],
              ['/analytics', <Analytics />],
              ['/predict', <AiPredict />],
              ['/emergency', <Emergency />],
              ['/notifications', <Notifications />],
              ['/incidents', <Incidents />],
              ['/routes', <RoutePlanner />],
              ['/live-location', <LiveLocation />],
            ].map(([path, el]) => (
              <Route key={path} path={path} element={<Guard><Layout>{el}</Layout></Guard>} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="colored"
            toastClassName="rounded-xl"
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
