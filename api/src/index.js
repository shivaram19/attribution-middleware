const express = require("express");
const cors = require("cors");
const db = require("./db");
const { getRedis } = require("./redis");
const dashboardRoutes = require("./routes/dashboard");
const captureRoutes = require("./routes/capture");
const webhookRoutes = require("./routes/webhooks");

const app = express();

// CORS: allow the dashboard frontend origin (demo: reflect any origin)
app.use(cors());

// Capture raw body for webhook HMAC verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  })
);

// --- Auth: simple Bearer token for dashboard endpoints (spec 11.1) ---
function dashboardAuth(req, res, next) {
  const token = process.env.DASHBOARD_TOKEN || "demo-token";
  const header = req.headers.authorization || "";
  if (header !== `Bearer ${token}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// --- Health ---
app.get("/health", async (req, res) => {
  let postgres = "down";
  let redis = "down";
  try {
    await db.query("SELECT 1");
    postgres = "ok";
  } catch (e) { /* down */ }
  try {
    const client = await getRedis();
    await client.ping();
    redis = "ok";
  } catch (e) { /* down */ }
  res.status(postgres === "ok" && redis === "ok" ? 200 : 503).json({
    status: postgres === "ok" && redis === "ok" ? "ok" : "degraded",
    postgres,
    redis
  });
});

// --- Routes ---
app.use("/api/v1/dashboard", dashboardAuth, dashboardRoutes);
app.use("/api/v1/capture", captureRoutes);
app.use("/webhooks", webhookRoutes);

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error("[api]", err);
  res.status(500).json({ error: "internal_error", message: err.message });
});

const PORT = Number(process.env.DASHBOARD_API_PORT || 3100);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Attribution middleware API listening on :${PORT}`);
  });
}

module.exports = app;
