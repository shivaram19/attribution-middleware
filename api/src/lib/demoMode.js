/**
 * Demo-mode labeling per validated doc 06 (Google Ads Demo Strategy).
 *
 * For the demo, Meta data is treated as "live" (Meta Marketing API v25) while
 * Google Ads data is MOCK/simulated (Google Ads API v24 approval takes days to
 * weeks). Dashboard responses label each Google row as simulated so the UI can
 * show the "Demo Data" badge recommended by doc 06.
 */
const DEMO_MODE = {
  meta: process.env.DEMO_MODE_META || "live", // Meta Marketing API v25
  google: process.env.DEMO_MODE_GOOGLE || "mock", // Google Ads API v24 — mock until API approval
  labelMockData: true
};

/** Label for dashboard responses: "live" | "simulated" | "organic".
 *  Non-paid channels (referral, organic_*, direct) are labeled "organic" —
 *  they are neither live ad-platform data nor simulated ad data. */
function dataSource(platform) {
  const mode = DEMO_MODE[platform];
  if (mode === "mock") return "simulated";
  if (mode) return mode;
  return "organic";
}

module.exports = { DEMO_MODE, dataSource };
