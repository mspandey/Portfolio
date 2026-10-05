import React from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import AdminLogin from './components/admin/AdminLogin.jsx';
import AdminDashboardLayout from './components/admin/AdminDashboardLayout.jsx';

export default function AdminRoot() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-boot-screen">
        <div className="admin-boot-spinner" aria-label="Loading admin…" />
      </div>
    );
  }

  return isAuthenticated ? <AdminDashboardLayout /> : <AdminLogin />;
}
