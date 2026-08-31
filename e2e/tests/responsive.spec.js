// Responsive E2E: the dashboard must hold at every desktop width and degrade
// gracefully to tablet/mobile.
//   ≥1280 (xl): full sidebar with labels, KPI grid 4-up
//   768–1279 (md–xl): icon-rail sidebar, KPI grid 2-up
//   <768 (<md): sidebar hidden, hamburger overlay, KPI grid 1-up

const { test, expect } = require('@playwright/test');

async function kpiColumnCount(page) {
  return page.getByTestId('kpi-row').evaluate((el) =>
    getComputedStyle(el).gridTemplateColumns.split(' ').length
  );
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

for (const width of [1920, 1440, 1280]) {
  test(`desktop ${width}px: full sidebar, 4 KPI columns, charts resize, no overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();
    // full labels at ≥xl
    await expect(sidebar).toContainText('Executive Summary');

    expect(await kpiColumnCount(page)).toBe(4);
    // charts render and fit their container
    await expect(page.getByTestId('trend-chart').locator('svg').first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
}

test('tablet 768px: icon-rail sidebar (no labels), KPI grid 2-up, no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');

  const sidebar = page.getByTestId('sidebar');
  await expect(sidebar).toBeVisible();
  // icon rail: nav buttons present (icon testids) but labels hidden (xl copy display:none)
  await expect(page.getByTestId('nav-icon-executive')).toBeVisible();
  await expect(sidebar.getByText('Channel Breakdown').first()).toBeHidden();
  const box = await sidebar.boundingBox();
  expect(box.width).toBeLessThan(100); // w-16 icon rail

  expect(await kpiColumnCount(page)).toBe(2);
  expect(await noHorizontalOverflow(page)).toBe(true);

  // tables scroll horizontally instead of breaking layout (quality = widest table)
  await page.getByTestId('nav-icon-quality').click();
  await expect(page.getByTestId('quality-table')).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
});

test('mobile 390px: sidebar hidden, hamburger overlay, KPI grid 1-up', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByTestId('sidebar')).toBeHidden();
  await expect(page.getByTestId('mobile-menu')).toBeVisible();
  expect(await kpiColumnCount(page)).toBe(1);
  expect(await noHorizontalOverflow(page)).toBe(true);

  // hamburger opens overlay nav, navigation works
  await page.getByTestId('mobile-menu').click();
  await expect(page.getByTestId('sidebar-mobile')).toBeVisible();
  await page.getByTestId('sidebar-mobile').getByTestId('nav-lost').click();
  await expect(page.getByTestId('view-lost')).toBeVisible();
  await expect(page.getByTestId('sidebar-mobile')).toBeHidden();
});
