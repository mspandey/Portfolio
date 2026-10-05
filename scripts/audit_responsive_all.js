import { chromium } from 'playwright';

const breakpoints = [
  { name: 'Mobile 320x568', width: 320, height: 568 },
  { name: 'Mobile 360x800', width: 360, height: 800 },
  { name: 'Mobile 375x812', width: 375, height: 812 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Mobile 412x915', width: 412, height: 915 },
  { name: 'Mobile 430x932', width: 430, height: 932 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Tablet 820x1180', width: 820, height: 1180 },
  { name: 'Tablet 1024x1366', width: 1024, height: 1366 },
  { name: 'Desktop 1280x720', width: 1280, height: 720 },
  { name: 'Desktop 1440x900', width: 1440, height: 900 },
  { name: 'Desktop 1920x1080', width: 1920, height: 1080 }
];

async function audit() {
  const browser = await chromium.launch({ headless: true });

  for (const bp of breakpoints) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    await page.goto('https://public-five-psi-47.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyScrollW = document.body.scrollWidth;

      const overflowingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > docW + 1 || r.right > docW + 1) {
          overflowingElements.push({
            tag: el.tagName,
            cls: el.className,
            id: el.id,
            width: Math.round(r.width),
            right: Math.round(r.right),
            docW
          });
        }
      });

      return { docW, scrollW, bodyScrollW, overflowingCount: overflowingElements.length, sample: overflowingElements.slice(0, 5) };
    });

    console.log(`[${bp.name}] docW: ${info.docW}, scrollW: ${info.scrollW}, bodyW: ${info.bodyScrollW}`);
    if (info.overflowingCount > 0) {
      console.log(`  -> ${info.overflowingCount} overflowing elements! Sample:`, info.sample);
    } else {
      console.log(`  -> PASS (no overflow)`);
    }

    await page.close();
  }

  await browser.close();
}

audit();
