import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAdminAuth, loginAdmin, logoutAdmin } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always verify the authenticated session with the server on boot
    checkAdminAuth()
      .then((res) => {
        if (res && res.user && (res.user.id || res.user.username)) {
          setUser(res.user);
        } else {
          localStorage.removeItem('admin_token');
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await loginAdmin(username, password);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await logoutAdmin();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), loading, login, logout }}>
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
