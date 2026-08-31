const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://attribution:attribution_dev@localhost:5440/attribution_db",
  max: 10
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
