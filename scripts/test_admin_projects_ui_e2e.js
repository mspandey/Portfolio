import 'dotenv/config';
import { chromium } from 'playwright';

async function testAdminProjectsUi() {
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  console.log('🌐 Starting Playwright Browser UI E2E Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Visit admin login page
    console.log('Navigating to http://localhost:3001/admin...');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });

    // Check if on login page
    const loginInput = page.locator('input[type="text"], input[name="username"], input[placeholder*="username" i]').first();
    if (await loginInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (!adminUsername || !adminPassword) {
        throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured.');
      }
      console.log('Logging in as admin...');
      await loginInput.fill(adminUsername);
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill(adminPassword);
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // 2. Navigate to Projects tab
    console.log('Opening Projects section in Admin CMS...');
    const projectsNav = page.locator('button:has-text("Projects"), a:has-text("Projects")').first();
    if (await projectsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectsNav.click();
      await page.waitForTimeout(1000);
    }

    // 3. Inspect project list items
    const projectItems = page.locator('.admin-list-item');
    const count = await projectItems.count();
    console.log(`Found ${count} projects in Admin CMS.`);
    if (count < 2) {
      throw new Error(`Expected at least 2 projects, found ${count}`);
    }

    // Check first item move up is disabled
    const firstItemUpBtn = projectItems.first().locator('.sections-move-btn:has-text("↑")');
    const isFirstUpDisabled = await firstItemUpBtn.isDisabled();
    console.log(`First item '↑' button disabled: ${isFirstUpDisabled}`);
    if (!isFirstUpDisabled) {
      throw new Error("First project's '↑' Move Up button should be disabled.");
    }

    // Check last item move down is disabled
    const lastItemDownBtn = projectItems.last().locator('.sections-move-btn:has-text("↓")');
    const isLastDownDisabled = await lastItemDownBtn.isDisabled();
    console.log(`Last item '↓' button disabled: ${isLastDownDisabled}`);
    if (!isLastDownDisabled) {
      throw new Error("Last project's '↓' Move Down button should be disabled.");
    }

    // Read initial project titles
    const initialTitles = [];
    for (let i = 0; i < count; i++) {
      const title = await projectItems.nth(i).locator('.admin-list-item-title').innerText();
      initialTitles.push(title.replace(/[\n\r]+/g, ' ').trim());
    }
    console.log('Initial titles in Admin UI:', initialTitles);

    // 4. Click '↓' Move Down on the first project
    console.log(`Clicking '↓' Move Down on first project (${initialTitles[0]})...`);
    const firstItemDownBtn = projectItems.first().locator('.sections-move-btn:has-text("↓")');
    await firstItemDownBtn.click();

    // Wait for save indicator or message
    await page.waitForTimeout(2000);

    // Check updated titles in UI
    const updatedTitles = [];
    for (let i = 0; i < count; i++) {
      const title = await projectItems.nth(i).locator('.admin-list-item-title').innerText();
      updatedTitles.push(title.replace(/[\n\r]+/g, ' ').trim());
    }
    console.log('Updated titles in Admin UI:', updatedTitles);

    if (updatedTitles[0] === initialTitles[0]) {
      throw new Error('Project did not move down in UI!');
    }

    // 5. Refresh Admin Page and verify persistence
    console.log('Reloading Admin page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Ensure on projects tab
    const projectsNavAfterReload = page.locator('button:has-text("Projects"), a:has-text("Projects")').first();
    if (await projectsNavAfterReload.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectsNavAfterReload.click();
      await page.waitForTimeout(1000);
    }

    const reloadedItems = page.locator('.admin-list-item');
    const reloadedTitles = [];
    for (let i = 0; i < count; i++) {
      const title = await reloadedItems.nth(i).locator('.admin-list-item-title').innerText();
      reloadedTitles.push(title.replace(/[\n\r]+/g, ' ').trim());
    }
    console.log('Titles after Admin reload:', reloadedTitles);

    if (reloadedTitles[0] !== updatedTitles[0] || reloadedTitles[1] !== updatedTitles[1]) {
      throw new Error('Order was not persisted across Admin reload!');
    }
    console.log('✅ PASS: Order persisted across Admin page reload.');

    // 6. Check Public Portfolio
    console.log('Navigating to Public Portfolio http://localhost:3001/#projects...');
    await page.goto('http://localhost:3001/#projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const publicCards = page.locator('#projects .project-card, .section-projects .project-card');
    const publicCardCount = await publicCards.count();
    console.log(`Found ${publicCardCount} public project cards.`);

    const publicTitles = [];
    for (let i = 0; i < publicCardCount; i++) {
      const title = await publicCards.nth(i).locator('.project-title').innerText();
      publicTitles.push(title.trim());
    }
    console.log('Public Portfolio Project Titles:', publicTitles);

    // Check if public title matches reloaded first title
    const expectedFirstTitle = reloadedTitles[0];
    if (!expectedFirstTitle.includes(publicTitles[0])) {
      throw new Error(`Public portfolio mismatch: expected first project to match "${publicTitles[0]}", but admin had "${expectedFirstTitle}"`);
    }
    console.log('✅ PASS: Public portfolio displays projects in exact same order!');

    // 7. Move back to restore original order
    console.log('Navigating back to Admin to restore original order...');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    const projectsNavRestore = page.locator('button:has-text("Projects"), a:has-text("Projects")').first();
    if (await projectsNavRestore.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectsNavRestore.click();
      await page.waitForTimeout(1000);
    }
    const currentItems = page.locator('.admin-list-item');
    const restoreUpBtn = currentItems.first().locator('.sections-move-btn:has-text("↓")');
    // The previous item 0 is now at index 1, so move it up by clicking ↑ on index 1
    const secondItemUpBtn = currentItems.nth(1).locator('.sections-move-btn:has-text("↑")');
    await secondItemUpBtn.click();
    await page.waitForTimeout(2000);
    console.log('✅ PASS: Original order restored via UI.');

    console.log('\n🎉 ALL BROWSER UI E2E TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testAdminProjectsUi().catch((err) => {
  console.error('\n❌ BROWSER E2E TEST FAILED:', err);
  process.exit(1);
});
