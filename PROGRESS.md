# PROGRESS.md — dashboard rebuild task state

Status: COMPLETE (2026-08-31). Resume notes in case of interruption:

- dashboard/ fully rebuilt: Vite + React 18 + Tailwind 3 + shadcn-style ui primitives
  (src/components/ui) + recharts. CRA removed. Dev: `npm run dev` (vite, port 3200
  strictPort). Build: `npm run build` -> dist/.
- DESIGN.md written FIRST as build contract (rationale register + sources).
  Every component file has a one-line `// Why:` header comment.
- Responsive: sidebar full >=xl / icon rail md-xl / hamburger overlay <md;
  KPI grids 1->2->4 cols; DataTable sticky first column + horizontal scroll.
- Backend filter fixes (api/src/routes/dashboard.js): `platform` param on /executive
  (source-filtered contacts + conditional spend), lost-leads `source=organic`
  aggregates organic sources; campaign ads payload includes adset_id; CORS enabled.
- PM2: attribution-api restarted after backend changes (pm2 restart attribution-api).
- Deployed: dist/* -> /var/www/demo.trayini.ai (nginx proxies /api -> :3100 unchanged).
  https://demo.trayini.ai 200, /api/v1/* live with Bearer auth.
- Screenshots: outputs/screenshots/{executive,channel,campaign,quality,lost,sales}-{1440px,768px}.png
  via `node e2e/capture-screenshots.js` (SHOT_BASE_URL env to override target).
- Tests all green: pytest 7/7, node --test 12/12, playwright 17/17
  (12 dashboard flows + 5 responsive viewport tests).
- DB cleaned: stray test_ct_* contacts removed; seeded data = 500 leads / 42
  enrollments / $690K revenue / $22,484 spend (seed 42, doc 04/05 targets).
- No git commits. deeptech/ untouched. Other containers/PM2 apps untouched.

## 2026-08-31 follow-up fixes (all complete, deployed)
- BUG 1: lost-leads endpoint filtered on COALESCE(lost_date, created_at) — late-August
  losses (lost_date in Sept) were dropped by end_date. Now filters contacts.created_at,
  consistent with executive. Both views agree (425 lost, 85%).
- BUG 2: generator lost_reason now weighted (LOST_REASON_WEIGHTS, price 25%...) and
  lost_stage weighted (LOST_STAGE_WEIGHTS, consultation 26.7% top). New draws shifted
  the RNG stream, so seed 42 -> 46 enrollments; seed search picked SEED 40 (42 enrollments,
  425 lost / 33 open, $686K, $22.3K spend). Default seed is now 40.
- BUG 3: DailySalesReport insight — leader chosen only among sales_managers with
  sales_amount > 0; all-zero date shows neutral activity summary instead.
- BUG 4: table cells tightened (px-2.5), channel money columns compact ($314K),
  donut/table stack below xl -> ROAS column fully visible at >=1280.
- Verified: exec 500/42/425/$686K/30.8x; lost view top stage consultation 27.3%,
  top reason price 24.5%; 0 lost opps with missing reason/stage.
- Tests: pytest 7/7, node --test 13/13 (added cross-view consistency test), playwright 17/17.
- Redeployed to /var/www/demo.trayini.ai (200 OK). Screenshots recaptured:
  outputs/screenshots/{executive,channel,lost}-1440px.png + sales-768px.png.
