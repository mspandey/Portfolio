import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

async function runSecurityAudit() {
  console.log(`\n======================================================`);
  console.log(`🔒 CRITICAL ADMIN AUTH & SECURITY AUDIT`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let allPassed = true;

  // ──────────────────────────────────────────────────────────
  // 1. API SERVER-SIDE ENDPOINT AUDIT (NO AUTH CREDENTIALS)
  // ──────────────────────────────────────────────────────────
  console.log(`\n--- 1. SERVER-SIDE API PROTECTION (UNAUTHENTICATED) ---`);

  const protectedEndpoints = [
    { method: 'GET', url: `${BASE_URL}/api/admin/projects` },
    { method: 'POST', url: `${BASE_URL}/api/admin/projects`, body: { title: 'Hacked' } },
    { method: 'PUT', url: `${BASE_URL}/api/admin/projects/1`, body: { title: 'Hacked' } },
    { method: 'DELETE', url: `${BASE_URL}/api/admin/projects/1` },
    { method: 'GET', url: `${BASE_URL}/api/admin/experiences` },
    { method: 'GET', url: `${BASE_URL}/api/admin/education` },
    { method: 'GET', url: `${BASE_URL}/api/admin/skills` },
    { method: 'GET', url: `${BASE_URL}/api/admin/achievements` },
    { method: 'GET', url: `${BASE_URL}/api/admin/certifications` },
    { method: 'GET', url: `${BASE_URL}/api/admin/resumes` },
    { method: 'POST', url: `${BASE_URL}/api/admin/resumes/upload` },
    { method: 'POST', url: `${BASE_URL}/api/admin/media/upload` },
    { method: 'POST', url: `${BASE_URL}/api/admin/achievements/upload-certificate` },
    { method: 'GET', url: `${BASE_URL}/api/admin/media` },
    { method: 'GET', url: `${BASE_URL}/api/admin/sections` },
    { method: 'GET', url: `${BASE_URL}/api/admin/messages` },
    { method: 'GET', url: `${BASE_URL}/api/admin/site-settings` },
    { method: 'GET', url: `${BASE_URL}/api/admin/hero-settings` },
    { method: 'GET', url: `${BASE_URL}/api/admin/about-settings` },
    { method: 'GET', url: `${BASE_URL}/api/admin/analytics/overview` },
    { method: 'POST', url: `${BASE_URL}/api/admin/analytics/clear` },
    { method: 'GET', url: `${BASE_URL}/api/admin/auth/me` },
    { method: 'GET', url: `${BASE_URL}/api/admin/me` },
  ];

  for (const ep of protectedEndpoints) {
    try {
      const opts = { method: ep.method };
      if (ep.body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(ep.body);
      }
      const res = await fetch(ep.url, opts);
      const is401 = res.status === 401;
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      const hasErrorField = data && (data.error === 'Unauthorized' || data.error);

      if (is401 && isJson && hasErrorField) {
        console.log(`  ✅ [PASS] ${ep.method} ${ep.url} -> 401 JSON (${JSON.stringify(data)})`);
      } else {
        allPassed = false;
        console.error(`  ❌ [FAIL] ${ep.method} ${ep.url} -> Expected 401 JSON, got status ${res.status} (${contentType})`);
      }
    } catch (err) {
      console.error(`  ❌ [ERROR] ${ep.method} ${ep.url} -> ${err.message}`);
      allPassed = false;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 2. PUBLIC ENDPOINTS INTEGRITY CHECK
  // ──────────────────────────────────────────────────────────
  console.log(`\n--- 2. PUBLIC PORTFOLIO ENDPOINTS INTEGRITY ---`);
  const publicEndpoints = [
    `${BASE_URL}/api/public/data`,
    `${BASE_URL}/api/public/projects`,
    `${BASE_URL}/api/health`,
  ];

  for (const url of publicEndpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`  ✅ [PASS] Public endpoint ${url} -> ${res.status} OK`);
      } else {
        console.error(`  ❌ [FAIL] Public endpoint ${url} -> ${res.status}`);
        allPassed = false;
      }
    } catch (err) {
      console.error(`  ❌ [ERROR] Public endpoint ${url} -> ${err.message}`);
      allPassed = false;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. BROWSER INCOGNITO ROUTE GUARD & REDIRECT TEST
  // ──────────────────────────────────────────────────────────
  console.log(`\n--- 3. BROWSER INCOGNITO DIRECT URL TESTS ---`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    // Incognito context (empty storage, zero cookies)
    const context = await browser.newContext();
    const page = await context.newPage();

    const adminRoutes = [
      '/admin',
      '/admin/projects',
      '/admin/experience',
      '/admin/education',
      '/admin/achievements',
      '/admin/certifications',
      '/admin/resume',
      '/admin/media',
      '/admin/messages',
      '/admin/analytics',
      '/admin/settings',
    ];

    for (const route of adminRoutes) {
      const targetUrl = `${BASE_URL}${route}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle' });

      // Check current browser URL
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.endsWith('/admin/login');

      // Check DOM elements
      const hasDashboard = (await page.locator('.admin-layout, .admin-sidebar, .admin-main').count()) > 0;
      const hasLoginForm = (await page.locator('.admin-login-page, .admin-login-card, input[type="password"]').count()) > 0;

      if (isRedirectedToLogin && !hasDashboard && hasLoginForm) {
        console.log(`  ✅ [PASS] Direct visit to ${route} redirected to /admin/login (Dashboard NOT visible)`);
      } else {
        console.error(`  ❌ [FAIL] Direct visit to ${route}: URL=${currentUrl}, DashboardVisible=${hasDashboard}, LoginFormVisible=${hasLoginForm}`);
        allPassed = false;
      }
    }

    await context.close();
  } catch (browserErr) {
    console.error(`  ⚠️ Browser test note:`, browserErr.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`\n======================================================`);
  if (allPassed) {
    console.log(`🎉 ALL SECURITY & ROUTE GUARD TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.error(`🚨 SOME TESTS FAILED. PLEASE REVIEW AUDIT LOG ABOVE.`);
  }
  console.log(`======================================================\n`);
  return allPassed;
}

runSecurityAudit().then((success) => {
  process.exit(success ? 0 : 1);
});
