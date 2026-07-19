const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment if your Postgres host requires SSL (e.g. most managed cloud DBs):
  // ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
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
