import 'dotenv/config';
import { chromium } from 'playwright';
import http from 'http';
import app from '../server/app.js';
import { deleteProject } from '../server/data-service.js';

async function runE2ETest() {
  const adminEmail = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured in environment variables.');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('STARTING PROJECT CATEGORY FULL E2E BROWSER TEST');
  console.log('====================================================\n');

  // Start local server on available port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ Test server listening on http://localhost:${port}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let createdProjectId = null;

  try {
    // 1. Log in as admin
    console.log('\n--- Step 1: Admin Login ---');
    await page.goto(`http://localhost:${port}/admin`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.admin-layout', { timeout: 8000 });
    console.log('✓ Successfully logged into Admin');

    // 2. Open Projects Panel
    console.log('\n--- Step 2: Open Projects Panel ---');
    await page.click('button.admin-nav-item:has-text("Projects")');
    await page.waitForSelector('.admin-panel-title:has-text("Projects")', { timeout: 5000 });
    console.log('✓ Projects panel loaded');

    // 3. Click "+ Add Project"
    console.log('\n--- Step 3: Check New Project Defaults ---');
    await page.click('button:has-text("+ Add Project")');
    await page.waitForSelector('.admin-panel-title:has-text("Add Project")', { timeout: 5000 });

    const categorySelect = page.locator('select.form-input');
    const selectedVal = await categorySelect.inputValue();
    console.log('Initial category select value:', JSON.stringify(selectedVal));
    if (selectedVal === '') {
      console.log('✓ PASS: Category defaults to "" (No Category), NOT AI/ML!');
    } else {
      throw new Error(`Category defaulted to "${selectedVal}", expected "" (No Category)`);
    }

    const customInputVisibleInitial = await page.locator('input[placeholder="Enter category name..."]').isVisible();
    console.log('Custom category input visible initially:', customInputVisibleInitial);
    if (!customInputVisibleInitial) {
      console.log('✓ PASS: Custom category input is correctly hidden initially');
    } else {
      throw new Error('Custom category input should be hidden initially');
    }

    // 4. Select "Other" -> Verify custom input appears
    console.log('\n--- Step 4: Select "Other" Option ---');
    await categorySelect.selectOption('Other');
    await page.waitForSelector('input[placeholder="Enter category name..."]', { timeout: 3000 });
    console.log('✓ PASS: Custom category input appeared immediately upon selecting "Other"');

    // 5. Try to save with empty custom category -> Verify validation error
    console.log('\n--- Step 5: Test Validation Error on Empty Custom Category ---');
    await page.fill('input[required]', 'Gesture Scroll E2E Test');
    await page.click('button[type="submit"]:has-text("Save Project")');
    await page.waitForSelector('.form-status--error', { timeout: 3000 });
    const errorText = await page.locator('.form-status--error').textContent();
    console.log('Validation error message:', errorText);
    if (errorText.includes('Please enter a custom category')) {
      console.log('✓ PASS: Validation blocked save and showed "Please enter a custom category."');
    } else {
      throw new Error(`Unexpected error message: ${errorText}`);
    }

    // 6. Enter custom category "Gesture & Interaction" and save
    console.log('\n--- Step 6: Enter Custom Category and Save ---');
    await page.fill('input[placeholder="Enter category name..."]', 'Gesture & Interaction');
    await page.click('button[type="submit"]:has-text("Save Project")');
    await page.waitForSelector('.form-status--success:has-text("Project created")', { timeout: 8000 });
    console.log('✓ PASS: Project successfully created with custom category');

    // Verify it shows in list
    const createdItem = page.locator('.admin-list-item:has-text("Gesture Scroll E2E Test")');
    await createdItem.waitFor({ timeout: 5000 });
    const metaText = await createdItem.locator('.admin-list-item-meta').textContent();
    console.log('Project list meta text:', metaText);
    if (metaText.includes('Gesture & Interaction')) {
      console.log('✓ PASS: Admin list displays "Gesture & Interaction"');
    } else {
      throw new Error(`List item meta does not include "Gesture & Interaction": ${metaText}`);
    }

    // 7. Click Edit on the project -> verify fields
    console.log('\n--- Step 7: Edit Project & Verify State ---');
    await createdItem.locator('button:has-text("Edit")').click();
    await page.waitForSelector('.admin-panel-title:has-text("Edit Project")', { timeout: 5000 });

    const editCategoryVal = await page.locator('select.form-input').inputValue();
    const editCustomVal = await page.locator('input[placeholder="Enter category name..."]').inputValue();
    console.log('Edit mode select value:', editCategoryVal);
    console.log('Edit mode custom input value:', editCustomVal);

    if (editCategoryVal === 'Other' && editCustomVal === 'Gesture & Interaction') {
      console.log('✓ PASS: Dropdown shows "Other" and Custom Category shows "Gesture & Interaction"');
    } else {
      throw new Error(`Expected Other / Gesture & Interaction, got ${editCategoryVal} / ${editCustomVal}`);
    }

    // 8. Change category to "IoT"
    console.log('\n--- Step 8: Switch Category to Predefined "IoT" ---');
    await page.locator('select.form-input').selectOption('IoT');
    const customHidden = !(await page.locator('input[placeholder="Enter category name..."]').isVisible());
    console.log('Custom input hidden after selecting IoT:', customHidden);
    if (customHidden) {
      console.log('✓ PASS: Custom category input hidden after switching to predefined "IoT"');
    } else {
      throw new Error('Custom category input should be hidden when IoT is selected');
    }

    await page.click('button[type="submit"]:has-text("Save Project")');
    await page.waitForSelector('.form-status--success:has-text("Project updated")', { timeout: 8000 });
    console.log('✓ PASS: Project updated to IoT');

    // 9. Change category to "No Category"
    console.log('\n--- Step 9: Switch Category to "No Category" ---');
    await page.locator('.admin-list-item:has-text("Gesture Scroll E2E Test") button:has-text("Edit")').click();
    await page.waitForSelector('.admin-panel-title:has-text("Edit Project")', { timeout: 5000 });
    await page.locator('select.form-input').selectOption('');
    await page.click('button[type="submit"]:has-text("Save Project")');
    await page.waitForSelector('.form-status--success:has-text("Project updated")', { timeout: 8000 });
    console.log('✓ PASS: Project updated to "No Category"');

    // 10. Check public portfolio rendering
    console.log('\n--- Step 10: Check Public Portfolio Rendering ---');
    await page.goto('http://localhost:3001/#projects', { waitUntil: 'networkidle' });
    const publicCard = page.locator('.project-card:has-text("Gesture Scroll E2E Test")');
    const cardExists = await publicCard.count() > 0;
    console.log('Project visible on public portfolio:', cardExists);
    if (cardExists) {
      const categoryTag = publicCard.locator('.project-category');
      const hasCategoryTag = await categoryTag.count() > 0;
      console.log('Project has category label on public card:', hasCategoryTag);
      if (!hasCategoryTag) {
        console.log('✓ PASS: No Category tag is displayed when project category is empty (Clean UI)');
      } else {
        const catText = await categoryTag.textContent();
        throw new Error(`Unexpected category tag rendered for empty category: "${catText}"`);
      }
    }

    // 11. Cleanup E2E test project
    console.log('\n--- Step 11: Cleanup ---');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    await page.click('button.admin-nav-item:has-text("Projects")');
    await page.waitForSelector('.admin-panel-title:has-text("Projects")', { timeout: 5000 });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    const deleteBtn = page.locator('.admin-list-item:has-text("Gesture Scroll E2E Test") button:has-text("Delete")');
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForSelector('.form-status--success:has-text("Project deleted")', { timeout: 5000 });
      console.log('✓ PASS: Temporary E2E test project deleted cleanly');
    }

    console.log('\n====================================================');
    console.log('ALL E2E BROWSER TESTS PASSED FLAWLESSLY!');
    console.log('====================================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runE2ETest().catch((err) => {
  console.error('\n✗ E2E Test failed:', err.message);
  process.exit(1);
});
