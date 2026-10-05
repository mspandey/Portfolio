import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database & tables
try {
  initDatabase();
} catch (err) {
  console.warn('Database initialization note:', err.message);
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Static Uploads Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', publicRoutes); // handles /api/resumes/active, /api/contact

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
});

// Strict JSON 404 for any unmatched /api route (ensures HTML is NEVER returned for API requests)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl || req.path}` });
});

// Serve frontend dist in production (for standalone node server)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (req.accepts('html') && fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  });
}

// Global Error Handler (strict JSON response)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
