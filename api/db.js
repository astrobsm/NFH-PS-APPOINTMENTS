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

  await query(`
    CREATE TABLE IF NOT EXISTS ward_rounds (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      age INTEGER NOT NULL,
      gender VARCHAR(10) NOT NULL,
      phone_number VARCHAR(20),
      ward VARCHAR(100) NOT NULL,
      bed_number VARCHAR(20),
      diagnosis TEXT,
      planned_procedures JSONB NOT NULL,
      round_date DATE NOT NULL,
      round_time TIME,
      attending_doctor VARCHAR(100),
      notes TEXT,
      status VARCHAR(20) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Theatre booking master data: specialties & surgeons ──
  await query(`
    CREATE TABLE IF NOT EXISTS specialties (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS surgeons (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (full_name, specialty_id)
    )
  `);

  // Extend surgeries with theatre-booking fields (idempotent)
  await query(`
    DO $$ BEGIN
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS pre_op_planning JSONB;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS investigations JSONB;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS procedure_name VARCHAR(200);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS requirements JSONB;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS readiness_checklist JSONB;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS pre_op_education TEXT;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS post_op_education TEXT;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specialty_id INTEGER REFERENCES specialties(id) ON DELETE SET NULL;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_id INTEGER REFERENCES surgeons(id) ON DELETE SET NULL;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS theatre VARCHAR(20);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgery_class VARCHAR(20);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS slot_duration_hours INTEGER;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS slot_start TIMESTAMP;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS slot_end TIMESTAMP;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS has_extra_assistant BOOLEAN DEFAULT FALSE;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'ELECTIVE';
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS equipment_needed TEXT;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS ward VARCHAR(100);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS is_daycase BOOLEAN DEFAULT FALSE;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS needs_blood BOOLEAN DEFAULT FALSE;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS blood_units INTEGER;
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_type VARCHAR(100);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_name VARCHAR(150);
      ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS folder_number VARCHAR(50);
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  // Seed default specialties (idempotent — UNIQUE on name)
  const DEFAULT_SPECIALTIES = [
    'Obstetrics & Gynaecology (O/G)',
    'General Surgery',
    'Orthopaedics & Trauma',
    'Paediatric Surgery',
    'Plastic & Reconstructive Surgery',
    'Urology',
    'Neurosurgery',
    'Cardiothoracic Surgery',
    'ENT (Otorhinolaryngology)',
    'Ophthalmology',
    'Maxillofacial Surgery',
    'Dental Surgery',
  ];
  for (const name of DEFAULT_SPECIALTIES) {
    try {
      await query(
        `INSERT INTO specialties (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    } catch (e) { /* ignore */ }
  }
}

module.exports = { pool, query, initTables };
