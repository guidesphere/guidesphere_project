// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: +(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "guidesphere",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "gs",
});

pool.query("SELECT 1")
  .then(() => console.log("🔗 Conexión a PostgreSQL exitosa"))
  .catch(err => console.error("❌ Error conectando a PostgreSQL:", err.message));

module.exports = { pool };
