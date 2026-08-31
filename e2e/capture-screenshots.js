// Capture full-page screenshots of all 6 views at 1440px and 768px
// from the deployed dashboard (https://demo.trayini.ai).
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.SHOT_BASE_URL || 'https://demo.trayini.ai';
const OUT = path.resolve(__dirname, '../outputs/screenshots');

const VIEWS = [
  ['executive', 'Executive Summary'],
  ['channel', 'Channel Breakdown'],
  ['campaign', 'Campaign Drill-Down'],
  ['quality', 'Lead Quality'],
  ['lost', 'Lost Leads'],
  ['sales', 'Daily Sales']
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const [width, height] of [[1440, 900], [768, 1024]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    for (const [id] of VIEWS) {
      if (id !== 'executive') {
        const navId = width >= 1280 ? `nav-${id}` : `nav-icon-${id}`;
        await page.getByTestId(navId).click();
      }
      // wait for data (KPI row or a table) to be rendered
      await page.waitForSelector('[data-testid^="view-"] [data-testid^="kpi-"], [data-testid$="-table"], [data-testid="campaign-table"]', { timeout: 30000 });
      await page.waitForTimeout(1200); // charts animate in
      const file = path.join(OUT, `${id}-${width}px.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('captured', file);
    }
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
