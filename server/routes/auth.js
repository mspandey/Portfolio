import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import db from '../database.js';
import { JWT_SECRET, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

let cloudAdminCache = null;
let lastCloudAdminFetch = 0;
const AUTH_CACHE_TTL = 5000; // 5 seconds cache

/**
 * Retrieve admin users from Supabase Storage (authoritative serverless cloud backing store)
 */
async function getCloudAdminUsers() {
  const now = Date.now();
  if (cloudAdminCache && (now - lastCloudAdminFetch < AUTH_CACHE_TTL)) {
    return cloudAdminCache;
  }

  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase.storage
      .from('server-auth')
      .download('admin_users.json');

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cloudAdminCache = parsed;
        lastCloudAdminFetch = now;
        return cloudAdminCache;
      }
    }
  } catch (storageErr) {
    // Bucket or file not yet created
  }

  // If server-auth file does not exist in Supabase Storage, try seeding from SQLite if available
  if (db) {
    try {
      const sqliteUsers = db.prepare('SELECT id, username, password_hash, created_at, updated_at FROM admin_users').all();
      if (sqliteUsers && sqliteUsers.length > 0) {
        const adminUsersData = sqliteUsers.map((u) => ({
          id: String(u.id),
          username: u.username.toLowerCase(),
          display_username: u.username,
          password_hash: u.password_hash,
          role: 'admin',
          is_active: true,
          created_at: u.created_at,
          updated_at: u.updated_at || u.created_at,
        }));
        await supabase.storage.createBucket('server-auth', { public: false }).catch(() => {});
        await supabase.storage.from('server-auth').upload('admin_users.json', Buffer.from(JSON.stringify(adminUsersData, null, 2)), {
          contentType: 'application/json',
          upsert: true,
        }).catch(() => {});
        cloudAdminCache = adminUsersData;
        lastCloudAdminFetch = now;
        return cloudAdminCache;
      }
    } catch (dbErr) {
      // ignore
    }
  }

  return [];
}

/**
 * Robust Admin Verification
 * Checks Supabase PostgreSQL table, Supabase Cloud Storage (server-auth),
 * environment variables, and local SQLite fallback.
 */
async function verifyAdminCredentials(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) return null;

  // 1. Check Supabase admin_users table (PostgreSQL) if configured
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
          return { id: String(data.id), username: data.username, role: data.role || 'admin' };
        }
      }
    } catch (supaErr) {
      // Table may not exist in schema cache; continue to cloud storage check
    }

    // 2. Check Supabase Persistent Cloud Storage (server-auth/admin_users.json)
    try {
      const cloudUsers = await getCloudAdminUsers();
      if (Array.isArray(cloudUsers)) {
        const matched = cloudUsers.find(
          (u) => (u.username || '').toLowerCase() === cleanUser && u.is_active !== false
        );

        if (matched && matched.password_hash) {
          const isValid = bcrypt.compareSync(cleanPass, matched.password_hash);
          if (isValid) {
            return {
              id: String(matched.id),
              username: matched.display_username || matched.username,
              role: matched.role || 'admin',
            };
          }
        }
      }
    } catch (storageErr) {
      console.warn('Supabase storage auth query note:', storageErr.message);
    }
  }

  // 3. Check Server Environment Variables (Supports plaintext and bcrypt hash)
  const envUsers = [
    (process.env.ADMIN_USERNAME || '').trim().toLowerCase(),
    (process.env.TEST_ADMIN_EMAIL || '').trim().toLowerCase(),
  ].filter(Boolean);

  const envPass = (process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || '').trim();

  if (envPass && envUsers.includes(cleanUser)) {
    let isValid = false;
    if (envPass.startsWith('$2a$') || envPass.startsWith('$2b$') || envPass.startsWith('$2y$')) {
      isValid = bcrypt.compareSync(cleanPass, envPass);
    } else {
      isValid = (cleanPass === envPass);
    }

    if (isValid) {
      return {
        id: 'admin-env',
        username: process.env.ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL || cleanUser,
        role: 'admin',
      };
    }
  }

  // 4. Check SQLite database if available (Local development fallback)
  if (db) {
    try {
      const user = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)').get(cleanUser);
      if (user && user.password_hash) {
        const isValid = bcrypt.compareSync(cleanPass, user.password_hash);
        if (isValid) {
          return { id: String(user.id), username: user.username, role: user.role || 'admin' };
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

    // Safe diagnostic log (never logs passwords or secrets)
    console.log('AUTH LOGIN:', {
      username_received: Boolean(username),
      password_received: Boolean(password),
      admin_record_found: Boolean(verifiedUser),
      session_created: Boolean(verifiedUser && verifiedUser.role === 'admin'),
      cookie_sent: Boolean(verifiedUser && verifiedUser.role === 'admin'),
    });

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
      secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
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

// GET /api/admin/auth/me, /api/admin/me, /api/admin/session, /api/admin/auth/session
router.get(['/me', '/auth/me', '/session', '/auth/session'], authenticateAdmin, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
    },
  });
});

// POST /api/admin/auth/logout, /api/admin/logout
router.post(['/logout', '/auth/logout'], (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
