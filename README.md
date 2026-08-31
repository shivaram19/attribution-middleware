# Marketing Attribution Middleware (Demo)

GHL CRM + Meta/Google Ads attribution middleware for an education business.
Implements the tech spec in `../deeptech/attribution_middleware_tech_spec.md`:

- **Postgres 16** analytics warehouse (13 tables + `dead_letter_queue` + `mv_daily_campaign_performance`)
- **Redis 7** first-touch attribution capture (90-day TTL, first-touch LOCKED)
- **Mock data generator** (Python) — 500 leads / 30 days / full funnel
- **Dashboard API** (Node.js/Express) — the 6 dashboard views + GHL webhooks + capture service

## Quickstart

### 1. Start infrastructure

```bash
docker compose up -d
# Postgres -> localhost:5440 (attribution/attribution_dev, db: attribution_db)
# Redis    -> localhost:6380 (maxmemory 256mb, allkeys-lru)
# db/schema.sql runs automatically on first boot
```

### 2. Generate + load mock data

```bash
cd generator
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python mock_data_generator.py --location-id=demo_loc_001 --days=30 --leads=500 --save --clean
# --clean TRUNCATEs the data tables first, so re-runs are idempotent
```

Expected summary (deterministic, seed 42): 500 leads, 42 enrollments (8.4%),
425 lost (85.0%), $690,000 revenue, $22,484 ad spend, ROAS 30.7x, CAC $535 —
matching the demo script targets in docs 04/05 (~42 / ~$672K / ~$22.8K / 29.4x).

### 3. Start the API

```bash
cd api
npm install
cp .env.example .env   # optional; sensible defaults are built in
npm start              # listens on :3100
```

Health check:

```bash
curl http://localhost:3100/health
# {"status":"ok","postgres":"ok","redis":"ok"}
```

### 4. Dashboard endpoints (Bearer auth, default token `demo-token`)

```bash
TOKEN="Authorization: Bearer demo-token"

curl -s -H "$TOKEN" http://localhost:3100/api/v1/dashboard/executive | jq
curl -s -H "$TOKEN" http://localhost:3100/api/v1/dashboard/channel | jq
curl -s -H "$TOKEN" "http://localhost:3100/api/v1/dashboard/campaign?platform=meta&campaign_id=camp_001" | jq
curl -s -H "$TOKEN" "http://localhost:3100/api/v1/dashboard/campaign?platform=google&campaign_id=gcamp_001" | jq
curl -s -H "$TOKEN" http://localhost:3100/api/v1/dashboard/quality | jq
curl -s -H "$TOKEN" http://localhost:3100/api/v1/dashboard/lost-leads | jq
curl -s -H "$TOKEN" "http://localhost:3100/api/v1/dashboard/lost-leads?source=meta" | jq
curl -s -H "$TOKEN" "http://localhost:3100/api/v1/dashboard/daily-sales?date=2026-08-25" | jq
```

All endpoints accept `start_date`, `end_date`, `location_id` query filters.

**Quality score formula** (demo, 0-10):
`min(10, 4*min(enrollment_rate,15)/15 + 3*min(roas,35)/35 + 3*min(revenue_per_lead,2000)/2000)`

### 5. First-touch capture service (no auth — sits in front of GHL forms)

```bash
# First visit: first-touch is stored and LOCKED (90-day TTL in Redis)
curl -s -X POST "http://localhost:3100/api/v1/capture/first-touch?fingerprint=visitor-1&utm_source=meta&utm_campaign=summer&fbclid=fb123" | jq

# Return visit: first_touch_* unchanged, latest_touch_* updated
curl -s -X POST "http://localhost:3100/api/v1/capture/first-touch?fingerprint=visitor-1&utm_source=google&gclid=gc456" | jq

curl -s http://localhost:3100/api/v1/capture/visitor-1 | jq
```

### 6. GHL webhook receiver (HMAC-SHA256 verified)

```bash
SECRET=whsec_demo_secret
BODY='{"event":"contact.created","id":"c_1","locationId":"demo_loc_001","firstName":"Jane","email":"jane@x.dev"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -s -X POST http://localhost:3100/webhooks/ghl \
  -H "Content-Type: application/json" -H "x-ghl-signature: $SIG" -d "$BODY"
```

Handled events: `contact.created/updated`, `opportunity.created/stage_changed/status_changed`
(won → upsert into `attributions`), `appointment.booked`, `form.submitted`.
Failures land in `dead_letter_queue`. If `GHL_WEBHOOK_SECRET` is unset, signature
verification is skipped (dev mode).

## Tests

```bash
# Generator unit tests (in-memory, no DB needed)
cd generator && .venv/bin/python -m pytest test_generator.py -q

# API smoke tests (require docker stack up + seeded data)
cd api && npm test
```

## Frontend dashboard (Vite + React 18 + Tailwind + shadcn/ui, port 3200)

```bash
cd dashboard
npm install
npm run dev      # http://localhost:3200 (vite config: port 3200, strictPort)
npm run build    # production build -> dist/
```

Design system: see DESIGN.md (research-driven: 3-second rule, F-pattern, 60-30-10,
Gestalt grouping, sticky global filter bar, progressive disclosure, responsive
sidebar: full ≥xl / icon rail md–xl / hamburger <md).

The UI reads from the live API by default (`src/data/api.js`), configured via env:

| Env var | Default | Purpose |
|---------|---------|---------|
| `VITE_API_URL` | `http://localhost:3100` (dev), empty = same-origin (prod) | Dashboard API base URL |
| `VITE_DASHBOARD_TOKEN` | `demo-token` | Bearer token |
| `VITE_DATA_SOURCE` | `api` | `mock` forces the static mockData |

If the API is unreachable, every view falls back to `src/data/mockData.js` and shows an
"offline demo data" badge. The API has CORS enabled for the frontend origin.
Deployed build: `npm run build` then copy `dist/*` to the web root (demo.trayini.ai).

## E2E tests (Playwright)

Browser-based E2E over the live stack (uses the system Google Chrome — no browser
download; `channel: 'chrome'` in playwright.config.js). Playwright's `webServer`
starts both the API (:3100) and the Vite frontend (:3200) automatically.

```bash
cd e2e
npm install
npm run test:e2e      # = npx playwright test
```

Covers: sidebar nav (6 views), executive summary vs live API values, channel
live/simulated badges, campaign drill-down (campaign -> ad sets -> ads), lead quality
sorting, lost-lead breakdown, daily sales for 2026-08-25, Authorization header on API
requests, offline mock-data fallback, global filter behavior (7D date preset refetch,
meta->google platform switch, daily-sales date change) and responsive layout at
1920/1440/1280/768/390px (full sidebar -> icon rail -> hamburger overlay, KPI grid
4->2->1, sticky-first-column tables).

Screenshots of all 6 views at 1440px + 768px: `node e2e/capture-screenshots.js`
-> `outputs/screenshots/`.


## Layout

```
docker-compose.yml            # postgres:16-alpine (5440) + redis:7-alpine (6380)
db/schema.sql                 # 13 tables + DLQ + indexes + mv_daily_campaign_performance + seed campaign structure
generator/
  mock_data_generator.py      # extracted from doc 03 (bug-fixed; --save/--clean)
  requirements.txt
  test_generator.py           # pytest, in-memory
api/
  package.json / .env.example
  src/index.js                # app factory + /health + bearer auth
  src/db.js                   # pg Pool (DATABASE_URL)
  src/redis.js                # redis client (REDIS_URL)
  src/lib/retry.js            # retryWithBackoff (spec 12.1)
  src/routes/dashboard.js     # 6 dashboard endpoints (spec 9.2)
  src/routes/capture.js       # first-touch capture, Redis 90-day TTL, locked
  src/routes/webhooks.js      # GHL webhooks, HMAC verify, DLQ
  test/api.test.js            # node:test smoke tests (live DB + Redis)
dashboard/                    # Vite + React 18 + Tailwind + shadcn/ui frontend
  src/data/api.js             # fetch layer + useDashboardData hook (mock fallback)
  src/data/mockData.js        # static demo data (fallback / VITE_DATA_SOURCE=mock)
  src/components/             # layout/ filters/ primitives/ views/ ui/ (see DESIGN.md)
e2e/
  playwright.config.js        # system Chrome, webServer: api :3100 + vite dev :3200
  tests/dashboard.spec.js     # 12 UI E2E flows (views, live values, filters, fallback)
  tests/responsive.spec.js    # 5 responsive tests (1920/1440/1280/768/390px)
  capture-screenshots.js      # 6 views x 1440px/768px -> outputs/screenshots/
DESIGN.md                     # design principles + component rationale register
```

## Vendor API compliance (validated docs 01–06 take precedence over the old spec)

- **GHL API V2** (doc 01): base URL `https://services.leadconnectorhq.com`; every call requires the
  `Version: 2021-07-28` header. Contact listing uses `GET /contacts/lookup` (the old `GET /contacts/`
  list endpoint is DEPRECATED). OAuth endpoints are kebab-case: `/oauth/installed-locations`,
  `/oauth/location-token`; token refresh prefers snake_case form fields (`client_id`,
  `client_secret`, `refresh_token`). Contact responses use `GetContactByIdSchemaV3` /
  `DndSettingsSchemaV3` (the `succeded` property was removed 2026-08-03). Webhooks are verified with
  HMAC-SHA256 (implemented in `src/routes/webhooks.js`).
- **Meta Marketing API v25** (`META_API_VERSION=v25.0`): active attribution windows are
  `7d_click` / `1d_view`; `7d_view` and `28d_view` were removed Jan 12, 2026 and are not used.
- **Google Ads API v24** (doc 06): demo runs in MOCK mode — Google data in the dashboard is
  simulated and labeled `data_source: "simulated"` (Meta rows are labeled `"live"`), per the
  `DEMO_MODE` config in `src/lib/demoMode.js`. Excluded per doc 06: Smart Campaign creation API
  (ends Aug 3, 2026), v23 Performance Max channel reporting, `MIXED` enum. Once Google Basic
  Access is approved, set `DEMO_MODE_GOOGLE=live` and wire the real sync.
- **Redis** (doc 02): first-touch records stored as `attr:{fingerprint}` with a 90-day TTL
  (`7776000` seconds), first-touch locked, latest-touch updated — `src/routes/capture.js`.

## Demo data notes / approximations

- Insights are generated at **campaign level** only, so adset/ad-level spend in
  `/dashboard/campaign` is allocated proportionally (Meta: lead share; Google:
  attributed-revenue share). Documented in `dashboard.js`.
- Funnel rates were tuned vs. doc 03 so output matches the doc's own expected
  summary (~8.4% lead→enrollment, ~42 enrollments / 500 leads).
- The materialized view uses `first_touch_source` (doc 02's draft referenced a
  non-existent `first_touch_platform` column). Refresh:
  `REFRESH MATERIALIZED VIEW mv_daily_campaign_performance;`
