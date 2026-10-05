import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import db from '../database.js';
import { JWT_SECRET, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Robust Admin Verification
 * Checks environment variables, Supabase admin_users table, and SQLite fallback.
 */
async function verifyAdminCredentials(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // 1. Check Server Environment Variables (Primary Production Strategy)
  const envUser = (process.env.ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL || '').trim().toLowerCase();
  const envPass = (process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || '').trim();

  if (envUser && envPass && cleanUser === envUser && cleanPass === envPass) {
    return { id: 'admin-env', username: process.env.ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL || cleanUser, role: 'admin' };
  }

  // 2. Check Supabase admin_users table if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .ilike('username', cleanUser)
        .limit(1)
        .maybeSingle();

      if (!error && data && data.password_hash) {
        const isValid = bcrypt.compareSync(cleanPass, data.password_hash);
        if (isValid) {
          return { id: data.id, username: data.username, role: data.role || 'admin' };
        }
      }
    } catch (supaErr) {
      console.warn('Supabase auth query note:', supaErr.message);
    }
  }

  // 3. Check SQLite database if available
  if (db) {
    try {
      const user = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)').get(cleanUser);
      if (user && user.password_hash) {
        const isValid = bcrypt.compareSync(cleanPass, user.password_hash);
        if (isValid) {
          return { id: user.id, username: user.username, role: user.role || 'admin' };
        }
      }
    } catch (dbErr) {
      console.warn('SQLite auth query note:', dbErr.message);
    }
  }

  return null;
}

// POST /api/admin/auth/login and /api/admin/login
router.post(['/login', '/auth/login'], async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Username and password are required.' });
    }

    const verifiedUser = await verifyAdminCredentials(username, password);

    if (!verifiedUser || verifiedUser.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: verifiedUser.id, username: verifiedUser.username, role: verifiedUser.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: verifiedUser.id,
        username: verifiedUser.username,
        role: verifiedUser.role || 'admin',
      },
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Authentication failed.' });
  }
});

// GET /api/admin/auth/me and /api/admin/me
router.get(['/me', '/auth/me'], authenticateAdmin, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
    },
  });
});

// POST /api/admin/auth/logout and /api/admin/logout
router.post(['/logout', '/auth/logout'], (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
