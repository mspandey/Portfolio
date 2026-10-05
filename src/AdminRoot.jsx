import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import AdminLogin from './components/admin/AdminLogin.jsx';
import AdminDashboardLayout from './components/admin/AdminDashboardLayout.jsx';

export default function AdminRoot() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  // Sync state with browser navigation (Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Strict Client-Side Route Guard
  useEffect(() => {
    if (loading) return; // Do nothing while server authentication check is pending

    const path = window.location.pathname;

    if (!isAuthenticated) {
      // Unauthenticated visitor attempting to access /admin or any protected subroute
      if (path !== '/admin/login') {
        window.history.replaceState(null, '', '/admin/login');
        setCurrentPath('/admin/login');
      }
    } else {
      // Authenticated admin visiting /admin/login is redirected to /admin
      if (path === '/admin/login') {
        window.history.replaceState(null, '', '/admin');
        setCurrentPath('/admin');
      }
    }
  }, [isAuthenticated, loading]);

  // Loading Screen: explicit loading state, NEVER render dashboard before auth confirmed
  if (loading) {
    return (
      <div className="admin-boot-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0d14',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div className="admin-boot-spinner" aria-label="Verifying authentication…" />
      </div>
    );
  }

  // Not authenticated: always render login UI
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          window.history.replaceState(null, '', '/admin');
          setCurrentPath('/admin');
        }}
      />
    );
  }

  // Authenticated Admin: render dashboard
  return <AdminDashboardLayout key={currentPath} />;
}
