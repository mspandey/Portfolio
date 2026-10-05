import { chromium } from 'playwright';

async function testIncognitoAdmin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(); // clean incognito context
  const page = await context.newPage();

  console.log('Testing /admin in fresh incognito context...');
  await page.goto('https://public-five-psi-47.vercel.app/admin', { waitUntil: 'networkidle' });

  const url = page.url();
  console.log('Final Page URL:', url);

  const isLoginFormVisible = await page.locator('form, input[type="password"], input[name="username"], button[type="submit"]').count() > 0;
  const isDashboardVisible = await page.locator('.admin-dashboard, .admin-sidebar, .admin-header').count() > 0;
  const bodyText = await page.locator('body').innerText();

  console.log('Is Login Form Visible:', isLoginFormVisible);
  console.log('Is Dashboard Visible:', isDashboardVisible);
  console.log('First 200 chars of body:', bodyText.slice(0, 200));

  // Test Direct Admin API calls unauthenticated
  const apiMe = await context.request.get('https://public-five-psi-47.vercel.app/api/admin/me');
  console.log('GET /api/admin/me Status:', apiMe.status(), await apiMe.text());

  const apiProjects = await context.request.get('https://public-five-psi-47.vercel.app/api/admin/projects');
  console.log('GET /api/admin/projects Status:', apiProjects.status(), await apiProjects.text());

  const apiMessages = await context.request.get('https://public-five-psi-47.vercel.app/api/admin/messages');
  console.log('GET /api/admin/messages Status:', apiMessages.status(), await apiMessages.text());

  await browser.close();
}

testIncognitoAdmin();
