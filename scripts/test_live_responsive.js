import { chromium } from 'playwright';

const URL = 'https://public-five-psi-47.vercel.app/';

const breakpoints = [
  { name: 'Mobile 320x568 (iPhone SE 1st gen)', width: 320, height: 568, isMobile: true },
  { name: 'Mobile 360x800 (Galaxy S20)', width: 360, height: 800, isMobile: true },
  { name: 'Mobile 375x667 (iPhone 8/SE 2)', width: 375, height: 667, isMobile: true },
  { name: 'Mobile 390x844 (iPhone 12/13/14)', width: 390, height: 844, isMobile: true },
  { name: 'Mobile 412x915 (Pixel 7)', width: 412, height: 915, isMobile: true },
  { name: 'Mobile 430x932 (iPhone 14 Pro Max)', width: 430, height: 932, isMobile: true },
  { name: 'Tablet 768x1024 (iPad Portrait)', width: 768, height: 1024, isMobile: true },
  { name: 'Tablet 1024x768 (iPad Landscape)', width: 1024, height: 768, isMobile: false },
  { name: 'Desktop 1280x720 (HD)', width: 1280, height: 720, isMobile: false },
  { name: 'Desktop 1440x900 (MacBook Pro)', width: 1440, height: 900, isMobile: false },
  { name: 'Desktop 1920x1080 (FHD)', width: 1920, height: 1080, isMobile: false }
];

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  console.log(`Starting tests on ${URL}...`);

  for (const bp of breakpoints) {
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      hasTouch: bp.isMobile
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });

    console.log(`\n========================================`);
    console.log(`Testing breakpoint: ${bp.name} (${bp.width}x${bp.height})`);

    // 1. Check Horizontal Overflow
    const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    const hasHorizontalOverflow = bodyScrollWidth > windowWidth;
    console.log(`- Horizontal overflow: ${hasHorizontalOverflow ? 'FAIL (ScrollWidth: ' + bodyScrollWidth + ' > ' + windowWidth + ')' : 'PASS'}`);

    if (bp.isMobile) {
      // 2. Check Mobile Header Bar & Toggle Button
      const mobileHeaderVisible = await page.locator('.mobile-header-bar').isVisible();
      const desktopNavVisible = await page.locator('.desktop-navigation').isVisible();
      console.log(`- Mobile header visible: ${mobileHeaderVisible}`);
      console.log(`- Desktop navigation hidden: ${!desktopNavVisible}`);

      // 3. Test Menu Toggle Open/Close
      const toggleBtn = page.locator('.mobile-menu-toggle');
      const isExpandedClosed = await toggleBtn.getAttribute('aria-expanded');
      console.log(`- Toggle button aria-expanded when closed: ${isExpandedClosed}`);

      await toggleBtn.click();
      await page.waitForTimeout(350);

      const isDrawerOpen = await page.locator('.mobile-nav-drawer').isVisible();
      const isOverlayOpen = await page.locator('.mobile-nav-overlay').isVisible();
      const isExpandedOpen = await toggleBtn.getAttribute('aria-expanded');
      console.log(`- Mobile drawer opened: ${isDrawerOpen}`);
      console.log(`- Mobile overlay visible: ${isOverlayOpen}`);
      console.log(`- Toggle button aria-expanded when open: ${isExpandedOpen}`);

      // 4. Test clicking a link closes menu and scrolls
      const firstLink = page.locator('.mobile-nav-link').first();
      const firstLinkText = await firstLink.textContent();
      const firstLinkHref = await firstLink.getAttribute('href');
      console.log(`- First mobile link: "${firstLinkText?.trim()}" -> ${firstLinkHref}`);

      await firstLink.click();
      await page.waitForTimeout(400);

      const isDrawerOpenAfterClick = await page.locator('.mobile-nav-drawer.is-open').count() > 0;
      console.log(`- Mobile drawer closed after link click: ${!isDrawerOpenAfterClick}`);

      // 5. Test Outside Click (open again and click overlay)
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await page.locator('.mobile-nav-overlay').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      const isDrawerOpenAfterOverlay = await page.locator('.mobile-nav-drawer.is-open').count() > 0;
      console.log(`- Mobile drawer closed after overlay click: ${!isDrawerOpenAfterOverlay}`);

      // 6. Test Escape key (open again and press Escape)
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const isDrawerOpenAfterEscape = await page.locator('.mobile-nav-drawer.is-open').count() > 0;
      console.log(`- Mobile drawer closed after Escape key: ${!isDrawerOpenAfterEscape}`);
    } else {
      // Desktop checks
      const desktopNavVisible = await page.locator('.desktop-navigation').isVisible();
      const mobileHeaderVisible = await page.locator('.mobile-header-bar').isVisible();
      console.log(`- Desktop navigation visible: ${desktopNavVisible}`);
      console.log(`- Mobile header hidden: ${!mobileHeaderVisible}`);

      const linksCount = await page.locator('.desktop-navigation a').count();
      console.log(`- Desktop nav items count: ${linksCount}`);
    }

    // Check Hero element presence and readability
    const heroVisible = await page.locator('.hero').isVisible();
    const heroCanvasVisible = await page.locator('.portrait-canvas').isVisible();
    const heroName = await page.locator('.name').first().textContent();
    console.log(`- Hero section visible: ${heroVisible}`);
    console.log(`- Hero canvas visible: ${heroCanvasVisible}`);
    console.log(`- Hero name text readable: "${heroName?.trim().replace(/\s+/g, ' ')}"`);

    await context.close();
  }

  await browser.close();
  console.log('\nAll tests complete.');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
