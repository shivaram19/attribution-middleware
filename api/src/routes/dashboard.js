/**
 * Dashboard API routes (tech spec section 9.2).
 * All endpoints: GET, Bearer token auth, optional start_date/end_date/location_id filters.
 */
const express = require("express");
const db = require("../db");
const { DEMO_MODE, dataSource } = require("../lib/demoMode");

const router = express.Router();

// Funnel stage ordering as a SQL CASE fragment (column alias: ord)
const STAGE_ORD = `CASE o.stage_name
  WHEN 'new_lead' THEN 0 WHEN 'qualified' THEN 1 WHEN 'appointment' THEN 2
  WHEN 'check_in' THEN 3 WHEN 'consultation' THEN 4 WHEN 'fafsa_applied' THEN 5
  WHEN 'fafsa_confirmed' THEN 6 WHEN 'payment' THEN 7 WHEN 'enrollment' THEN 8
  WHEN 'upsell' THEN 9 ELSE 0 END`;

function filters(req) {
  return [req.query.start_date || null, req.query.end_date || null, req.query.location_id || null];
}

// Global platform filter (All / Meta / Google / Organic) -> first_touch_source
// condition. Whitelisted values only (safe to interpolate).
function sourceSql(platform, alias = "c") {
  if (platform === "meta" || platform === "google") return `${alias}.first_touch_source = '${platform}'`;
  if (platform === "organic") return `${alias}.first_touch_source IN ('organic_search','organic_social','direct')`;
  return "TRUE";
}

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const r2 = (v) => Math.round(num(v) * 100) / 100;
const r1 = (v) => Math.round(num(v) * 10) / 10;
const div = (a, b) => (b ? a / b : 0);

// ---------------------------------------------------------------------------
// 9.2.1 Executive Dashboard
// ---------------------------------------------------------------------------
router.get("/executive", async (req, res, next) => {
  try {
    const args = filters(req);
    const platform = req.query.platform || null;
    const srcCond = sourceSql(platform, "c");
    const includeMeta = !platform || platform === "all" || platform === "meta";
    const includeGoogle = !platform || platform === "all" || platform === "google";
    const { rows } = await db.query(
      `
      WITH c AS (
        SELECT * FROM contacts c
        WHERE ($1::date IS NULL OR c.created_at::date >= $1::date)
          AND ($2::date IS NULL OR created_at::date <= $2::date)
          AND ($3::text IS NULL OR location_id = $3)
          AND ${srcCond}
      ),
      o AS (
        SELECT o.*, ${STAGE_ORD} AS ord
        FROM opportunities o JOIN c ON c.id = o.contact_id
      ),
      spend AS (
        SELECT
          ${includeMeta ? `COALESCE((SELECT SUM(spend) FROM meta_insights mi
            WHERE ($1::date IS NULL OR mi.date >= $1::date)
              AND ($2::date IS NULL OR mi.date <= $2::date)), 0)` : "0"}
        + ${includeGoogle ? `COALESCE((SELECT SUM(cost_usd) FROM google_insights gi
            WHERE ($1::date IS NULL OR gi.date >= $1::date)
              AND ($2::date IS NULL OR gi.date <= $2::date)), 0)` : "0"} AS total
      )
      SELECT
        (SELECT total FROM spend)::float AS total_marketing_spend,
        (SELECT COUNT(*) FROM c)::int AS total_leads,
        COUNT(*) FILTER (WHERE o.ord >= 1)::int AS qualified_leads,
        COUNT(*) FILTER (WHERE o.ord >= 2)::int AS appointments,
        COUNT(*) FILTER (WHERE o.ord >= 3)::int AS check_ins,
        COUNT(*) FILTER (WHERE o.ord >= 4)::int AS consultations,
        COUNT(*) FILTER (WHERE o.status = 'won')::int AS enrollments,
        COALESCE(SUM(o.monetary_value) FILTER (WHERE o.status = 'won'), 0)::float AS total_revenue,
        COUNT(*) FILTER (WHERE o.status = 'lost')::int AS lost_leads
      FROM o
      `,
      args
    );

    const trendLeads = await db.query(
      `SELECT created_at::date AS date, COUNT(*)::int AS leads
       FROM contacts c
       WHERE ($1::date IS NULL OR c.created_at::date >= $1::date)
         AND ($2::date IS NULL OR created_at::date <= $2::date)
         AND ($3::text IS NULL OR location_id = $3)
         AND ${srcCond}
       GROUP BY 1`,
      args
    );
    const trendWon = await db.query(
      `SELECT closed_at::date AS date, COUNT(*)::int AS enrollments,
              COALESCE(SUM(monetary_value), 0)::float AS revenue
       FROM opportunities o JOIN contacts c ON c.id = o.contact_id
       WHERE o.status = 'won' AND o.closed_at IS NOT NULL
         AND ($1::date IS NULL OR o.closed_at::date >= $1::date)
         AND ($2::date IS NULL OR o.closed_at::date <= $2::date)
         AND ${srcCond}
       GROUP BY 1`,
      [args[0], args[1]]
    );

    const trendMap = new Map();
    for (const r of trendLeads.rows) trendMap.set(r.date.toISOString().slice(0, 10), { leads: r.leads });
    for (const r of trendWon.rows) {
      const k = r.date.toISOString().slice(0, 10);
      trendMap.set(k, { ...(trendMap.get(k) || {}), enrollments: r.enrollments, revenue: r.revenue });
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({
        date,
        leads: v.leads || 0,
        enrollments: v.enrollments || 0,
        revenue: r2(v.revenue || 0)
      }));

    const s = rows[0];
    const spend = num(s.total_marketing_spend);
    const revenue = num(s.total_revenue);

    res.json({
      period: { start: req.query.start_date || null, end: req.query.end_date || null },
      demo_mode: { meta: DEMO_MODE.meta, google: DEMO_MODE.google, labelMockData: DEMO_MODE.labelMockData },
      summary: {
        total_marketing_spend: r2(spend),
        total_leads: s.total_leads,
        qualified_leads: s.qualified_leads,
        cost_per_lead: r2(div(spend, s.total_leads)),
        appointments: s.appointments,
        lead_to_appointment_rate: r1(div(s.appointments, s.total_leads) * 100),
        check_ins: s.check_ins,
        appointment_to_checkin_rate: r1(div(s.check_ins, s.appointments) * 100),
        consultations: s.consultations,
        enrollments: s.enrollments,
        lead_to_enrollment_rate: r1(div(s.enrollments, s.total_leads) * 100),
        total_revenue: r2(revenue),
        average_deal_value: r2(div(revenue, s.enrollments)),
        cac: r2(div(spend, s.enrollments)),
        roas: r1(div(revenue, spend)),
        roi_percentage: Math.round(div(revenue - spend, spend) * 100),
        lost_leads: s.lost_leads,
        lost_lead_percentage: r1(div(s.lost_leads, s.total_leads) * 100)
      },
      trend
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 9.2.2 Channel Breakdown
// ---------------------------------------------------------------------------
router.get("/channel", async (req, res, next) => {
  try {
    const args = filters(req);
    const { rows } = await db.query(
      `
      WITH c AS (
        SELECT * FROM contacts
        WHERE ($1::date IS NULL OR created_at::date >= $1::date)
          AND ($2::date IS NULL OR created_at::date <= $2::date)
          AND ($3::text IS NULL OR location_id = $3)
      ),
      o AS (
        SELECT o.*, c.first_touch_source AS source, ${STAGE_ORD} AS ord
        FROM opportunities o JOIN c ON c.id = o.contact_id
      )
      SELECT
        CASE WHEN source = 'meta' THEN 'Meta'
             WHEN source = 'google' THEN 'Google'
             WHEN source = 'referral' THEN 'Referral'
             ELSE 'Organic' END AS name,
        source AS raw_source,
        COUNT(*)::int AS leads,
        COUNT(*) FILTER (WHERE ord >= 1)::int AS qualified_leads,
        COUNT(*) FILTER (WHERE ord >= 2)::int AS appointments,
        COUNT(*) FILTER (WHERE ord >= 3)::int AS check_ins,
        COUNT(*) FILTER (WHERE status = 'won')::int AS enrollments,
        COALESCE(SUM(monetary_value) FILTER (WHERE status = 'won'), 0)::float AS revenue
      FROM o
      GROUP BY 1, 2
      `,
      args
    );
    const spendRows = await db.query(
      `SELECT
         COALESCE((SELECT SUM(spend) FROM meta_insights mi
           WHERE ($1::date IS NULL OR mi.date >= $1::date)
             AND ($2::date IS NULL OR mi.date <= $2::date)), 0)::float AS meta_spend,
         COALESCE((SELECT SUM(cost_usd) FROM google_insights gi
           WHERE ($1::date IS NULL OR gi.date >= $1::date)
             AND ($2::date IS NULL OR gi.date <= $2::date)), 0)::float AS google_spend`,
      [args[0], args[1]]
    );

    const spendByChannel = {
      Meta: num(spendRows.rows[0].meta_spend),
      Google: num(spendRows.rows[0].google_spend),
      Referral: 0,
      Organic: 0
    };
    const order = ["Meta", "Google", "Referral", "Organic"];
    const byName = new Map();
    for (const r of rows) {
      // merge organic_search / organic_social / direct into "Organic"
      const cur = byName.get(r.name) || {
        name: r.name, leads: 0, qualified_leads: 0, appointments: 0,
        check_ins: 0, enrollments: 0, revenue: 0
      };
      cur.leads += r.leads;
      cur.qualified_leads += r.qualified_leads;
      cur.appointments += r.appointments;
      cur.check_ins += r.check_ins;
      cur.enrollments += r.enrollments;
      cur.revenue += num(r.revenue);
      byName.set(r.name, cur);
    }

    const channels = order
      .filter((name) => byName.has(name))
      .map((name) => {
        const c = byName.get(name);
        const spend = spendByChannel[name];
        return {
          name,
          data_source: dataSource(name.toLowerCase()), // doc 06: Google = simulated
          spend: r2(spend),
          leads: c.leads,
          qualified_leads: c.qualified_leads,
          cpl: r2(div(spend, c.leads)),
          appointments: c.appointments,
          check_ins: c.check_ins,
          enrollments: c.enrollments,
          revenue: r2(c.revenue),
          cac: r2(div(spend, c.enrollments)),
          roas: spend ? r1(div(c.revenue, spend)) : null
        };
      });

    res.json({ channels });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 9.2.3 Campaign Drill-Down
//
// NOTE: the generator produces campaign-level insights only, so adset/ad level
// spend is allocated proportionally to each child entity's share of the
// campaign's leads (Meta) or attributed revenue (Google). This is a demo
// approximation -- a real sync would pull adset/ad-level insights from the
// Meta/Google APIs.
// ---------------------------------------------------------------------------

async function campaignMetrics(platform, campaignId, args) {
  const [start, end] = args;
  const spendSql =
    platform === "meta"
      ? `SELECT COALESCE(SUM(spend),0)::float AS spend, COALESCE(SUM(leads),0)::int AS tracked_leads
         FROM meta_insights WHERE campaign_id = $1
           AND ($2::date IS NULL OR date >= $2::date) AND ($3::date IS NULL OR date <= $3::date)`
      : `SELECT COALESCE(SUM(cost_usd),0)::float AS spend, COALESCE(SUM(conversions),0)::int AS tracked_leads
         FROM google_insights WHERE campaign_id = $1
           AND ($2::date IS NULL OR date >= $2::date) AND ($3::date IS NULL OR date <= $3::date)`;
  const spend = (await db.query(spendSql, [campaignId, start, end])).rows[0];

  const funnel = (
    await db.query(
      `SELECT COUNT(*)::int AS leads,
              COUNT(*) FILTER (WHERE ${STAGE_ORD} >= 1)::int AS qualified_leads,
              COUNT(*) FILTER (WHERE ${STAGE_ORD} >= 2)::int AS appointments,
              COUNT(*) FILTER (WHERE ${STAGE_ORD} >= 3)::int AS check_ins,
              COUNT(*) FILTER (WHERE o.status = 'won')::int AS enrollments,
              COALESCE(SUM(o.monetary_value) FILTER (WHERE o.status = 'won'), 0)::float AS revenue
       FROM contacts c JOIN opportunities o ON o.contact_id = c.id
       WHERE c.first_touch_campaign_id = $1
         AND ($2::date IS NULL OR c.created_at::date >= $2::date)
         AND ($3::date IS NULL OR c.created_at::date <= $3::date)`,
      [campaignId, start, end]
    )
  ).rows[0];

  return { spend: num(spend.spend), ...funnel, revenue: num(funnel.revenue) };
}

function shapeCampaign(id, name, platform, m) {
  return {
    id,
    name,
    platform,
    data_source: dataSource(platform), // doc 06: Google = simulated (demo data)
    spend: r2(m.spend),
    leads: m.leads,
    qualified_leads: m.qualified_leads,
    cpl: r2(div(m.spend, m.leads)),
    appointments: m.appointments,
    check_ins: m.check_ins,
    enrollments: m.enrollments,
    conversion_rate: r1(div(m.enrollments, m.leads) * 100),
    revenue: r2(m.revenue),
    cac: r2(div(m.spend, m.enrollments)),
    roas: r1(div(m.revenue, m.spend))
  };
}

router.get("/campaign", async (req, res, next) => {
  try {
    const args = filters(req);
    const [start, end] = args;
    const platform = req.query.platform || "meta";
    const campaignId = req.query.campaign_id || null;

    if (platform === "meta") {
      if (!campaignId) {
        // List all campaigns with headline metrics
        const camps = (await db.query(`SELECT campaign_id, name FROM meta_campaigns ORDER BY campaign_id`)).rows;
        const campaigns = [];
        for (const c of camps) {
          const m = await campaignMetrics("meta", c.campaign_id, args);
          campaigns.push(shapeCampaign(c.campaign_id, c.name, "meta", m));
        }
        return res.json({ campaigns });
      }

      const campRow = (await db.query(`SELECT name FROM meta_campaigns WHERE campaign_id = $1`, [campaignId])).rows[0];
      const m = await campaignMetrics("meta", campaignId, args);
      const campaign = shapeCampaign(campaignId, campRow ? campRow.name : campaignId, "meta", m);

      // Ad sets: leads from contacts, enrollments/revenue from attributions,
      // spend allocated by share of campaign leads (see NOTE above).
      const adsets = (
        await db.query(
          `SELECT a.adset_id AS id, a.name,
                  COALESCE(l.leads, 0)::int AS leads,
                  COALESCE(t.enrollments, 0)::int AS enrollments,
                  COALESCE(t.revenue, 0)::float AS revenue
           FROM meta_adsets a
           LEFT JOIN (
             SELECT first_touch_adset_id AS id, COUNT(*) AS leads
             FROM contacts
             WHERE ($2::date IS NULL OR created_at::date >= $2::date)
               AND ($3::date IS NULL OR created_at::date <= $3::date)
             GROUP BY 1
           ) l ON l.id = a.adset_id
           LEFT JOIN (
             SELECT adset_id AS id, COUNT(*) AS enrollments, SUM(deal_value) AS revenue
             FROM attributions
             WHERE ($2::date IS NULL OR enrollment_date::date >= $2::date)
               AND ($3::date IS NULL OR enrollment_date::date <= $3::date)
             GROUP BY 1
           ) t ON t.id = a.adset_id
           WHERE a.campaign_id = $1
           ORDER BY a.adset_id`,
          [campaignId, start, end]
        )
      ).rows.map((a) => {
        const spend = div(m.spend * a.leads, m.leads);
        return {
          id: a.id, name: a.name, spend: r2(spend), leads: a.leads,
          enrollments: a.enrollments, revenue: r2(a.revenue),
          roas: r1(div(a.revenue, spend))
        };
      });

      const ads = (
        await db.query(
          `SELECT a.ad_id AS id, a.adset_id, a.name, a.creative->>'placement' AS placement,
                  COALESCE(l.leads, 0)::int AS leads,
                  COALESCE(t.enrollments, 0)::int AS enrollments,
                  COALESCE(t.revenue, 0)::float AS revenue
           FROM meta_ads a
           LEFT JOIN (
             SELECT first_touch_ad_id AS id, COUNT(*) AS leads
             FROM contacts
             WHERE ($2::date IS NULL OR created_at::date >= $2::date)
               AND ($3::date IS NULL OR created_at::date <= $3::date)
             GROUP BY 1
           ) l ON l.id = a.ad_id
           LEFT JOIN (
             SELECT ad_id AS id, COUNT(*) AS enrollments, SUM(deal_value) AS revenue
             FROM attributions
             WHERE ($2::date IS NULL OR enrollment_date::date >= $2::date)
               AND ($3::date IS NULL OR enrollment_date::date <= $3::date)
             GROUP BY 1
           ) t ON t.id = a.ad_id
           WHERE a.campaign_id = $1
           ORDER BY a.ad_id`,
          [campaignId, start, end]
        )
      ).rows.map((a) => {
        const spend = div(m.spend * a.leads, m.leads);
        return {
          id: a.id, adset_id: a.adset_id, name: a.name, spend: r2(spend), leads: a.leads,
          enrollments: a.enrollments, revenue: r2(a.revenue),
          roas: r1(div(a.revenue, spend)), placement: a.placement
        };
      });

      return res.json({ campaign, adsets, ads });
    }

    // platform === "google"
    if (!campaignId) {
      const camps = (await db.query(`SELECT campaign_id, name FROM google_campaigns ORDER BY campaign_id`)).rows;
      const campaigns = [];
      for (const c of camps) {
        const m = await campaignMetrics("google", c.campaign_id, args);
        campaigns.push(shapeCampaign(c.campaign_id, c.name, "google", m));
      }
      return res.json({ campaigns });
    }

    const campRow = (await db.query(`SELECT name FROM google_campaigns WHERE campaign_id = $1`, [campaignId])).rows[0];
    const m = await campaignMetrics("google", campaignId, args);
    const campaign = shapeCampaign(campaignId, campRow ? campRow.name : campaignId, "google", m);

    const adGroups = (
      await db.query(
        `SELECT g.ad_group_id AS id, g.name,
                COALESCE(t.enrollments, 0)::int AS enrollments,
                COALESCE(t.revenue, 0)::float AS revenue
         FROM google_ad_groups g
         LEFT JOIN (
           SELECT ad_group_id AS id, COUNT(*) AS enrollments, SUM(deal_value) AS revenue
           FROM attributions WHERE campaign_id = $1
             AND ($2::date IS NULL OR enrollment_date::date >= $2::date)
             AND ($3::date IS NULL OR enrollment_date::date <= $3::date)
           GROUP BY 1
         ) t ON t.id = g.ad_group_id
         WHERE g.campaign_id = $1
         ORDER BY g.ad_group_id`,
        [campaignId, start, end]
      )
    ).rows.map((g) => {
      // spend allocated by share of attributed revenue (see NOTE above)
      const spend = div(m.spend * g.revenue, m.revenue);
      return {
        id: g.id, name: g.name, spend: r2(spend),
        enrollments: g.enrollments, revenue: r2(g.revenue),
        roas: r1(div(g.revenue, spend))
      };
    });

    const keywords = (
      await db.query(
        `SELECT k.criterion_id AS id, k.keyword_text AS keyword, k.match_type,
                COALESCE(t.enrollments, 0)::int AS enrollments,
                COALESCE(t.revenue, 0)::float AS revenue
         FROM google_keywords k
         LEFT JOIN (
           SELECT keyword, COUNT(*) AS enrollments, SUM(deal_value) AS revenue
           FROM attributions WHERE campaign_id = $1 AND keyword <> ''
             AND ($2::date IS NULL OR enrollment_date::date >= $2::date)
             AND ($3::date IS NULL OR enrollment_date::date <= $3::date)
           GROUP BY 1
         ) t ON t.keyword = k.keyword_text
         WHERE k.campaign_id = $1
         ORDER BY k.criterion_id`,
        [campaignId, start, end]
      )
    ).rows.map((k) => {
      const spend = div(m.spend * k.revenue, m.revenue);
      return {
        id: k.id, keyword: k.keyword, match_type: k.match_type, spend: r2(spend),
        enrollments: k.enrollments, revenue: r2(k.revenue),
        roas: r1(div(k.revenue, spend))
      };
    });

    return res.json({ campaign, ad_groups: adGroups, keywords });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 9.2.4 Lead Quality Matrix
//
// Quality score (documented demo formula, 0-10):
//   quality_score = min(10, round1(
//       4 * min(enrollment_rate, 15) / 15      -- enrollment rate, 40% weight
//     + 3 * min(roas, 35) / 35                 -- ROAS, 30% weight
//     + 3 * min(revenue_per_lead, 2000) / 2000 -- revenue per lead, 30% weight
//   ))
// ---------------------------------------------------------------------------
router.get("/quality", async (req, res, next) => {
  try {
    const args = filters(req);
    const [start, end] = args;
    const campaigns = [];

    const metaCamps = (await db.query(`SELECT campaign_id, name FROM meta_campaigns ORDER BY campaign_id`)).rows;
    for (const c of metaCamps) campaigns.push({ ...c, platform: "meta" });
    const googleCamps = (await db.query(`SELECT campaign_id, name FROM google_campaigns ORDER BY campaign_id`)).rows;
    for (const c of googleCamps) campaigns.push({ ...c, platform: "google" });

    const out = [];
    for (const c of campaigns) {
      const m = await campaignMetrics(c.platform, c.campaign_id, args);
      const cpl = div(m.spend, m.leads);
      const enrollmentRate = div(m.enrollments, m.leads) * 100;
      const revenuePerLead = div(m.revenue, m.leads);
      const roas = div(m.revenue, m.spend);
      const qualityScore = Math.min(
        10,
        r1(
          (4 * Math.min(enrollmentRate, 15)) / 15 +
            (3 * Math.min(roas, 35)) / 35 +
            (3 * Math.min(revenuePerLead, 2000)) / 2000
        )
      );
      out.push({
        name: c.name,
        platform: c.platform,
        data_source: dataSource(c.platform), // doc 06 labeling
        cpl: r2(cpl),
        leads: m.leads,
        qualified_rate: r1(div(m.qualified_leads, m.leads) * 100),
        appointment_rate: r1(div(m.appointments, m.leads) * 100),
        showup_rate: r1(div(m.check_ins, m.appointments) * 100),
        enrollment_rate: r1(enrollmentRate),
        revenue_per_lead: r2(revenuePerLead),
        roas: r1(roas),
        quality_score: qualityScore
      });
    }

    out.sort((a, b) => b.quality_score - a.quality_score);
    res.json({ campaigns: out });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 9.2.5 Lost Lead Analysis
// ---------------------------------------------------------------------------
router.get("/lost-leads", async (req, res, next) => {
  try {
    const args = filters(req);
    const source = req.query.source || null;
    const stage = req.query.stage || null;

    const where = `
      FROM opportunities o JOIN contacts c ON c.id = o.contact_id
      WHERE o.status = 'lost'
        AND ($1::date IS NULL OR c.created_at::date >= $1::date)
        AND ($2::date IS NULL OR c.created_at::date <= $2::date)
        AND ($3::text IS NULL OR c.location_id = $3)
        AND ($4::text IS NULL
             OR ($4::text = 'organic' AND c.first_touch_source IN ('organic_search','organic_social','direct'))
             OR ($4::text <> 'organic' AND c.first_touch_source = $4))
        AND ($5::text IS NULL OR o.lost_stage = $5)`;
    const params = [...args, source, stage];

    const summary = (
      await db.query(
        `SELECT COUNT(*)::int AS total_lost,
                COALESCE(SUM(o.program_cost), 0)::float AS total_potential_revenue,
                (SELECT COUNT(*) FROM contacts c2
                  WHERE ($1::date IS NULL OR c2.created_at::date >= $1::date)
                    AND ($2::date IS NULL OR c2.created_at::date <= $2::date)
                    AND ($3::text IS NULL OR c2.location_id = $3))::int AS total_leads
         ${where}`,
        params
      )
    ).rows[0];

    const bySource = (
      await db.query(
        `SELECT c.first_touch_source AS source, COUNT(*)::int AS lost ${where}
         GROUP BY 1 ORDER BY lost DESC`,
        params
      )
    ).rows;
    const byStage = (
      await db.query(
        `SELECT o.lost_stage AS stage, COUNT(*)::int AS lost ${where}
         GROUP BY 1 ORDER BY lost DESC`,
        params
      )
    ).rows;
    const byReason = (
      await db.query(
        `SELECT o.lost_reason AS reason, COUNT(*)::int AS count ${where}
         GROUP BY 1 ORDER BY count DESC`,
        params
      )
    ).rows;

    const total = summary.total_lost || 1;
    res.json({
      summary: {
        total_lost: summary.total_lost,
        lost_percentage: r1(div(summary.total_lost, summary.total_leads) * 100),
        total_potential_revenue: r2(summary.total_potential_revenue)
      },
      by_source: bySource.map((r) => ({ source: r.source, lost: r.lost, percentage: r1((r.lost / total) * 100) })),
      by_stage: byStage.map((r) => ({ stage: r.stage, lost: r.lost, percentage: r1((r.lost / total) * 100) })),
      by_reason: byReason.map((r) => ({ reason: r.reason, count: r.count, percentage: r1((r.count / total) * 100) }))
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 9.2.6 Daily Sales Report
// ---------------------------------------------------------------------------
router.get("/daily-sales", async (req, res, next) => {
  try {
    const date = req.query.date || null;
    const { rows } = await db.query(
      `SELECT * FROM daily_sales_reports
       WHERE date = COALESCE($1::date, (SELECT MAX(date) FROM daily_sales_reports))
       ORDER BY user_id`,
      [date]
    );

    const call_center = [];
    const sales_managers = [];
    for (const r of rows) {
      if (r.role === "call_center") {
        call_center.push({
          user_id: r.user_id,
          name: r.user_name,
          calls_made: r.calls_made,
          completed_dialogues_20s: r.completed_dialogues_20s,
          appointments_booked: r.appointments_booked,
          transfers: r.transfers,
          cancellations: r.cancellations,
          check_ins: r.check_ins,
          show_up_rate: num(r.show_up_rate),
          hours_worked: num(r.hours_worked)
        });
      } else {
        sales_managers.push({
          user_id: r.user_id,
          name: r.user_name,
          calls_attempted: r.calls_attempted,
          calls_completed: r.calls_completed,
          appointments: r.appointments_booked,
          check_ins: r.check_ins,
          consultations_conducted: r.consultations_conducted,
          trial_lessons: r.trial_lessons,
          fafsa_submitted: r.fafsa_submitted,
          fafsa_confirmed: r.fafsa_confirmed,
          enrollments: r.enrollments,
          upsells: r.upsells,
          sales_amount: num(r.sales_amount)
        });
      }
    }

    res.json({
      date: rows.length ? rows[0].date.toISOString().slice(0, 10) : date,
      call_center,
      sales_managers
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
