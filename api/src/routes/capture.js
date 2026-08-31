/**
 * First-Touch Attribution Capture Service (tech spec section 3).
 *
 * POST /api/v1/capture/first-touch
 *   Accepts UTM/gclid/fbclid params (query string or JSON body) plus a visitor
 *   fingerprint. Stores the record in Redis with a 90-day TTL as
 *   `attr:{fingerprint}`. First-touch fields are LOCKED: an existing key is
 *   never overwritten -- only latest_touch_* and visit_count are updated.
 *
 * GET /api/v1/capture/:fingerprint
 *   Returns the stored record (404 if unknown).
 */
const express = require("express");
const crypto = require("crypto");
const { getRedis } = require("../redis");

const router = express.Router();
const TTL_SECONDS = 7776000; // 90 days

function touchParams(req) {
  const src = { ...(req.query || {}), ...(req.body || {}) };
  const get = (k) => (src[k] === undefined || src[k] === null ? "" : String(src[k]));
  return { src, get };
}

router.post("/first-touch", async (req, res, next) => {
  try {
    const redis = await getRedis();
    const { src, get } = touchParams(req);

    const now = new Date().toISOString();
    const utmSource = get("utm_source") || get("source") || "direct";
    const utmCampaign = get("utm_campaign");

    // Fingerprint: explicit param > cookie > new uuid
    const fingerprint =
      get("fingerprint") || (req.headers.cookie || "").match(/_attr_fp=([^;]+)/)?.[1] || crypto.randomUUID();

    const key = `attr:${fingerprint}`;
    const existing = await redis.get(key);

    let record;
    if (existing) {
      // LOCK first-touch: never overwrite; only update latest-touch.
      record = JSON.parse(existing);
      record.latest_touch_source = utmSource;
      record.latest_touch_campaign = utmCampaign;
      record.latest_touch_date = now;
      record.visit_count = (record.visit_count || 1) + 1;
    } else {
      record = {
        fingerprint,
        first_touch_source: utmSource,
        first_touch_medium: get("utm_medium") || get("medium") || "none",
        first_touch_campaign: utmCampaign,
        first_touch_content: get("utm_content"),
        first_touch_term: get("utm_term"),
        first_touch_gclid: get("gclid"),
        first_touch_fbclid: get("fbclid"),
        first_touch_msclkid: get("msclkid"),
        first_touch_referrer: req.headers.referer || "",
        first_touch_landing_page: get("landing_page"),
        first_touch_date: now,
        first_touch_campaign_id: get("campaign_id"),
        first_touch_adset_id: get("adset_id"),
        first_touch_ad_id: get("ad_id"),
        first_touch_keyword: get("keyword"),
        first_touch_search_term: get("search_term"),
        first_touch_match_type: get("matchtype"),
        first_touch_placement: get("placement"),
        latest_touch_source: utmSource,
        latest_touch_campaign: utmCampaign,
        latest_touch_date: now,
        visit_count: 1
      };
    }

    await redis.setEx(key, TTL_SECONDS, JSON.stringify(record));

    // Log the attribution event (first touch vs return visit)
    await redis.lPush(
      "attribution_log",
      JSON.stringify({
        fingerprint,
        event: existing ? "return_visit" : "first_touch",
        timestamp: now
      })
    );

    res.status(existing ? 200 : 201).json({ fingerprint, is_new: !existing, data: record });
  } catch (err) {
    next(err);
  }
});

router.get("/:fingerprint", async (req, res, next) => {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`attr:${req.params.fingerprint}`);
    if (!raw) return res.status(404).json({ error: "fingerprint not found" });
    const ttl = await redis.ttl(`attr:${req.params.fingerprint}`);
    res.json({ fingerprint: req.params.fingerprint, ttl_seconds: ttl, data: JSON.parse(raw) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
