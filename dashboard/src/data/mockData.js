// Why: doc 04 static demo data — offline fallback so the demo never breaks (doc 06)
// MOCK DATA FOR ATTRIBUTION DASHBOARD DEMO
// Based on realistic education industry benchmarks
// (doc 04 static demo data — used as offline fallback when the API is unreachable)

export const executiveSummary = {
  period: { start: "2026-08-01", end: "2026-08-31" },
  summary: {
    total_marketing_spend: 22847.50,
    total_leads: 500,
    qualified_leads: 360,
    cost_per_lead: 45.70,
    appointments: 190,
    lead_to_appointment_rate: 38.0,
    check_ins: 133,
    appointment_to_checkin_rate: 70.0,
    consultations: 121,
    enrollments: 42,
    lead_to_enrollment_rate: 8.4,
    total_revenue: 672000,
    average_deal_value: 16000,
    cac: 544.00,
    roas: 29.4,
    roi_percentage: 2840,
    lost_leads: 423,
    lost_lead_percentage: 84.6
  },
  trend: [
    { date: "Aug 1", leads: 12, enrollments: 1, revenue: 16000, spend: 850 },
    { date: "Aug 2", leads: 15, enrollments: 0, revenue: 0, spend: 920 },
    { date: "Aug 3", leads: 18, enrollments: 1, revenue: 15000, spend: 780 },
    { date: "Aug 4", leads: 14, enrollments: 0, revenue: 0, spend: 810 },
    { date: "Aug 5", leads: 22, enrollments: 2, revenue: 32000, spend: 950 },
    { date: "Aug 6", leads: 19, enrollments: 1, revenue: 16000, spend: 880 },
    { date: "Aug 7", leads: 16, enrollments: 1, revenue: 18000, spend: 760 },
    { date: "Aug 8", leads: 20, enrollments: 2, revenue: 30000, spend: 1020 },
    { date: "Aug 9", leads: 24, enrollments: 1, revenue: 15000, spend: 1100 },
    { date: "Aug 10", leads: 18, enrollments: 2, revenue: 32000, spend: 890 },
    { date: "Aug 11", leads: 21, enrollments: 1, revenue: 16000, spend: 940 },
    { date: "Aug 12", leads: 17, enrollments: 0, revenue: 0, spend: 820 },
    { date: "Aug 13", leads: 25, enrollments: 2, revenue: 32000, spend: 1150 },
    { date: "Aug 14", leads: 14, enrollments: 1, revenue: 15000, spend: 780 },
    { date: "Aug 15", leads: 28, enrollments: 3, revenue: 48000, spend: 1200 },
    { date: "Aug 16", leads: 22, enrollments: 2, revenue: 30000, spend: 980 },
    { date: "Aug 17", leads: 19, enrollments: 1, revenue: 16000, spend: 890 },
    { date: "Aug 18", leads: 16, enrollments: 1, revenue: 18000, spend: 760 },
    { date: "Aug 19", leads: 20, enrollments: 2, revenue: 32000, spend: 920 },
    { date: "Aug 20", leads: 23, enrollments: 2, revenue: 30000, spend: 1050 },
    { date: "Aug 21", leads: 18, enrollments: 1, revenue: 15000, spend: 870 },
    { date: "Aug 22", leads: 15, enrollments: 1, revenue: 16000, spend: 790 },
    { date: "Aug 23", leads: 26, enrollments: 3, revenue: 48000, spend: 1180 },
    { date: "Aug 24", leads: 20, enrollments: 2, revenue: 32000, spend: 950 },
    { date: "Aug 25", leads: 17, enrollments: 1, revenue: 16000, spend: 840 },
    { date: "Aug 26", leads: 19, enrollments: 2, revenue: 30000, spend: 910 },
    { date: "Aug 27", leads: 22, enrollments: 1, revenue: 15000, spend: 980 },
    { date: "Aug 28", leads: 16, enrollments: 1, revenue: 18000, spend: 820 },
    { date: "Aug 29", leads: 14, enrollments: 0, revenue: 0, spend: 750 },
    { date: "Aug 30", leads: 18, enrollments: 2, revenue: 32000, spend: 890 },
    { date: "Aug 31", leads: 12, enrollments: 1, revenue: 16000, spend: 720 }
  ]
};

export const channelBreakdown = [
  { name: "Meta", spend: 15000.00, leads: 225, qualified_leads: 162, cpl: 66.67, appointments: 86, check_ins: 60, enrollments: 18, revenue: 288000, cac: 833.33, roas: 19.2, color: "#3b82f6", isLive: true },
  { name: "Google", spend: 7500.00, leads: 150, qualified_leads: 128, cpl: 50.00, appointments: 68, check_ins: 52, enrollments: 15, revenue: 240000, cac: 500.00, roas: 32.0, color: "#10b981", isLive: false },
  { name: "Referral", spend: 0, leads: 50, qualified_leads: 40, cpl: 0, appointments: 20, check_ins: 16, enrollments: 5, revenue: 75000, cac: 0, roas: null, color: "#a855f7", isLive: false },
  { name: "Organic Search", spend: 0, leads: 75, qualified_leads: 30, cpl: 0, appointments: 16, check_ins: 5, enrollments: 4, revenue: 69000, cac: 0, roas: null, color: "#f59e0b", isLive: false }
];

export const metaCampaigns = [
  { id: "camp_001", name: "Summer Enrollment 2026", spend: 8000.00, leads: 120, qualified_leads: 90, cpl: 66.67, appointments: 52, check_ins: 38, enrollments: 12, revenue: 192000, cac: 666.67, roas: 24.0, status: "active" },
  { id: "camp_002", name: "Fall Early Bird", spend: 5000.00, leads: 80, qualified_leads: 56, cpl: 62.50, appointments: 28, check_ins: 18, enrollments: 5, revenue: 80000, cac: 1000.00, roas: 16.0, status: "active" },
  { id: "camp_003", name: "Nursing Program Launch", spend: 6000.00, leads: 95, qualified_leads: 76, cpl: 63.16, appointments: 42, check_ins: 32, enrollments: 10, revenue: 160000, cac: 600.00, roas: 26.7, status: "active" },
  { id: "camp_004", name: "Healthcare Careers Fair", spend: 3000.00, leads: 40, qualified_leads: 24, cpl: 75.00, appointments: 12, check_ins: 6, enrollments: 1, revenue: 16000, cac: 3000.00, roas: 5.3, status: "paused" },
  { id: "camp_005", name: "Referral Program Boost", spend: 2000.00, leads: 35, qualified_leads: 28, cpl: 57.14, appointments: 16, check_ins: 12, enrollments: 4, revenue: 64000, cac: 500.00, roas: 32.0, status: "active" }
];

export const metaAdSets = {
  "camp_001": [
    { id: "aset_001", name: "Lookalike 1% - Enrolled Students", spend: 4800, leads: 72, enrollments: 9, revenue: 144000, roas: 30.0 },
    { id: "aset_002", name: "Interest: Healthcare Workers", spend: 3200, leads: 48, enrollments: 3, revenue: 48000, roas: 15.0 }
  ],
  "camp_002": [
    { id: "aset_003", name: "Retargeting - Website Visitors", spend: 5000, leads: 80, enrollments: 5, revenue: 80000, roas: 16.0 }
  ],
  "camp_003": [
    { id: "aset_004", name: "Nursing - Age 25-45", spend: 3600, leads: 60, enrollments: 7, revenue: 112000, roas: 31.1 },
    { id: "aset_005", name: "Nursing - Interest: Medical", spend: 2400, leads: 35, enrollments: 3, revenue: 48000, roas: 20.0 }
  ]
};

export const metaAds = {
  "aset_001": [
    { id: "ad_001", name: "Video V1 - Student Testimonial", spend: 3000, leads: 45, enrollments: 6, revenue: 96000, roas: 32.0, placement: "facebook_feed" },
    { id: "ad_002", name: "Carousel - Program Highlights", spend: 1800, leads: 27, enrollments: 3, revenue: 48000, roas: 26.7, placement: "instagram_feed" }
  ],
  "aset_002": [
    { id: "ad_003", name: "Image - Career Change", spend: 3200, leads: 48, enrollments: 3, revenue: 48000, roas: 15.0, placement: "facebook_feed" }
  ]
};

export const googleCampaigns = [
  { id: "gcamp_001", name: "Search - Nursing Programs", spend: 5000.00, leads: 80, qualified_leads: 72, cpl: 62.50, appointments: 42, check_ins: 34, enrollments: 10, revenue: 160000, cac: 500.00, roas: 32.0, status: "active" },
  { id: "gcamp_002", name: "Search - Medical Assistant", spend: 3500.00, leads: 55, qualified_leads: 44, cpl: 63.64, appointments: 22, check_ins: 16, enrollments: 4, revenue: 64000, cac: 875.00, roas: 18.3, status: "active" },
  { id: "gcamp_003", name: "Display - Healthcare Careers", spend: 2000.00, leads: 30, qualified_leads: 18, cpl: 66.67, appointments: 8, check_ins: 4, enrollments: 1, revenue: 16000, cac: 2000.00, roas: 8.0, status: "paused" },
  { id: "gcamp_004", name: "PMax - Enrollment 2026", spend: 4000.00, leads: 65, qualified_leads: 52, cpl: 61.54, appointments: 32, check_ins: 24, enrollments: 6, revenue: 96000, cac: 666.67, roas: 24.0, status: "active" }
];

export const googleKeywords = {
  "gcamp_001": [
    { text: "nursing school near me", match_type: "EXACT", cpl: 48.00, enroll_rate: 15.0, rev_per_lead: 2000 },
    { text: "practical nursing program", match_type: "EXACT", cpl: 52.00, enroll_rate: 12.5, rev_per_lead: 1800 },
    { text: "how to become a nurse", match_type: "PHRASE", cpl: 65.00, enroll_rate: 8.0, rev_per_lead: 1200 },
    { text: "nursing certification", match_type: "PHRASE", cpl: 70.00, enroll_rate: 6.5, rev_per_lead: 1000 }
  ],
  "gcamp_002": [
    { text: "medical assistant training", match_type: "EXACT", cpl: 55.00, enroll_rate: 10.0, rev_per_lead: 1500 },
    { text: "medical assistant program", match_type: "EXACT", cpl: 58.00, enroll_rate: 9.0, rev_per_lead: 1400 }
  ]
};

export const leadQualityMatrix = [
  { name: "Google - Nursing Search", platform: "google", cpl: 55.00, leads: 80, qualified_rate: 90.0, appointment_rate: 52.5, showup_rate: 81.0, enrollment_rate: 12.5, revenue_per_lead: 2000, roas: 36.4, quality_score: 9.8 },
  { name: "Meta - Lookalike 1%", platform: "meta", cpl: 45.00, leads: 72, qualified_rate: 85.0, appointment_rate: 55.6, showup_rate: 76.3, enrollment_rate: 10.5, revenue_per_lead: 1500, roas: 33.3, quality_score: 9.2 },
  { name: "Meta - Nursing Age 25-45", platform: "meta", cpl: 48.00, leads: 60, qualified_rate: 82.0, appointment_rate: 50.0, showup_rate: 78.6, enrollment_rate: 9.2, revenue_per_lead: 1400, roas: 29.2, quality_score: 8.7 },
  { name: "Meta - Fall Early Bird", platform: "meta", cpl: 50.00, leads: 80, qualified_rate: 70.0, appointment_rate: 35.0, showup_rate: 64.3, enrollment_rate: 6.3, revenue_per_lead: 1000, roas: 20.0, quality_score: 7.5 },
  { name: "Google - Medical Assistant", platform: "google", cpl: 58.00, leads: 55, qualified_rate: 80.0, appointment_rate: 40.0, showup_rate: 72.7, enrollment_rate: 7.3, revenue_per_lead: 1164, roas: 20.1, quality_score: 7.2 },
  { name: "Meta - Interest: Healthcare", platform: "meta", cpl: 60.00, leads: 48, qualified_rate: 65.0, appointment_rate: 31.3, showup_rate: 60.0, enrollment_rate: 4.2, revenue_per_lead: 500, roas: 8.3, quality_score: 5.1 },
  { name: "Meta - Careers Fair", platform: "meta", cpl: 75.00, leads: 40, qualified_rate: 60.0, appointment_rate: 30.0, showup_rate: 50.0, enrollment_rate: 2.5, revenue_per_lead: 400, roas: 5.3, quality_score: 4.2 }
];

export const lostLeadAnalysis = {
  summary: { total_lost: 423, lost_percentage: 84.6, total_potential_revenue: 6300000 },
  by_source: [
    { source: "Meta", lost: 212, percentage: 50.1 },
    { source: "Google", lost: 127, percentage: 30.0 },
    { source: "Referral", lost: 42, percentage: 9.9 },
    { source: "Organic", lost: 42, percentage: 9.9 }
  ],
  by_stage: [
    { stage: "Consultation", lost: 113, percentage: 26.7 },
    { stage: "New Lead", lost: 73, percentage: 17.3 },
    { stage: "Appointment", lost: 65, percentage: 15.4 },
    { stage: "Qualified", lost: 55, percentage: 13.0 },
    { stage: "FAFSA Applied", lost: 42, percentage: 9.9 },
    { stage: "Check-in", lost: 42, percentage: 9.9 },
    { stage: "Payment", lost: 21, percentage: 5.0 },
    { stage: "FAFSA Confirmed", lost: 12, percentage: 2.8 }
  ],
  by_reason: [
    { reason: "Price not suitable / No financing", count: 106, percentage: 25.0 },
    { reason: "Program not suitable", count: 85, percentage: 20.0 },
    { reason: "Not eligible for funding", count: 63, percentage: 15.0 },
    { reason: "Schedule not suitable", count: 42, percentage: 10.0 },
    { reason: "Not ready to start", count: 42, percentage: 10.0 },
    { reason: "Not responding", count: 32, percentage: 7.6 },
    { reason: "Chose another school", count: 21, percentage: 5.0 },
    { reason: "FAFSA not approved", count: 11, percentage: 2.6 },
    { reason: "Changed mind", count: 11, percentage: 2.6 },
    { reason: "Other", count: 11, percentage: 2.6 }
  ],
  by_source_and_reason: {
    "Meta": [
      { reason: "Not responding", count: 42, percentage: 19.8 },
      { reason: "Price not suitable / No financing", count: 38, percentage: 17.9 },
      { reason: "Program not suitable", count: 32, percentage: 15.1 },
      { reason: "Not eligible for funding", count: 28, percentage: 13.2 },
      { reason: "Schedule not suitable", count: 21, percentage: 9.9 }
    ],
    "Google": [
      { reason: "Price not suitable / No financing", count: 42, percentage: 33.1 },
      { reason: "Program not suitable", count: 32, percentage: 25.2 },
      { reason: "Not eligible for funding", count: 21, percentage: 16.5 },
      { reason: "Schedule not suitable", count: 14, percentage: 11.0 },
      { reason: "Not ready to start", count: 11, percentage: 8.7 }
    ]
  }
};

export const dailySalesReport = {
  date: "2026-08-25",
  call_center: [
    { user_id: "user_001", name: "Sarah Johnson", calls_made: 45, completed_dialogues_20s: 32, appointments_booked: 8, transfers: 3, cancellations: 1, check_ins: 5, show_up_rate: 62.5, hours_worked: 8.0 },
    { user_id: "user_002", name: "Mike Chen", calls_made: 38, completed_dialogues_20s: 28, appointments_booked: 6, transfers: 2, cancellations: 1, check_ins: 4, show_up_rate: 66.7, hours_worked: 7.5 },
    { user_id: "user_003", name: "Jessica Williams", calls_made: 42, completed_dialogues_20s: 30, appointments_booked: 7, transfers: 2, cancellations: 0, check_ins: 5, show_up_rate: 71.4, hours_worked: 8.0 }
  ],
  sales_managers: [
    { user_id: "user_010", name: "David Rodriguez", calls_attempted: 20, calls_completed: 15, appointments: 5, check_ins: 4, consultations_conducted: 3, trial_lessons: 1, fafsa_submitted: 2, fafsa_confirmed: 1, enrollments: 1, upsells: 0, sales_amount: 15000 },
    { user_id: "user_011", name: "Emily Thompson", calls_attempted: 25, calls_completed: 20, appointments: 6, check_ins: 5, consultations_conducted: 4, trial_lessons: 2, fafsa_submitted: 3, fafsa_confirmed: 2, enrollments: 2, upsells: 0, sales_amount: 30000 },
    { user_id: "user_012", name: "James Park", calls_attempted: 18, calls_completed: 14, appointments: 4, check_ins: 3, consultations_conducted: 3, trial_lessons: 1, fafsa_submitted: 2, fafsa_confirmed: 1, enrollments: 1, upsells: 1, sales_amount: 18000 }
  ]
};

export const funnelData = [
  { stage: "New Lead", count: 500, percentage: 100 },
  { stage: "Qualified", count: 360, percentage: 72 },
  { stage: "Appointment", count: 190, percentage: 38 },
  { stage: "Check-in", count: 133, percentage: 70 },
  { stage: "Consultation", count: 121, percentage: 91 },
  { stage: "FAFSA Applied", count: 42, percentage: 35 },
  { stage: "FAFSA Confirmed", count: 33, percentage: 79 },
  { stage: "Payment", count: 28, percentage: 85 },
  { stage: "Enrollment", count: 42, percentage: 100 },
  { stage: "Upsell", count: 6, percentage: 14 }
];
