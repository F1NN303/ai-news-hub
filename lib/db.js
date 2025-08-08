// /lib/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // für Neon/Vercel
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
