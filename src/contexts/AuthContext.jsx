import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkAdminAuth, loginAdmin, logoutAdmin } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifySession = useCallback(async () => {
    try {
      const res = await checkAdminAuth();
      if (res && res.user && res.user.role === 'admin') {
        setUser(res.user);
      } else {
        localStorage.removeItem('admin_token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('admin_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (username, password) => {
    const res = await loginAdmin(username, password);
    if (!res || !res.user || res.user.role !== 'admin') {
      throw new Error('Access denied: Administrator privileges required.');
    }
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } finally {
      localStorage.removeItem('admin_token');
      setUser(null);
    }
  };

  const isAuthenticated = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, verifySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
