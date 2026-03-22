const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
if (DATABASE_URL && !DATABASE_URL.startsWith('sqlite')) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
}

async function query(text, params) {
  if (!pool) throw new Error('No database configured');
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initTables() {
  if (!pool) return;

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      clinic_days JSONB NOT NULL,
      morning_start TIME NOT NULL,
      morning_end TIME NOT NULL,
      afternoon_start TIME NOT NULL,
      afternoon_end TIME NOT NULL,
      admin_password_hash VARCHAR(255) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      age INTEGER NOT NULL,
      gender VARCHAR(10) NOT NULL,
      visit_type VARCHAR(20) NOT NULL,
      visit_category VARCHAR(20) NOT NULL,
      reason TEXT,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

module.exports = { pool, query, initTables };
