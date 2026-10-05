import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = 'https://public-five-psi-47.vercel.app';

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('STARTING COMPREHENSIVE SECURITY AUDIT ON PRODUCTION');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });

  // ─────────────────────────────────────────────────────────
  // PART 1: UNAUTHENTICATED INCOGNITO TESTS
  // ─────────────────────────────────────────────────────────
  console.log('--- PART 1: UNAUTHENTICATED INCOGNITO TESTS ---');
  const incognitoContext = await browser.newContext();
  const incognitoPage = await incognitoContext.newPage();

  // Test 1.1: Direct navigation to /admin
  await incognitoPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  const isLoginForm1 = await incognitoPage.locator('form, input[type="password"]').count() > 0;
  const isDashboard1 = await incognitoPage.locator('.admin-dashboard, .admin-sidebar, .admin-topbar').count() > 0;
  console.log(`1.1 GET /admin (Unauthenticated UI): ${isLoginForm1 && !isDashboard1 ? 'PASS (Renders Login Form Only, No Dashboard)' : 'FAIL'}`);

  // Test 1.2: Direct navigation to /admin/projects, /admin/messages, /admin/education, etc.
  const adminSubroutes = ['/admin/projects', '/admin/messages', '/admin/education', '/admin/experience', '/admin/resume'];
  for (const sub of adminSubroutes) {
    await incognitoPage.goto(`${BASE_URL}${sub}`, { waitUntil: 'networkidle' });
    const isLogin = await incognitoPage.locator('form, input[type="password"]').count() > 0;
    const isDash = await incognitoPage.locator('.admin-dashboard, .admin-sidebar').count() > 0;
    console.log(`1.2 Direct GET ${sub}: ${isLogin && !isDash ? 'PASS (Guarded - Shows Login)' : 'FAIL'}`);
  }

  // Test 1.3: Unauthenticated API endpoints
  const apiTests = [
    { method: 'GET', path: '/api/admin/me' },
    { method: 'GET', path: '/api/admin/projects' },
    { method: 'GET', path: '/api/admin/messages' },
    { method: 'GET', path: '/api/admin/education' },
    { method: 'GET', path: '/api/admin/resumes' },
    { method: 'GET', path: '/api/admin/experience' },
    { method: 'GET', path: '/api/admin/skills' },
    { method: 'GET', path: '/api/admin/achievements' },
    { method: 'GET', path: '/api/admin/certifications' },
    { method: 'GET', path: '/api/admin/media' },
    { method: 'GET', path: '/api/admin/sections' },
    { method: 'GET', path: '/api/admin/site-settings' },
    { method: 'GET', path: '/api/admin/hero-settings' },
    { method: 'GET', path: '/api/admin/about' },
    { method: 'POST', path: '/api/admin/projects', data: { title: 'Hack' } },
    { method: 'PUT', path: '/api/admin/site-settings', data: { name: 'Hack' } },
    { method: 'DELETE', path: '/api/admin/projects/99999' },
    { method: 'DELETE', path: '/api/admin/messages/99999' },
    { method: 'DELETE', path: '/api/admin/media/99999' },
    { method: 'POST', path: '/api/admin/media/upload' }
  ];

  console.log('\n--- Checking Unauthenticated Admin API Endpoints ---');
  for (const t of apiTests) {
    let res;
    if (t.method === 'GET') {
      res = await incognitoContext.request.get(`${BASE_URL}${t.path}`);
    } else if (t.method === 'POST') {
      res = await incognitoContext.request.post(`${BASE_URL}${t.path}`, { data: t.data || {} });
    } else if (t.method === 'PUT') {
      res = await incognitoContext.request.put(`${BASE_URL}${t.path}`, { data: t.data || {} });
    } else if (t.method === 'DELETE') {
      res = await incognitoContext.request.delete(`${BASE_URL}${t.path}`);
    }
    const status = res.status();
    let body = {};
    try { body = await res.json(); } catch {}
    const is401 = status === 401 && body.success === false;
    console.log(`API ${t.method} ${t.path} -> HTTP ${status} (Auth required: ${is401 ? 'PASS' : 'FAIL'})`);
  }

  // ─────────────────────────────────────────────────────────
  // PART 2: AUTHENTICATED ADMIN FLOW & SESSION PERSISTENCE
  console.log('\n--- PART 2: AUTHENTICATED ADMIN LOGIN & SESSION ---');
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.log('2.1 Admin Sign In: SKIPPED (TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set in environment)');
    await browser.close();
    return;
  }

  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();

  await authPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });

  // Fill credentials and log in
  await authPage.locator('#admin-username').fill(adminUsername);
  await authPage.locator('#admin-password').fill(adminPassword);
  await authPage.locator('button[type="submit"]').click();

  // Wait for dashboard to mount
  await authPage.waitForSelector('.admin-sidebar', { timeout: 10000 });
  const isDashboardLoggedIn = await authPage.locator('.admin-sidebar').isVisible();
  console.log(`2.1 Admin Sign In: ${isDashboardLoggedIn ? 'PASS (Dashboard Mounted)' : 'FAIL'}`);

  // Test 2.2: Verify Authenticated API requests in logged in session
  const authMeRes = await authPage.evaluate(async () => {
    const r = await fetch('/api/admin/auth/me', { credentials: 'include' });
    return { status: r.status, data: await r.json() };
  });
  console.log(`2.2 Auth Check /api/admin/auth/me -> HTTP ${authMeRes.status} (User: ${authMeRes.data?.user?.username})`);

  const authProjectsRes = await authPage.evaluate(async () => {
    const r = await fetch('/api/admin/projects', { credentials: 'include' });
    return { status: r.status, data: await r.json() };
  });
  console.log(`2.3 Authenticated GET /api/admin/projects -> HTTP ${authProjectsRes.status} (${Array.isArray(authProjectsRes.data) ? authProjectsRes.data.length + ' projects' : 'error'})`);

  // Test 2.3: Reload page -> check session persistence
  await authPage.reload({ waitUntil: 'networkidle' });
  const isDashboardAfterReload = await authPage.locator('.admin-sidebar').isVisible();
  console.log(`2.4 Session Persistence on Reload: ${isDashboardAfterReload ? 'PASS (Remains Logged In)' : 'FAIL'}`);

  // Test 2.4: Logout
  const logoutBtn = authPage.locator('.admin-logout-btn');
  await logoutBtn.click();
  await authPage.waitForTimeout(1000);

  const isLoginFormAfterLogout = await authPage.locator('form, input[type="password"]').count() > 0;
  const isDashboardAfterLogout = await authPage.locator('.admin-sidebar').count() > 0;
  console.log(`2.5 Admin Logout: ${isLoginFormAfterLogout && !isDashboardAfterLogout ? 'PASS (Session Destroyed, Returned to Login)' : 'FAIL'}`);

  // Test 2.5: API access after logout in same context
  const afterLogoutMeRes = await authPage.evaluate(async () => {
    const r = await fetch('/api/admin/auth/me', { credentials: 'include' });
    return { status: r.status, data: await r.json() };
  });
  console.log(`2.6 API after logout /api/admin/auth/me -> HTTP ${afterLogoutMeRes.status} (Unauthorized: ${afterLogoutMeRes.status === 401 ? 'PASS' : 'FAIL'})`);

  // ─────────────────────────────────────────────────────────
  // PART 3: PUBLIC WEBSITE FUNCTIONALITY CHECK
  // ─────────────────────────────────────────────────────────
  console.log('\n--- PART 3: PUBLIC WEBSITE HEALTH CHECK ---');
  const publicPage = await browser.newPage();
  await publicPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const isHeroVisible = await publicPage.locator('.hero').isVisible();
  const isPublicDataWorking = await publicPage.evaluate(async () => {
    const r = await fetch('/api/public/data');
    return r.status === 200;
  });
  console.log(`3.1 Public portfolio loads: ${isHeroVisible ? 'PASS' : 'FAIL'}`);
  console.log(`3.2 Public API accessible without login: ${isPublicDataWorking ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n====================================================');
  console.log('SECURITY AUDIT COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runSecurityAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
