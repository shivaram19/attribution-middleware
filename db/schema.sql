-- ============================================================================
-- Marketing Attribution Middleware - Analytics Data Warehouse Schema
-- Source: attribution_middleware_tech_spec.md section 8.3 (+ 12.2 DLQ)
-- PostgreSQL 16
-- ============================================================================
-- NOTE: the spec used MySQL-style inline `INDEX name (col)` clauses inside
-- CREATE TABLE; those are converted here to standalone CREATE INDEX statements.
-- The materialized view from doc 02 references `first_touch_platform`; the
-- contacts table column is `first_touch_source`, so the view uses that.

-- ---------------------------------------------------------------------------
-- 8.3.1 Contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY,
    ghl_contact_id VARCHAR(255) UNIQUE NOT NULL,
    location_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    first_name VARCHAR(255),
    last_name VARCHAR(255),

    -- First Touch Attribution (LOCKED -- never updated)
    first_touch_source VARCHAR(100),
    first_touch_medium VARCHAR(100),
    first_touch_campaign VARCHAR(255),
    first_touch_content VARCHAR(255),
    first_touch_term VARCHAR(255),
    first_touch_gclid VARCHAR(255),
    first_touch_fbclid VARCHAR(255),
    first_touch_referrer TEXT,
    first_touch_landing_page TEXT,
    first_touch_date TIMESTAMP,
    first_touch_campaign_id VARCHAR(255),
    first_touch_adset_id VARCHAR(255),
    first_touch_ad_id VARCHAR(255),
    first_touch_keyword VARCHAR(255),
    first_touch_search_term VARCHAR(255),
    first_touch_match_type VARCHAR(50),
    first_touch_placement VARCHAR(100),

    -- Latest Touch Attribution (updated on each visit)
    latest_touch_source VARCHAR(100),
    latest_touch_campaign VARCHAR(255),
    latest_touch_date TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    attribution_fingerprint VARCHAR(255),
    tags TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_contacts_ghl_contact ON contacts (ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_campaign ON contacts (first_touch_campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_source ON contacts (first_touch_source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts (location_id);

-- ---------------------------------------------------------------------------
-- 8.3.2 Opportunities (Pipeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY,
    ghl_opportunity_id VARCHAR(255) UNIQUE NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    pipeline_id VARCHAR(255),
    stage_id VARCHAR(255),
    stage_name VARCHAR(255),
    status VARCHAR(50), -- open, won, lost
    name VARCHAR(255),
    monetary_value DECIMAL(12,2),
    assigned_to VARCHAR(255),

    -- Enrollment-specific fields
    initial_program VARCHAR(255),
    enrolled_program VARCHAR(255),
    payment_method VARCHAR(100), -- FAFSA, Grant, Out-of-pocket
    grant_amount DECIMAL(12,2),
    program_cost DECIMAL(12,2),
    fafsa_submitted_date TIMESTAMP,
    fafsa_confirmed_date TIMESTAMP,

    -- Lost lead tracking
    lost_reason VARCHAR(255),
    lost_stage VARCHAR(255),
    lost_date TIMESTAMP,

    -- Upsell tracking
    upsell_program VARCHAR(255),
    upsell_amount DECIMAL(12,2),
    upsell_date TIMESTAMP,

    -- Referral tracking
    referral_source_name VARCHAR(255),

    -- Review tracking
    review_requested BOOLEAN DEFAULT FALSE,
    review_date_requested TIMESTAMP,
    review_received BOOLEAN DEFAULT FALSE,
    review_platform VARCHAR(100),
    review_link TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_ghl_opp ON opportunities (ghl_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON opportunities (contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities (stage_name);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities (created_at);

-- ---------------------------------------------------------------------------
-- 8.3.3 Meta Campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_campaigns (
    id UUID PRIMARY KEY,
    campaign_id VARCHAR(255) UNIQUE NOT NULL,
    ad_account_id VARCHAR(255),
    name VARCHAR(255),
    status VARCHAR(50),
    objective VARCHAR(100),
    daily_budget BIGINT, -- in cents
    lifetime_budget BIGINT,
    bid_strategy VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_campaign_id ON meta_campaigns (campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_ad_account ON meta_campaigns (ad_account_id);

-- ---------------------------------------------------------------------------
-- 8.3.4 Meta Ad Sets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_adsets (
    id UUID PRIMARY KEY,
    adset_id VARCHAR(255) UNIQUE NOT NULL,
    campaign_id VARCHAR(255) REFERENCES meta_campaigns(campaign_id),
    name VARCHAR(255),
    status VARCHAR(50),
    daily_budget BIGINT,
    targeting JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_adsets_adset_id ON meta_adsets (adset_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_campaign ON meta_adsets (campaign_id);

-- ---------------------------------------------------------------------------
-- 8.3.5 Meta Ads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_ads (
    id UUID PRIMARY KEY,
    ad_id VARCHAR(255) UNIQUE NOT NULL,
    adset_id VARCHAR(255) REFERENCES meta_adsets(adset_id),
    campaign_id VARCHAR(255) REFERENCES meta_campaigns(campaign_id),
    name VARCHAR(255),
    status VARCHAR(50),
    creative JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_ad_id ON meta_ads (ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_adset ON meta_ads (adset_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_creative ON meta_ads USING GIN (creative);

-- ---------------------------------------------------------------------------
-- 8.3.6 Meta Insights
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_insights (
    id UUID PRIMARY KEY,
    campaign_id VARCHAR(255),
    adset_id VARCHAR(255),
    ad_id VARCHAR(255),
    date DATE,

    -- Delivery metrics
    impressions BIGINT,
    reach BIGINT,
    frequency DECIMAL(8,2),
    clicks BIGINT,
    link_clicks BIGINT,
    ctr DECIMAL(8,4),

    -- Cost metrics
    spend DECIMAL(12,2), -- in USD
    cpm DECIMAL(12,2),
    cpc DECIMAL(12,2),

    -- Conversion metrics
    leads BIGINT,
    cost_per_lead DECIMAL(12,2),
    conversions BIGINT,
    conversion_values DECIMAL(12,2),
    cost_per_conversion DECIMAL(12,2),

    -- Breakdowns
    publisher_platform VARCHAR(100),
    placement VARCHAR(100),
    device_platform VARCHAR(100),
    age VARCHAR(20),
    gender VARCHAR(20),
    country VARCHAR(10),

    -- Attribution window used
    attribution_window VARCHAR(50),

    fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_campaign_date ON meta_insights (campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_meta_insights_ad_date ON meta_insights (ad_id, date);
CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_insights (date);

-- ---------------------------------------------------------------------------
-- 8.3.7 Google Campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_campaigns (
    id UUID PRIMARY KEY,
    campaign_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id VARCHAR(255),
    name VARCHAR(255),
    status VARCHAR(50),
    advertising_channel_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_campaigns_campaign_id ON google_campaigns (campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_customer ON google_campaigns (customer_id);

-- ---------------------------------------------------------------------------
-- 8.3.8 Google Ad Groups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_ad_groups (
    id UUID PRIMARY KEY,
    ad_group_id VARCHAR(255) UNIQUE NOT NULL,
    campaign_id VARCHAR(255) REFERENCES google_campaigns(campaign_id),
    name VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_ad_groups_ad_group ON google_ad_groups (ad_group_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_campaign ON google_ad_groups (campaign_id);

-- ---------------------------------------------------------------------------
-- 8.3.9 Google Keywords
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_keywords (
    id UUID PRIMARY KEY,
    criterion_id VARCHAR(255) UNIQUE NOT NULL,
    ad_group_id VARCHAR(255) REFERENCES google_ad_groups(ad_group_id),
    campaign_id VARCHAR(255) REFERENCES google_campaigns(campaign_id),
    keyword_text VARCHAR(255),
    match_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_keywords_criterion ON google_keywords (criterion_id);
CREATE INDEX IF NOT EXISTS idx_google_keywords_ad_group ON google_keywords (ad_group_id);

-- ---------------------------------------------------------------------------
-- 8.3.10 Google Insights
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_insights (
    id UUID PRIMARY KEY,
    campaign_id VARCHAR(255),
    ad_group_id VARCHAR(255),
    criterion_id VARCHAR(255),
    date DATE,

    -- Delivery metrics
    impressions BIGINT,
    clicks BIGINT,
    ctr DECIMAL(8,4),

    -- Cost metrics
    cost_micros BIGINT,
    cost_usd DECIMAL(12,2),
    average_cpc DECIMAL(12,2),

    -- Conversion metrics
    conversions DECIMAL(12,2),
    conversions_value DECIMAL(12,2),
    cost_per_conversion DECIMAL(12,2),
    conversion_rate DECIMAL(8,4),

    -- Quality
    quality_score INT,
    search_impression_share DECIMAL(8,4),

    fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_insights_campaign_date ON google_insights (campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_google_insights_keyword_date ON google_insights (criterion_id, date);
CREATE INDEX IF NOT EXISTS idx_google_insights_date ON google_insights (date);

-- ---------------------------------------------------------------------------
-- 8.3.11 Search Terms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_search_terms (
    id UUID PRIMARY KEY,
    campaign_id VARCHAR(255),
    ad_group_id VARCHAR(255),
    search_term VARCHAR(255),
    date DATE,

    impressions BIGINT,
    clicks BIGINT,
    cost_micros BIGINT,
    cost_usd DECIMAL(12,2),
    conversions DECIMAL(12,2),
    conversions_value DECIMAL(12,2),

    fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_terms_campaign_date ON google_search_terms (campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_search_terms_search_term ON google_search_terms (search_term);

-- ---------------------------------------------------------------------------
-- 8.3.12 Attributions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attributions (
    id UUID PRIMARY KEY,
    opportunity_id UUID REFERENCES opportunities(id),
    contact_id UUID REFERENCES contacts(id),

    -- Deal info
    enrollment_date TIMESTAMP,
    deal_value DECIMAL(12,2),

    -- Attribution model
    attribution_model VARCHAR(50), -- first_touch, last_touch, linear

    -- Platform data
    platform VARCHAR(50), -- meta, google, organic, referral
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),

    -- Meta-specific
    adset_id VARCHAR(255),
    adset_name VARCHAR(255),
    ad_id VARCHAR(255),
    ad_name VARCHAR(255),
    placement VARCHAR(100),

    -- Google-specific
    ad_group_id VARCHAR(255),
    ad_group_name VARCHAR(255),
    keyword VARCHAR(255),
    search_term VARCHAR(255),
    match_type VARCHAR(50),

    -- Calculated metrics
    ad_spend DECIMAL(12,2),
    cac DECIMAL(12,2),
    roas DECIMAL(8,2),

    created_at TIMESTAMP DEFAULT NOW(),

    -- Enables webhook upsert (ON CONFLICT) on opportunity status change
    CONSTRAINT uq_attribution_opp_model UNIQUE (opportunity_id, attribution_model)
);

CREATE INDEX IF NOT EXISTS idx_attributions_opportunity ON attributions (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_attributions_contact ON attributions (contact_id);
CREATE INDEX IF NOT EXISTS idx_attributions_campaign ON attributions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_attributions_platform ON attributions (platform);
CREATE INDEX IF NOT EXISTS idx_attributions_enrollment_date ON attributions (enrollment_date);

-- ---------------------------------------------------------------------------
-- 8.3.13 Daily Sales Reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_sales_reports (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    role VARCHAR(50), -- call_center, sales_manager

    -- Call Center Metrics
    calls_made INT DEFAULT 0,
    completed_dialogues_20s INT DEFAULT 0,
    appointments_booked INT DEFAULT 0,
    transfers INT DEFAULT 0,
    cancellations INT DEFAULT 0,
    check_ins INT DEFAULT 0,
    show_up_rate DECIMAL(5,2),
    hours_worked DECIMAL(5,2),

    -- Sales Manager Metrics
    calls_attempted INT DEFAULT 0,
    calls_completed INT DEFAULT 0,
    consultations_conducted INT DEFAULT 0,
    trial_lessons INT DEFAULT 0,
    fafsa_submitted INT DEFAULT 0,
    fafsa_confirmed INT DEFAULT 0,
    enrollments INT DEFAULT 0,
    upsells INT DEFAULT 0,
    sales_amount DECIMAL(12,2),

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_daily_sales_date_user UNIQUE (date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales_reports (date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_user ON daily_sales_reports (user_id);

-- ---------------------------------------------------------------------------
-- 12.2 Dead Letter Queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id UUID PRIMARY KEY,
    source VARCHAR(100), -- ghl, meta, google
    operation VARCHAR(255),
    payload JSONB,
    error_message TEXT,
    error_code VARCHAR(100),
    retry_count INT DEFAULT 0,
    status VARCHAR(50), -- pending, resolved, failed
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue (status);
CREATE INDEX IF NOT EXISTS idx_dlq_source ON dead_letter_queue (source);

-- ---------------------------------------------------------------------------
-- Materialized view: daily campaign performance (from doc 02, adapted to use
-- contacts.first_touch_source since the schema has no first_touch_platform)
-- Refresh with: REFRESH MATERIALIZED VIEW mv_daily_campaign_performance;
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_campaign_performance AS
SELECT
  DATE(o.closed_at) AS date,
  c.first_touch_source AS platform,
  c.first_touch_campaign_id AS campaign_id,
  COUNT(*) AS enrollments,
  SUM(o.monetary_value) AS revenue
FROM contacts c
JOIN opportunities o ON c.id = o.contact_id
WHERE o.status = 'won'
GROUP BY DATE(o.closed_at), c.first_touch_source, c.first_touch_campaign_id;

CREATE INDEX IF NOT EXISTS idx_mv_daily ON mv_daily_campaign_performance(date, platform);

-- ============================================================================
-- SEED: static campaign structure (matches generator/mock_data_generator.py
-- constants). Insights tables stay empty until the generator runs.
-- ============================================================================

INSERT INTO meta_campaigns (id, campaign_id, ad_account_id, name, status, objective, daily_budget, bid_strategy) VALUES
  (gen_random_uuid(), 'camp_001', 'act_demo_001', 'Summer Enrollment 2026', 'ACTIVE', 'LEAD_GENERATION', 800000, 'LOWEST_COST_WITHOUT_CAP'),
  (gen_random_uuid(), 'camp_002', 'act_demo_001', 'Fall Early Bird', 'ACTIVE', 'LEAD_GENERATION', 500000, 'LOWEST_COST_WITHOUT_CAP'),
  (gen_random_uuid(), 'camp_003', 'act_demo_001', 'Nursing Program Launch', 'ACTIVE', 'CONVERSIONS', 600000, 'LOWEST_COST_WITHOUT_CAP'),
  (gen_random_uuid(), 'camp_004', 'act_demo_001', 'Healthcare Careers Fair', 'ACTIVE', 'AWARENESS', 300000, 'LOWEST_COST_WITHOUT_CAP'),
  (gen_random_uuid(), 'camp_005', 'act_demo_001', 'Referral Program Boost', 'ACTIVE', 'LEAD_GENERATION', 200000, 'LOWEST_COST_WITHOUT_CAP')
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO meta_adsets (id, adset_id, campaign_id, name, status, targeting) VALUES
  (gen_random_uuid(), 'aset_001', 'camp_001', 'Lookalike 1% - Enrolled Students', 'ACTIVE', '{"type": "lookalike"}'),
  (gen_random_uuid(), 'aset_002', 'camp_001', 'Interest: Healthcare Workers', 'ACTIVE', '{"type": "interest"}'),
  (gen_random_uuid(), 'aset_003', 'camp_002', 'Retargeting - Website Visitors', 'ACTIVE', '{"type": "retargeting"}'),
  (gen_random_uuid(), 'aset_004', 'camp_003', 'Nursing - Age 25-45', 'ACTIVE', '{"age_min": 25, "age_max": 45}'),
  (gen_random_uuid(), 'aset_005', 'camp_003', 'Nursing - Interest: Medical', 'ACTIVE', '{"type": "interest"}'),
  (gen_random_uuid(), 'aset_006', 'camp_004', 'Broad - Healthcare Interest', 'ACTIVE', '{"type": "broad"}'),
  (gen_random_uuid(), 'aset_007', 'camp_005', 'Referral - Existing Students', 'ACTIVE', '{"type": "custom_audience"}')
ON CONFLICT (adset_id) DO NOTHING;

INSERT INTO meta_ads (id, ad_id, adset_id, campaign_id, name, status, creative) VALUES
  (gen_random_uuid(), 'ad_001', 'aset_001', 'camp_001', 'Video V1 - Student Testimonial', 'ACTIVE', '{"placement": "facebook_feed", "object_type": "VIDEO"}'),
  (gen_random_uuid(), 'ad_002', 'aset_001', 'camp_001', 'Carousel - Program Highlights', 'ACTIVE', '{"placement": "instagram_feed"}'),
  (gen_random_uuid(), 'ad_003', 'aset_002', 'camp_001', 'Image - Career Change', 'ACTIVE', '{"placement": "facebook_feed"}'),
  (gen_random_uuid(), 'ad_004', 'aset_003', 'camp_002', 'Video - Limited Time Offer', 'ACTIVE', '{"placement": "instagram_stories", "object_type": "VIDEO"}'),
  (gen_random_uuid(), 'ad_005', 'aset_004', 'camp_003', 'Image - Nursing Salary', 'ACTIVE', '{"placement": "facebook_feed"}'),
  (gen_random_uuid(), 'ad_006', 'aset_005', 'camp_003', 'Video - Day in the Life', 'ACTIVE', '{"placement": "instagram_reels", "object_type": "VIDEO"}'),
  (gen_random_uuid(), 'ad_007', 'aset_006', 'camp_004', 'Image - Open House Invite', 'ACTIVE', '{"placement": "facebook_feed"}'),
  (gen_random_uuid(), 'ad_008', 'aset_007', 'camp_005', 'Image - Refer & Earn', 'ACTIVE', '{"placement": "facebook_feed"}')
ON CONFLICT (ad_id) DO NOTHING;

INSERT INTO google_campaigns (id, campaign_id, customer_id, name, status, advertising_channel_type) VALUES
  (gen_random_uuid(), 'gcamp_001', 'cust_demo_001', 'Search - Nursing Programs', 'ENABLED', 'SEARCH'),
  (gen_random_uuid(), 'gcamp_002', 'cust_demo_001', 'Search - Medical Assistant', 'ENABLED', 'SEARCH'),
  (gen_random_uuid(), 'gcamp_003', 'cust_demo_001', 'Display - Healthcare Careers', 'ENABLED', 'DISPLAY'),
  (gen_random_uuid(), 'gcamp_004', 'cust_demo_001', 'PMax - Enrollment 2026', 'ENABLED', 'PERFORMANCE_MAX')
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO google_ad_groups (id, ad_group_id, campaign_id, name, status) VALUES
  (gen_random_uuid(), 'gag_001', 'gcamp_001', 'Nursing Keywords - Exact', 'ENABLED'),
  (gen_random_uuid(), 'gag_002', 'gcamp_001', 'Nursing Keywords - Phrase', 'ENABLED'),
  (gen_random_uuid(), 'gag_003', 'gcamp_002', 'Medical Assistant - Exact', 'ENABLED'),
  (gen_random_uuid(), 'gag_004', 'gcamp_003', 'Display - Healthcare Audience', 'ENABLED'),
  (gen_random_uuid(), 'gag_005', 'gcamp_004', 'PMax - All Products', 'ENABLED')
ON CONFLICT (ad_group_id) DO NOTHING;

INSERT INTO google_keywords (id, criterion_id, ad_group_id, campaign_id, keyword_text, match_type) VALUES
  (gen_random_uuid(), 'gk_001', 'gag_001', 'gcamp_001', 'nursing school near me', 'EXACT'),
  (gen_random_uuid(), 'gk_002', 'gag_001', 'gcamp_001', 'practical nursing program', 'EXACT'),
  (gen_random_uuid(), 'gk_003', 'gag_002', 'gcamp_001', 'how to become a nurse', 'PHRASE'),
  (gen_random_uuid(), 'gk_004', 'gag_002', 'gcamp_001', 'nursing certification', 'PHRASE'),
  (gen_random_uuid(), 'gk_005', 'gag_003', 'gcamp_002', 'medical assistant training', 'EXACT'),
  (gen_random_uuid(), 'gk_006', 'gag_003', 'gcamp_002', 'medical assistant program', 'EXACT')
ON CONFLICT (criterion_id) DO NOTHING;
