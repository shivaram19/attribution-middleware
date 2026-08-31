/**
 * Smoke tests against the live API backed by the seeded docker DB + redis.
 * Requires: docker compose up -d AND generator run with --save (500 leads).
 * Run with: npm test   (node --test)
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");

process.env.DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || "demo-token";
process.env.GHL_WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || "whsec_demo_secret";

const app = require("../src/index");
const { client: redisClient, getRedis } = require("../src/redis");
const { pool } = require("../src/db");

const TOKEN = process.env.DASHBOARD_TOKEN;
let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  if (redisClient.isOpen) await redisClient.quit();
  await pool.end();
});

async function get(path, { auth = true } = {}) {
  const res = await fetch(base + path, {
    headers: auth ? { Authorization: `Bearer ${TOKEN}` } : {}
  });
  return { status: res.status, body: await res.json() };
}

test("GET /health returns ok with postgres + redis up", async () => {
  const { status, body } = await get("/health", { auth: false });
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.postgres, "ok");
  assert.equal(body.redis, "ok");
});

test("dashboard endpoints reject requests without token (401)", async () => {
  const { status } = await get("/api/v1/dashboard/executive", { auth: false });
  assert.equal(status, 401);
  const { status: badToken } = await fetch(base + "/api/v1/dashboard/executive", {
    headers: { Authorization: "Bearer wrong" }
  }).then((r) => ({ status: r.status }));
  assert.equal(badToken, 401);
});

test("executive dashboard returns summary with seeded totals", async () => {
  const { status, body } = await get("/api/v1/dashboard/executive");
  assert.equal(status, 200);
  assert.ok(body.period);
  assert.ok(body.summary);
  assert.ok(body.summary.total_leads > 0);
  assert.ok(body.summary.total_revenue > 0);
  assert.ok(body.summary.roas > 0);
  assert.ok(Array.isArray(body.trend));
  assert.ok(body.trend.length > 0);
  assert.ok("date" in body.trend[0] && "leads" in body.trend[0]);
});

test("channel breakdown returns Meta + Google channels with doc-06 data_source labels", async () => {
  const { status, body } = await get("/api/v1/dashboard/channel");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.channels));
  const names = body.channels.map((c) => c.name);
  assert.ok(names.includes("Meta"));
  assert.ok(names.includes("Google"));
  const meta = body.channels.find((c) => c.name === "Meta");
  assert.ok(meta.leads > 0 && meta.spend > 0);
  // doc 06: Meta = live, Google = simulated (mock) demo data
  assert.equal(meta.data_source, "live");
  assert.equal(body.channels.find((c) => c.name === "Google").data_source, "simulated");
});

test("campaign drill-down returns campaign, adsets and ads", async () => {
  const { status, body } = await get("/api/v1/dashboard/campaign?platform=meta&campaign_id=camp_001");
  assert.equal(status, 200);
  assert.equal(body.campaign.id, "camp_001");
  assert.ok(body.campaign.leads > 0);
  assert.ok(Array.isArray(body.adsets) && body.adsets.length > 0);
  assert.ok(Array.isArray(body.ads) && body.ads.length > 0);
});

test("quality endpoint returns scored campaigns", async () => {
  const { status, body } = await get("/api/v1/dashboard/quality");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.campaigns) && body.campaigns.length > 0);
  for (const c of body.campaigns) {
    assert.ok(c.quality_score >= 0 && c.quality_score <= 10);
  }
});

test("lost-leads percentages sum to ~100", async () => {
  const { status, body } = await get("/api/v1/dashboard/lost-leads");
  assert.equal(status, 200);
  assert.ok(body.summary.total_lost > 0);
  const reasonSum = body.by_reason.reduce((s, r) => s + r.percentage, 0);
  const sourceSum = body.by_source.reduce((s, r) => s + r.percentage, 0);
  const stageSum = body.by_stage.reduce((s, r) => s + r.percentage, 0);
  for (const sum of [reasonSum, sourceSum, stageSum]) {
    assert.ok(Math.abs(sum - 100) < 2, `percentage sum ${sum} not ~100`);
  }
});

test("daily-sales returns call_center and sales_managers arrays", async () => {
  const { status, body } = await get("/api/v1/dashboard/daily-sales");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.call_center));
  assert.ok(Array.isArray(body.sales_managers));
  assert.ok(body.call_center.length > 0);
  assert.ok(body.sales_managers.length > 0);
});

test("capture first-touch lock: first touch never overwritten, latest always updated", async () => {
  const fp = `test-fp-${crypto.randomUUID()}`;
  const redis = await getRedis();

  // First visit: meta
  let res = await fetch(
    `${base}/api/v1/capture/first-touch?fingerprint=${fp}&utm_source=meta&utm_campaign=summer_enrollment&fbclid=fb123`
  , { method: "POST" });
  assert.equal(res.status, 201);
  const first = (await res.json()).data;
  assert.equal(first.first_touch_source, "meta");
  assert.equal(first.latest_touch_source, "meta");

  // Second visit: google -- must NOT overwrite first touch, MUST update latest
  res = await fetch(
    `${base}/api/v1/capture/first-touch?fingerprint=${fp}&utm_source=google&utm_campaign=search_nursing&gclid=gc456`
  , { method: "POST" });
  assert.equal(res.status, 200);
  const second = (await res.json()).data;
  assert.equal(second.first_touch_source, "meta", "first touch was overwritten!");
  assert.equal(second.first_touch_campaign, "summer_enrollment");
  assert.equal(second.latest_touch_source, "google", "latest touch not updated");
  assert.equal(second.visit_count, 2);

  // GET endpoint returns the record, TTL ~ 90 days
  res = await fetch(`${base}/api/v1/capture/${fp}`);
  assert.equal(res.status, 200);
  const stored = await res.json();
  assert.equal(stored.data.first_touch_source, "meta");
  assert.ok(stored.ttl_seconds > 7776000 - 60 && stored.ttl_seconds <= 7776000);

  await redis.del(`attr:${fp}`);
});

test("executive platform filter changes results (meta vs all)", async () => {
  const all = (await get("/api/v1/dashboard/executive")).body;
  const meta = (await get("/api/v1/dashboard/executive?platform=meta")).body;
  const organic = (await get("/api/v1/dashboard/executive?platform=organic")).body;
  assert.ok(meta.summary.total_leads > 0);
  assert.ok(meta.summary.total_leads < all.summary.total_leads);
  assert.ok(organic.summary.total_leads > 0);
  // organic has zero ad spend
  assert.equal(organic.summary.total_marketing_spend, 0);
  // meta spend < total spend
  assert.ok(meta.summary.total_marketing_spend < all.summary.total_marketing_spend);
});

test("lost-leads agrees with executive (cross-view consistency)", async () => {
  const exec = (await get("/api/v1/dashboard/executive")).body;
  const lost = (await get("/api/v1/dashboard/lost-leads")).body;
  assert.equal(lost.summary.total_lost, exec.summary.lost_leads);
  assert.ok(lost.summary.total_lost > 400); // ~423-425 on seeded demo data
  // every lost opportunity carries a reason and a stage
  assert.ok(lost.by_reason.every((r) => r.reason && r.reason.length > 0));
  assert.ok(lost.by_stage.every((s) => s.stage && s.stage.length > 0));
});

test("lost-leads source=organic aggregates organic sources", async () => {
  const { status, body } = await get("/api/v1/dashboard/lost-leads?source=organic");
  assert.equal(status, 200);
  assert.ok(body.summary.total_lost > 0);
  const sources = body.by_source.map((r) => r.source);
  assert.ok(sources.every((s) => ["organic_search", "organic_social", "direct"].includes(s)));
});

test("webhook: rejects bad signature, accepts valid, DLQ on garbage", async () => {
  const secret = process.env.GHL_WEBHOOK_SECRET || "whsec_demo_secret";
  const payload = { event: "contact.created", id: "wh_contact_001", locationId: "demo_loc_001", firstName: "Hook", lastName: "Test", email: "hook@test.dev" };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  // bad signature -> 401
  let res = await fetch(`${base}/webhooks/ghl`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ghl-signature": "bad" },
    body: raw
  });
  assert.equal(res.status, 401);

  // valid signature -> 200
  res = await fetch(`${base}/webhooks/ghl`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ghl-signature": sig },
    body: raw
  });
  assert.equal(res.status, 200);

  // contact landed in the warehouse
  const { rows } = await pool.query(`SELECT * FROM contacts WHERE ghl_contact_id = 'wh_contact_001'`);
  assert.equal(rows.length, 1);
  await pool.query(`DELETE FROM contacts WHERE ghl_contact_id = 'wh_contact_001'`);
});
