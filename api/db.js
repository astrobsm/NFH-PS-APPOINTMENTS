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
      phone_number VARCHAR(20),
      visit_type VARCHAR(20) NOT NULL,
      visit_category VARCHAR(20) NOT NULL,
      reason TEXT,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add phone_number column if it doesn't exist (for existing deployments)
  await query(`
    DO $$ BEGIN
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS surgeries (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      age INTEGER NOT NULL,
      gender VARCHAR(10) NOT NULL,
      phone_number VARCHAR(20),
      surgery_type VARCHAR(100) NOT NULL,
      diagnosis TEXT,
      preferred_date DATE NOT NULL,
      surgeon_name VARCHAR(100),
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

module.exports = { pool, query, initTables };
