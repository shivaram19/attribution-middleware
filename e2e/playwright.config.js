// Playwright E2E config — dashboard UI tests.
// Uses the system Google Chrome (channel: 'chrome') — no browser download needed.
// webServer starts (a) the Express API on :3100 and (b) the CRA frontend on :3200.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  retries: 1,
  reporter: 'list',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:3200',
    channel: 'chrome',
    headless: true
  },
  projects: [
    { name: 'chrome', use: { channel: 'chrome', headless: true } }
  ],

  webServer: [
    {
      command: 'npm start',
      cwd: '../api',
      url: 'http://localhost:3100/health',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        DASHBOARD_API_PORT: '3100',
        DASHBOARD_TOKEN: 'demo-token',
        GHL_WEBHOOK_SECRET: 'whsec_demo_secret'
      }
    },
    {
      command: 'npm run dev',
      cwd: '../dashboard',
      url: 'http://localhost:3200',
      reuseExistingServer: true,
      timeout: 180000, // dev server startup
      env: {
        VITE_API_URL: 'http://localhost:3100',
        VITE_DASHBOARD_TOKEN: 'demo-token',
        VITE_DATA_SOURCE: 'api'
      }
    }
  ]
});
