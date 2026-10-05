/**
 * Privacy-Conscious Portfolio Analytics Tracker
 * 
 * Guarantees:
 * 1. Strictly excludes admin sessions (both client-side and server-side).
 * 2. Uses anonymous randomly-generated UUIDs stored in localStorage/sessionStorage.
 * 3. Never captures PII (no names, emails, IPs, or form content).
 * 4. Non-blocking: Uses navigator.sendBeacon or background fetch with keepalive.
 * 5. Does not cause React re-renders or interfere with hero animations.
 */

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId() {
  if (typeof window === 'undefined') return '';
  try {
    let vid = localStorage.getItem('ap_vid');
    if (!vid) {
      vid = generateUUID();
      localStorage.setItem('ap_vid', vid);
    }
    return vid;
  } catch {
    return generateUUID();
  }
}

export function getSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('ap_sid');
    if (!sid) {
      sid = generateUUID();
      sessionStorage.setItem('ap_sid', sid);
    }
    return sid;
  } catch {
    return generateUUID();
  }
}

export function getInitialReferrer() {
  if (typeof window === 'undefined') return '';
  try {
    let ref = sessionStorage.getItem('ap_ref');
    if (ref === null) {
      ref = document.referrer || '';
      // If external referrer, save it for this session
      sessionStorage.setItem('ap_ref', ref);
    }
    return ref;
  } catch {
    return document.referrer || '';
  }
}

export function getDeviceType() {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'tablet';
  }
  if (/Mobi|Android|iPhone/i.test(ua) || width < 768) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Checks if the current visitor is an authenticated admin.
 * Admin sessions must NEVER be recorded in portfolio visitor statistics.
 */
export function isAdminVisitor() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.pathname.startsWith('/admin')) return true;
    const token = localStorage.getItem('admin_token');
    if (token) return true;
    if (document.cookie && document.cookie.includes('admin_token')) return true;
  } catch {}
  return false;
}

/**
 * Track an analytics event asynchronously without blocking UI or animations
 */
export function trackEvent(eventType, metadata = {}) {
  if (typeof window === 'undefined') return;

  // 1. Strict Admin Exclusion Check
  if (isAdminVisitor()) {
    // Admin visits/clicks are strictly excluded from public metrics
    return;
  }

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const referrer = getInitialReferrer();
  const deviceType = getDeviceType();

  const payload = {
    eventType,
    visitorId,
    sessionId,
    pagePath: window.location.pathname || '/',
    projectId: metadata.projectId || metadata.project_id || null,
    projectSlug: metadata.projectSlug || metadata.project_slug || '',
    projectTitle: metadata.projectTitle || metadata.project_title || '',
    referrer,
    deviceType,
    metadata: {
      ...metadata,
      screen_width: window.innerWidth,
    },
  };

  const endpoint = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api/analytics/event'
    : '/api/analytics/event';

  const jsonString = JSON.stringify(payload);

  // Use sendBeacon if supported for zero performance impact
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
    } catch {}
  }

  // Fallback to fetch with keepalive
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString,
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      // Analytics errors fail silently to ensure user experience is never impacted
    });
  } catch {}
}
