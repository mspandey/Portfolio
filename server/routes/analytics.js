import express from 'express';
import { authenticateAdmin, isRequestFromAdmin } from '../middleware/auth.js';
import {
  recordAnalyticsEvent,
  getAnalyticsOverview,
  clearAnalyticsEvents,
} from '../data-service.js';

const router = express.Router();

// Country code to readable country name map
const ISO_COUNTRY_MAP = {
  'IN': 'India',
  'US': 'United States',
  'GB': 'United Kingdom',
  'UK': 'United Kingdom',
  'CA': 'Canada',
  'DE': 'Germany',
  'AU': 'Australia',
  'SG': 'Singapore',
  'FR': 'France',
  'NL': 'Netherlands',
  'JP': 'Japan',
  'AE': 'UAE',
  'BR': 'Brazil',
  'ID': 'Indonesia',
  'ES': 'Spain',
  'IT': 'Italy',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'PL': 'Poland',
  'IE': 'Ireland',
  'IL': 'Israel',
};

function resolveCountry(req) {
  const headerCountry = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || req.body?.country_hint;
  if (!headerCountry) return 'Unknown';
  const code = String(headerCountry).trim().toUpperCase();
  return ISO_COUNTRY_MAP[code] || code;
}

// ─────────────────────────────────────────────────────────
// PUBLIC EVENT INGESTION: POST /api/analytics/event
// ─────────────────────────────────────────────────────────
const handleEventIngest = async (req, res) => {
  try {
    // 1. STRICT ADMIN EXCLUSION
    // If request has valid admin credentials or originated from admin dashboard, do NOT count
    if (isRequestFromAdmin(req)) {
      return res.json({ success: true, ignored: true, reason: 'admin_session' });
    }

    const referer = req.headers.referer || req.headers.referrer || '';
    if (referer.includes('/admin')) {
      return res.json({ success: true, ignored: true, reason: 'admin_referrer' });
    }

    const {
      eventType,
      event_type,
      sessionId,
      session_id,
      visitorId,
      visitor_id,
      pagePath,
      page_path,
      projectId,
      project_id,
      projectSlug,
      project_slug,
      projectTitle,
      project_title,
      referrer,
      deviceType,
      device_type,
      metadata,
    } = req.body || {};

    const resolvedType = eventType || event_type;
    const resolvedVisitorId = visitorId || visitor_id;
    const resolvedSessionId = sessionId || session_id || resolvedVisitorId;

    if (!resolvedType || !resolvedVisitorId) {
      return res.status(400).json({ error: 'eventType and visitorId are required.' });
    }

    // Determine country privacy-consciously (country level only, no IP stored)
    const country = resolveCountry(req);

    const saved = await recordAnalyticsEvent({
      eventType: resolvedType,
      sessionId: resolvedSessionId,
      visitorId: resolvedVisitorId,
      pagePath: pagePath || page_path || '/',
      projectId: projectId || project_id || null,
      projectSlug: projectSlug || project_slug || '',
      projectTitle: projectTitle || project_title || '',
      referrer: referrer || referer || '',
      deviceType: deviceType || device_type || 'desktop',
      country,
      metadata: metadata || {},
    });

    return res.json({ success: true, id: saved.id });
  } catch (err) {
    console.error('Analytics event ingestion error:', err);
    return res.status(500).json({ error: 'Failed to record event.' });
  }
};

router.post('/event', handleEventIngest);
router.post('/', handleEventIngest);

// ─────────────────────────────────────────────────────────
// ADMIN ANALYTICS ENDPOINTS (PROTECTED)
// ─────────────────────────────────────────────────────────

// GET /api/admin/analytics/overview (and /api/admin/analytics)
const handleOverview = async (req, res) => {
  try {
    const period = (req.query.period || '7d').toLowerCase();
    const overview = await getAnalyticsOverview(period);
    return res.json({ success: true, data: overview });
  } catch (err) {
    console.error('Error getting analytics overview:', err);
    return res.status(500).json({ error: 'Failed to load analytics overview.' });
  }
};

router.get('/overview', authenticateAdmin, handleOverview);
router.get('/', authenticateAdmin, handleOverview);

// POST /api/admin/analytics/clear (Clear analytics)
router.post('/clear', authenticateAdmin, async (req, res) => {
  try {
    await clearAnalyticsEvents();
    return res.json({ success: true, message: 'Analytics data cleared.' });
  } catch (err) {
    console.error('Error clearing analytics:', err);
    return res.status(500).json({ error: 'Failed to clear analytics.' });
  }
});

export default router;
