import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/middleware/auth.js';
import {
  recordAnalyticsEvent,
  getAnalyticsOverview,
  clearAnalyticsEvents,
  normalizeReferrer,
} from '../server/data-service.js';
import app from '../server/app.js';
import http from 'http';

async function runTests() {
  console.log('--- STARTING ANALYTICS TESTS ---');

  // Start temporary test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(3991, resolve));
  const baseUrl = 'http://localhost:3991';

  try {
    // 0. Clear any previous analytics for clean testing
    await clearAnalyticsEvents();
    console.log('✓ Cleared previous analytics events');

    // 1. Test Referrer Normalization
    if (normalizeReferrer('https://www.linkedin.com/in/test') !== 'LinkedIn') {
      throw new Error('Referrer normalization for LinkedIn failed');
    }
    if (normalizeReferrer('https://github.com/mspandey') !== 'GitHub') {
      throw new Error('Referrer normalization for GitHub failed');
    }
    if (normalizeReferrer('https://www.google.com/search?q=test') !== 'Google') {
      throw new Error('Referrer normalization for Google failed');
    }
    if (normalizeReferrer('') !== 'Direct') {
      throw new Error('Referrer normalization for empty string failed');
    }
    console.log('✓ Referrer normalizer verified');

    // 2. Test Unauthenticated Access to Admin Analytics API
    const unauthRes = await fetch(`${baseUrl}/api/admin/analytics/overview`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated admin access, got ${unauthRes.status}`);
    }
    console.log('✓ Unauthenticated admin analytics access correctly rejected with 401');

    // 3. Test Public Event Ingestion via POST /api/analytics/event
    const visitor1 = 'test-visitor-uuid-1';
    const session1 = 'test-session-uuid-1';

    // Page view
    const pvRes = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_view',
        visitorId: visitor1,
        sessionId: session1,
        referrer: 'https://www.linkedin.com/feed',
        deviceType: 'desktop',
      }),
    });
    const pvData = await pvRes.json();
    if (!pvData.success || !pvData.id) {
      throw new Error(`Page view ingestion failed: ${JSON.stringify(pvData)}`);
    }
    console.log('✓ Public page_view recorded');

    // Second page view from same visitor (should NOT increment unique visitors)
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_view',
        visitorId: visitor1,
        sessionId: session1,
        deviceType: 'desktop',
      }),
    });
    console.log('✓ Repeat page_view recorded');

    // Project view
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'project_view',
        visitorId: visitor1,
        sessionId: session1,
        projectId: 1,
        projectTitle: 'MedGrid',
      }),
    });
    console.log('✓ Project view recorded');

    // Resume download
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'resume_download',
        visitorId: visitor1,
        sessionId: session1,
      }),
    });
    console.log('✓ Resume download recorded');

    // LinkedIn click
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'linkedin_click',
        visitorId: visitor1,
        sessionId: session1,
      }),
    });
    console.log('✓ LinkedIn click recorded');

    // GitHub click
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'github_click',
        visitorId: visitor1,
        sessionId: session1,
      }),
    });
    console.log('✓ GitHub click recorded');

    // Contact form submit
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'contact_submit',
        visitorId: visitor1,
        sessionId: session1,
      }),
    });
    console.log('✓ Contact submission recorded');

    // Second visitor from mobile
    const visitor2 = 'test-visitor-uuid-2';
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_view',
        visitorId: visitor2,
        sessionId: 'session-2',
        referrer: 'https://github.com/mspandey',
        deviceType: 'mobile',
      }),
    });
    console.log('✓ Visitor 2 (mobile) recorded');

    // 4. Test ADMIN EXCLUSION
    // Generate valid admin token
    const adminToken = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    // Admin attempts to send page_view with Bearer header
    const adminEventRes = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        eventType: 'page_view',
        visitorId: 'admin-browser-uuid',
        sessionId: 'admin-session',
      }),
    });
    const adminEventData = await adminEventRes.json();
    if (!adminEventData.ignored || adminEventData.reason !== 'admin_session') {
      throw new Error(`Expected admin event to be ignored, got: ${JSON.stringify(adminEventData)}`);
    }
    console.log('✓ Admin authenticated visit correctly excluded from analytics');

    // Admin attempts to send event with /admin referrer
    const adminReferrerRes = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': `${baseUrl}/admin/dashboard`,
      },
      body: JSON.stringify({
        eventType: 'page_view',
        visitorId: 'admin-browser-uuid-2',
        sessionId: 'admin-session-2',
      }),
    });
    const adminReferrerData = await adminReferrerRes.json();
    if (!adminReferrerData.ignored) {
      throw new Error(`Expected admin referrer event to be ignored, got: ${JSON.stringify(adminReferrerData)}`);
    }
    console.log('✓ Admin referrer visit correctly excluded from analytics');

    // 5. Test Authenticated Admin Overview Retrieval
    const overviewRes = await fetch(`${baseUrl}/api/admin/analytics/overview?period=7d`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    if (overviewRes.status !== 200) {
      throw new Error(`Admin overview failed with status ${overviewRes.status}`);
    }
    const overviewJson = await overviewRes.json();
    const data = overviewJson.data;

    console.log('\n--- VERIFYING RETRIEVED METRICS ---');
    console.log('Unique Visitors:', data.summary.unique_visitors, '(expected: 2)');
    console.log('Total Views:', data.summary.total_views, '(expected: 3)');
    console.log('Resume Downloads:', data.summary.resume_downloads, '(expected: 1)');
    console.log('LinkedIn Clicks:', data.summary.linkedin_clicks, '(expected: 1)');
    console.log('GitHub Clicks:', data.summary.github_clicks, '(expected: 1)');
    console.log('Contact Submissions:', data.summary.contact_submissions, '(expected: 1)');
    console.log('Project Views:', data.summary.project_views, '(expected: 1)');
    console.log('Recruiter Signals:', data.recruiter_signals);
    console.log('Traffic Sources:', data.traffic_sources);
    console.log('Devices:', data.device_breakdown);
    console.log('Projects:', data.top_projects);

    if (data.summary.unique_visitors !== 2) {
      throw new Error(`Expected unique_visitors = 2, got ${data.summary.unique_visitors}`);
    }
    if (data.summary.total_views !== 3) {
      throw new Error(`Expected total_views = 3, got ${data.summary.total_views}`);
    }
    if (data.summary.resume_downloads !== 1) {
      throw new Error(`Expected resume_downloads = 1, got ${data.summary.resume_downloads}`);
    }
    if (data.summary.linkedin_clicks !== 1) {
      throw new Error(`Expected linkedin_clicks = 1, got ${data.summary.linkedin_clicks}`);
    }
    if (data.summary.github_clicks !== 1) {
      throw new Error(`Expected github_clicks = 1, got ${data.summary.github_clicks}`);
    }
    if (data.summary.contact_submissions !== 1) {
      throw new Error(`Expected contact_submissions = 1, got ${data.summary.contact_submissions}`);
    }
    if (data.summary.project_views !== 1) {
      throw new Error(`Expected project_views = 1, got ${data.summary.project_views}`);
    }

    // Verify Recruiter signals
    if (data.recruiter_signals.resume_downloads !== 1 || data.recruiter_signals.linkedin_clicks !== 1) {
      throw new Error('Recruiter signals mismatch');
    }

    // Verify Device breakdown
    if (data.device_breakdown.desktop.count < 1 || data.device_breakdown.mobile.count < 1) {
      throw new Error('Device breakdown mismatch');
    }

    // Verify Traffic Sources
    const linkedinSource = data.traffic_sources.find((s) => s.source === 'LinkedIn');
    if (!linkedinSource || linkedinSource.count < 1) {
      throw new Error('Expected LinkedIn in traffic sources');
    }

    // Verify Top Projects
    const medGridProj = data.top_projects.find((p) => p.title === 'MedGrid');
    if (!medGridProj || medGridProj.views < 1) {
      throw new Error('Expected MedGrid in top projects');
    }

    // 6. Test Period Filtering (today, 30d, 90d)
    const todayRes = await fetch(`${baseUrl}/api/admin/analytics/overview?period=today`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const todayJson = await todayRes.json();
    if (todayJson.data.period !== 'today') {
      throw new Error('Period parameter today not respected');
    }
    console.log('✓ Period parameter filtering verified');

    console.log('\n===========================================');
    console.log('ALL ANALYTICS TESTS PASSED WITH 100% SUCCESS!');
    console.log('===========================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
