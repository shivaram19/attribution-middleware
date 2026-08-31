// E2E flows for the rebuilt shadcn/ui + Tailwind + Vite dashboard.
// The UI is wired to the live Express API (:3100); tests fetch the same API
// with the Bearer token and assert the UI renders those exact values.
// Selectors use data-testid for stability.

const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3100';
const TOKEN = process.env.DASHBOARD_TOKEN || 'demo-token';
const DRANGE = 'start_date=2026-08-01&end_date=2026-08-31';

async function apiGet(path) {
  const ctx = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${TOKEN}` }
  });
  const res = await ctx.get(path);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body;
}

// same compact money formatting as the UI ($690K)
const fmtK = (n) => '$' + (Number(n) / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'K';

async function goToView(page, id) {
  await page.getByTestId(`nav-${id}`).click();
  await expect(page.getByTestId(`view-${id}`)).toBeVisible();
}

test('app loads and sidebar shows all 6 views', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sidebar')).toBeVisible();
  for (const id of ['executive', 'channel', 'campaign', 'quality', 'lost', 'sales']) {
    await expect(page.getByTestId(`nav-${id}`)).toBeVisible();
  }
  // default view renders with KPI cards
  await expect(page.getByTestId('view-executive')).toBeVisible();
  await expect(page.getByTestId('kpi-revenue')).toBeVisible();
});

test('executive summary renders live API values', async ({ page }) => {
  const api = await apiGet(`/api/v1/dashboard/executive?${DRANGE}`);
  const s = api.summary;

  await page.goto('/');
  await expect(page.getByTestId('kpi-revenue')).toContainText(fmtK(s.total_revenue));
  await expect(page.getByTestId('kpi-roas')).toContainText(`${s.roas}x`);
  await expect(page.getByTestId('kpi-enrollments')).toContainText(String(s.enrollments));
  await expect(page.getByTestId('kpi-cac')).toContainText(`$${Math.round(s.cac)}`);
  await expect(page.getByTestId('kpi-total-leads')).toContainText(String(s.total_leads));
  await expect(page.getByTestId('trend-chart')).toBeVisible();
});

test('channel breakdown: Meta live + Google simulated badges, values match API', async ({ page }) => {
  const api = await apiGet(`/api/v1/dashboard/channel?${DRANGE}`);
  const meta = api.channels.find((c) => c.name === 'Meta');

  await page.goto('/');
  await goToView(page, 'channel');

  const table = page.getByTestId('channel-table');
  await expect(table).toBeVisible();
  await expect(page.getByTestId('badge-meta')).toHaveText('Live API');       // Meta
  await expect(page.getByTestId('badge-google')).toHaveText('Simulated'); // Google
  await expect(table).toContainText(String(meta.leads));
  await expect(table).toContainText('Organic');
});

test('campaign drill-down: campaign -> ad sets -> ads, values match API', async ({ page }) => {
  const detail = await apiGet(`/api/v1/dashboard/campaign?platform=meta&campaign_id=camp_001&${DRANGE}`);
  expect(detail.campaign.spend).toBeGreaterThan(0);
  expect(detail.adsets.length).toBeGreaterThan(0);

  await page.goto('/');
  await goToView(page, 'campaign');

  const table = page.getByTestId('campaign-table');
  const row = table.locator('tbody tr', { hasText: detail.campaign.name });
  await expect(row).toBeVisible();
  await expect(row).toContainText(String(detail.campaign.leads));

  // drill to ad sets
  await row.click();
  const adsetTable = page.getByTestId('adset-table');
  const adsetRow = adsetTable.locator('tbody tr', { hasText: detail.adsets[0].name });
  await expect(adsetRow).toBeVisible();
  await expect(page.getByTestId('breadcrumb')).toContainText(detail.campaign.name);

  // drill to ads
  const ads = detail.ads.filter((a) => a.adset_id === detail.adsets[0].id);
  if (ads.length > 0) {
    await adsetRow.click();
    await expect(page.getByTestId('ads-grid')).toBeVisible();
    await expect(page.getByTestId(`ad-${ads[0].id}`)).toContainText(String(ads[0].leads));
  }
});

test('lead quality: scores render sorted best-first', async ({ page }) => {
  const api = await apiGet(`/api/v1/dashboard/quality?${DRANGE}`);
  expect(api.campaigns.length).toBeGreaterThan(0);

  await page.goto('/');
  await goToView(page, 'quality');

  const table = page.getByTestId('quality-table');
  const firstRow = table.locator('tbody tr').first();
  await expect(firstRow).toContainText(api.campaigns[0].name);
  await expect(firstRow).toContainText(String(api.campaigns[0].quality_score));

  for (const c of api.campaigns) {
    expect(c.quality_score).toBeGreaterThanOrEqual(0);
    expect(c.quality_score).toBeLessThanOrEqual(10);
  }
});

test('lost leads: breakdown visible, reason percentages sum ~100', async ({ page }) => {
  const api = await apiGet(`/api/v1/dashboard/lost-leads?${DRANGE}`);

  await page.goto('/');
  await goToView(page, 'lost');

  await expect(page.getByTestId('kpi-lost-total')).toContainText(String(api.summary.total_lost));
  const top = api.by_reason[0];
  const reasonRow = page.getByTestId('lost-reason-table').locator('tbody tr', { hasText: top.reason });
  await expect(reasonRow).toContainText(String(top.count));
  await expect(page.getByTestId('lost-stage-list')).toBeVisible();

  const sum = api.by_reason.reduce((acc, r) => acc + r.percentage, 0);
  expect(Math.abs(sum - 100)).toBeLessThan(2);
});

test('daily sales: call center + sales managers render for 2026-08-25', async ({ page }) => {
  const api = await apiGet('/api/v1/dashboard/daily-sales?date=2026-08-25');
  expect(api.call_center.length).toBeGreaterThan(0);
  expect(api.sales_managers.length).toBeGreaterThan(0);

  await page.goto('/');
  await goToView(page, 'sales');

  await expect(page.getByTestId('sales-date')).toHaveValue('2026-08-25');
  for (const u of api.call_center) {
    await expect(page.getByTestId('call-center-table')).toContainText(u.name);
  }

  await page.getByTestId('tab-sales-managers').click();
  for (const u of api.sales_managers) {
    await expect(page.getByTestId('sales-managers-table')).toContainText(u.name);
  }
});

test('dashboard API requests carry the Bearer token', async ({ page }) => {
  const reqPromise = page.waitForRequest((req) =>
    req.url().includes('/api/v1/dashboard/') &&
    req.headers()['authorization'] === `Bearer ${TOKEN}`
  );
  await page.goto('/');
  const req = await reqPromise;
  expect(req.url()).toContain('/api/v1/dashboard/executive');
});

test('fallback: API unreachable -> offline demo data, no crash', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByTestId('offline-badge').first()).toBeVisible();
  await expect(page.getByTestId('kpi-total-leads')).toBeVisible();

  await goToView(page, 'channel');
  await expect(page.getByTestId('offline-badge').first()).toBeVisible();
  await expect(page.getByTestId('channel-table')).toContainText('Meta');
});

// --- NEW: global filter tests ---

test('date range filter: 7D refetches with new start_date and changes KPIs', async ({ page }) => {
  await page.goto('/');
  const fullLeads = await page.getByTestId('kpi-total-leads').locator('p').nth(1).textContent();

  const reqPromise = page.waitForRequest((req) =>
    req.url().includes('/api/v1/dashboard/executive') && req.url().includes('start_date=2026-08-25')
  );
  await page.getByTestId('date-preset-7d').click();
  await reqPromise;

  // KPI visibly changes (7 days has fewer leads than the full month)
  const sevenDayLeads = await page.getByTestId('kpi-total-leads').locator('p').nth(1).textContent();
  expect(sevenDayLeads).not.toBe(fullLeads);

  // and matches the live API for the 7D window
  const api = await apiGet('/api/v1/dashboard/executive?start_date=2026-08-25&end_date=2026-08-31');
  expect(sevenDayLeads).toContain(String(api.summary.total_leads));
});

test('platform filter: campaign view switches meta -> google with new API request', async ({ page }) => {
  await page.goto('/');
  await goToView(page, 'campaign');
  await expect(page.getByTestId('campaign-table')).toContainText('Summer Enrollment 2026');

  const reqPromise = page.waitForRequest((req) =>
    req.url().includes('/api/v1/dashboard/campaign') && req.url().includes('platform=google')
  );
  await page.getByTestId('platform-select').selectOption('google');
  await reqPromise;

  await expect(page.getByTestId('campaign-table')).toContainText('Search - Nursing Programs');
  await expect(page.getByTestId('campaign-table')).not.toContainText('Summer Enrollment 2026');
});

test('daily sales: date change fires new request and table updates', async ({ page }) => {
  const day25 = await apiGet('/api/v1/dashboard/daily-sales?date=2026-08-25');
  const day24 = await apiGet('/api/v1/dashboard/daily-sales?date=2026-08-24');

  await page.goto('/');
  await goToView(page, 'sales');
  const table = page.getByTestId('call-center-table');
  await expect(table).toContainText(day25.call_center[0].name);

  const reqPromise = page.waitForRequest((req) =>
    req.url().includes('/api/v1/dashboard/daily-sales') && req.url().includes('date=2026-08-24')
  );
  await page.getByTestId('sales-date').fill('2026-08-24');
  await reqPromise;

  // table re-rendered with the new day's numbers
  await expect(table).toContainText(String(day24.call_center[0].calls_made));
});
