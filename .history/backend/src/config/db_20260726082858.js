const { Pool } = require('pg');
require('dotenv').config();

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon, Render Postgres, and most managed hosts require SSL; local Postgres normally doesn't.
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client (server kept running):', err.message);
});

/** Runs a parameterized query. Always use $1, $2... placeholders — never string-concat SQL. */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log('SQL', { text, duration: Date.now() - start, rows: res.rowCount });
  }
  return res;
}

/** For multi-statement transactions: const client = await getClient(); ... client.release(); */
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };