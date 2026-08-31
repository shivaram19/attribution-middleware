// PM2 ecosystem config for the attribution middleware API.
// Why: secrets live in api/.env (gitignored) — this file loads it at pm2
// start/restart time so no secret is ever committed to the repo.
const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  const env = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* .env optional — PM2 env or shell env may provide values */ }
  return env;
}

const secrets = loadEnvFile(path.join(__dirname, 'api', '.env'));

module.exports = {
  apps: [
    {
      name: 'attribution-api',
      cwd: '/home/shivaramgoud/projects/attribution-middleware/api',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        DASHBOARD_API_PORT: 3100,
        DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN || 'demo-token',
        GHL_WEBHOOK_SECRET: secrets.GHL_WEBHOOK_SECRET || process.env.GHL_WEBHOOK_SECRET || '',
        DATABASE_URL: 'postgresql://attribution:attribution_dev@localhost:5440/attribution_db',
        REDIS_URL: 'redis://localhost:6380/0'
      },
      max_memory_restart: '256M',
      restart_delay: 3000,
      out_file: '/home/shivaramgoud/projects/attribution-middleware/logs/api-out.log',
      error_file: '/home/shivaramgoud/projects/attribution-middleware/logs/api-error.log',
      time: true
    }
  ]
};
