import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './portfolio.css';
import PortfolioApp from './PortfolioApp.jsx';

const isAdmin = window.location.pathname.startsWith('/admin');

async function boot() {
  if (isAdmin) {
    const [
      { AuthProvider },
      { default: AdminRoot }
    ] = await Promise.all([
      import('./contexts/AuthContext.jsx'),
      import('./AdminRoot.jsx'),
    ]);

    createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <AuthProvider>
          <AdminRoot />
        </AuthProvider>
      </React.StrictMode>
    );
  } else {
    createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <PortfolioApp />
      </React.StrictMode>
    );
  }
}

boot();