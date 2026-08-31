/**
 * GHL Webhook Receiver (tech spec section 4.3 + doc 01 verification snippet).
 *
 * POST /webhooks/ghl
 *   - HMAC-SHA256 signature verification (x-ghl-signature header) with
 *     crypto.timingSafeEqual. Skipped only if GHL_WEBHOOK_SECRET is unset.
 *   - Handles contact.created/updated, opportunity.created/stage_changed/
 *     status_changed, appointment.booked, form.submitted.
 *   - On opportunity won: upsert into attributions (first_touch model).
 *   - Processing failures are pushed to the dead_letter_queue table.
 */
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { retryWithBackoff } = require("../lib/retry");

const router = express.Router();

function verifyGHLWebhook(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(String(signature || ""), "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

async function toDeadLetter(source, operation, payload, error) {
  try {
    await db.query(
      `INSERT INTO dead_letter_queue (id, source, operation, payload, error_message, error_code, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending')`,
      [source, operation, JSON.stringify(payload), error.message, error.code || "UNKNOWN"]
    );
  } catch (dlqErr) {
    console.error("[webhooks] failed to write to dead_letter_queue:", dlqErr.message);
  }
}

// Custom fields arrive as [{key, value}] or an object -- normalize to a map.
function customFieldMap(body) {
  const cf = body.customFields || body.customField || [];
  const map = {};
  if (Array.isArray(cf)) {
    for (const f of cf) map[f.key || f.fieldKey] = f.value;
  } else {
    Object.assign(map, cf);
  }
  return map;
}

async function handleContactCreatedOrUpdated(p) {
  const cf = customFieldMap(p);
  const contactId = p.contact_id || p.id || p.contactId;
  await db.query(
    `INSERT INTO contacts (id, ghl_contact_id, location_id, email, phone, first_name, last_name,
        first_touch_source, first_touch_campaign, first_touch_campaign_id, first_touch_date,
        latest_touch_source, latest_touch_campaign, latest_touch_date, attribution_fingerprint, tags)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $7, $8, $10, $11, $12)
     ON CONFLICT (ghl_contact_id) DO UPDATE SET
        email = EXCLUDED.email, phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
        latest_touch_source = EXCLUDED.latest_touch_source,
        latest_touch_campaign = EXCLUDED.latest_touch_campaign,
        latest_touch_date = EXCLUDED.latest_touch_date,
        updated_at = NOW()`,
    [
      contactId,
      p.locationId || p.location_id || "",
      p.email || null,
      p.phone || null,
      p.firstName || p.first_name || null,
      p.lastName || p.last_name || null,
      cf.first_touch_source || null,
      cf.first_touch_campaign || null,
      cf.first_touch_campaign_id || null,
      cf.first_touch_date ? new Date(cf.first_touch_date) : new Date(),
      cf.attribution_fingerprint || p.attribution_fingerprint || null,
      Array.isArray(p.tags) ? p.tags : []
    ]
  );
}

async function upsertOpportunity(p) {
  const cf = customFieldMap(p);
  const oppId = p.opportunity_id || p.id || p.opportunityId;
  const contactGhlId = p.contact_id || p.contactId;
  const contact = contactGhlId
    ? (await db.query(`SELECT id FROM contacts WHERE ghl_contact_id = $1`, [contactGhlId])).rows[0]
    : null;

  const status = p.status || "open";
  const stageName = p.pipelineStage || p.stage_name || p.stageName || null;

  const result = await db.query(
    `INSERT INTO opportunities (id, ghl_opportunity_id, contact_id, pipeline_id, stage_id,
        stage_name, status, name, monetary_value, assigned_to, enrolled_program,
        payment_method, program_cost, lost_reason, lost_stage, closed_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (ghl_opportunity_id) DO UPDATE SET
        stage_id = COALESCE(EXCLUDED.stage_id, opportunities.stage_id),
        stage_name = COALESCE(EXCLUDED.stage_name, opportunities.stage_name),
        status = EXCLUDED.status,
        monetary_value = COALESCE(EXCLUDED.monetary_value, opportunities.monetary_value),
        lost_reason = COALESCE(EXCLUDED.lost_reason, opportunities.lost_reason),
        lost_stage = COALESCE(EXCLUDED.lost_stage, opportunities.lost_stage),
        closed_at = COALESCE(EXCLUDED.closed_at, opportunities.closed_at),
        updated_at = NOW()
     RETURNING id, contact_id, status, monetary_value`,
    [
      oppId,
      contact ? contact.id : null,
      p.pipelineId || p.pipeline_id || null,
      p.pipelineStageId || p.stage_id || null,
      stageName,
      status,
      p.name || oppId,
      p.monetaryValue ?? p.monetary_value ?? null,
      p.assignedTo || p.assigned_to || null,
      cf.enrolled_program || null,
      cf.payment_method || null,
      cf.program_cost ? Number(cf.program_cost) : null,
      cf.lost_reason || null,
      cf.lost_stage || stageName,
      status === "won" || status === "lost" ? new Date() : null
    ]
  );
  return result.rows[0];
}

async function recordAttributionForWon(oppRow) {
  if (!oppRow || !oppRow.contact_id) return;
  const contact = (
    await db.query(`SELECT * FROM contacts WHERE id = $1`, [oppRow.contact_id])
  ).rows[0];
  if (!contact) return;

  const platform = contact.first_touch_source;
  const campaignId = contact.first_touch_campaign_id;
  let adSpend = 0;

  // Simplified CAC: campaign spend / campaign leads (same approach as generator)
  if (platform === "meta" && campaignId) {
    const r = (
      await db.query(
        `SELECT COALESCE(SUM(spend),0)::float AS spend, COALESCE(SUM(leads),0)::int AS leads
         FROM meta_insights WHERE campaign_id = $1`,
        [campaignId]
      )
    ).rows[0];
    adSpend = r.leads ? r.spend / r.leads : 0;
  } else if (platform === "google" && campaignId) {
    const r = (
      await db.query(
        `SELECT COALESCE(SUM(cost_usd),0)::float AS spend, COALESCE(SUM(conversions),0)::int AS leads
         FROM google_insights WHERE campaign_id = $1`,
        [campaignId]
      )
    ).rows[0];
    adSpend = r.leads ? r.spend / r.leads : 0;
  }

  const dealValue = Number(oppRow.monetary_value || 0);
  const roas = adSpend > 0 ? dealValue / adSpend : 0;

  await db.query(
    `INSERT INTO attributions (id, opportunity_id, contact_id, enrollment_date, deal_value,
        attribution_model, platform, campaign_id, campaign_name, adset_id, ad_id, ad_name,
        placement, keyword, search_term, match_type, ad_spend, cac, roas)
     VALUES (gen_random_uuid(), $1, $2, NOW(), $3, 'first_touch', $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $14, $15)
     ON CONFLICT (opportunity_id, attribution_model) DO UPDATE SET
        deal_value = EXCLUDED.deal_value, ad_spend = EXCLUDED.ad_spend,
        cac = EXCLUDED.cac, roas = EXCLUDED.roas`,
    [
      oppRow.id,
      contact.id,
      dealValue,
      platform || null,
      campaignId || null,
      contact.first_touch_campaign || null,
      contact.first_touch_adset_id || null,
      contact.first_touch_ad_id || null,
      contact.first_touch_content || null,
      contact.first_touch_placement || null,
      contact.first_touch_keyword || null,
      contact.first_touch_search_term || null,
      contact.first_touch_match_type || null,
      Math.round(adSpend * 100) / 100,
      Math.round(roas * 100) / 100
    ]
  );
}

router.post("/ghl", async (req, res) => {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  const signature = req.headers["x-ghl-signature"];
  const rawBody = req.rawBody || JSON.stringify(req.body || {});

  // HMAC-SHA256 verification (skipped only when no secret is configured)
  if (secret) {
    if (!signature || !verifyGHLWebhook(rawBody, signature, secret)) {
      return res.status(401).json({ error: "invalid webhook signature" });
    }
  }

  const payload = req.body || {};
  const event = payload.event || payload.type || "unknown";

  // Ack immediately-ish; process with retry, failures go to the DLQ.
  try {
    await retryWithBackoff(async () => {
      switch (event) {
        case "contact.created":
        case "contact.updated":
          await handleContactCreatedOrUpdated(payload);
          break;
        case "opportunity.created":
        case "opportunity.stage_changed":
          await upsertOpportunity(payload);
          break;
        case "opportunity.status_changed": {
          const opp = await upsertOpportunity(payload);
          if ((payload.status || "").toLowerCase() === "won") {
            await recordAttributionForWon(opp);
          }
          break;
        }
        case "appointment.booked":
        case "appointment.checked_in":
        case "form.submitted":
          // Demo: acknowledge only (metrics derive from warehouse tables)
          break;
        default:
          console.log(`[webhooks] unhandled event: ${event}`);
      }
    }, `webhook:${event}`);
  } catch (err) {
    console.error(`[webhooks] ${event} failed:`, err.message);
    await toDeadLetter("ghl", event, payload, err);
  }

  res.status(200).send("OK");
});

module.exports = router;
module.exports.verifyGHLWebhook = verifyGHLWebhook;
