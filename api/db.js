const { Pool } = require('pg');
let pool = null;

function getPool() {
  if (pool) return pool;
  const cs = process.env.DATABASE_URL;
  if (!cs) return null; // kein DB-Setup -> Fallback
  pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  return pool;
}

module.exports = {
  query: async (text, params) => {
    const p = getPool();
    if (!p) throw new Error('NO_DB');
    return p.query(text, params);
  },
  hasDb: () => !!getPool()
};
