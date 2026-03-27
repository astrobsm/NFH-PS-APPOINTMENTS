const express = require('express');
const cors = require('cors');
const { query, initTables } = require('./db');
const { hashPassword, verifyPassword, createToken, requireAdmin } = require('./auth');
const { generateSchedulePDF } = require('./pdf');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize tables on first request
let tablesInitialized = false;
app.use(async (req, res, next) => {
  if (!tablesInitialized) {
    try {
      await initTables();
      tablesInitialized = true;
    } catch (e) {
      console.error('Failed to init tables:', e.message);
    }
  }
  next();
});

// ── Health check ──
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  let dbError = null;
  try {
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
    dbError = e.message;
  }
  res.json({
    status: 'ok',
    app: 'NFH PS-Consultation',
    runtime: 'node',
    database: dbStatus,
    db_error: dbError,
  });
});

// ── Helper: parse time string "HH:MM" or "HH:MM:SS" to minutes ──
function timeToMinutes(t) {
  const s = String(t).slice(0, 5);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// ── GET /api/slots?date=...&visit_type=... ──
app.get('/api/slots', async (req, res) => {
  try {
    const { date, visit_type } = req.query;
    if (!date || !visit_type) {
      return res.status(400).json({ detail: 'date and visit_type are required' });
    }
    if (!['wound_care', 'non_wound_care'].includes(visit_type)) {
      return res.status(400).json({ detail: 'Invalid visit type' });
    }

    const settingsResult = await query('SELECT * FROM settings LIMIT 1');
    if (settingsResult.rows.length === 0) {
      return res.status(503).json({ detail: 'Clinic not configured yet' });
    }
    const settings = settingsResult.rows[0];

    // Check clinic day
    const d = new Date(date + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[d.getDay()];

    const clinicDays = Array.isArray(settings.clinic_days) ? settings.clinic_days : JSON.parse(settings.clinic_days);
    if (!clinicDays.includes(dayName)) {
      return res.json([]);
    }

    // Check not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.json([]);
    }

    // Get existing appointments for this date
    const existingResult = await query(
      'SELECT start_time, end_time FROM appointments WHERE appointment_date = $1',
      [date]
    );

    const duration = visit_type === 'wound_care' ? 30 : 20;
    const sessions = [
      [timeToMinutes(settings.morning_start), timeToMinutes(settings.morning_end)],
      [timeToMinutes(settings.afternoon_start), timeToMinutes(settings.afternoon_end)],
    ];

    const slots = [];
    for (const [sessionStart, sessionEnd] of sessions) {
      let current = sessionStart;
      while (current + duration <= sessionEnd) {
        const slotStart = minutesToTime(current);
        const slotEnd = minutesToTime(current + duration);

        // Check overlap with existing appointments
        let available = true;
        for (const apt of existingResult.rows) {
          const aptStart = String(apt.start_time).slice(0, 5);
          const aptEnd = String(apt.end_time).slice(0, 5);
          if (slotStart < aptEnd && slotEnd > aptStart) {
            available = false;
            break;
          }
        }

        if (available) {
          slots.push({ start_time: slotStart, end_time: slotEnd });
        }
        current += duration;
      }
    }

    res.json(slots);
  } catch (e) {
    console.error('slots error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/appointments ──
app.post('/api/appointments', async (req, res) => {
  try {
    const { full_name, age, gender, phone_number, visit_type, visit_category, reason, appointment_date, start_time } = req.body;

    if (!full_name || age === undefined || !gender || !visit_type || !visit_category || !appointment_date || !start_time) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }
    if (!['wound_care', 'non_wound_care'].includes(visit_type)) {
      return res.status(400).json({ detail: 'Invalid visit type' });
    }
    if (!['first_time', 'follow_up'].includes(visit_category)) {
      return res.status(400).json({ detail: 'Invalid visit category' });
    }

    const settingsResult = await query('SELECT * FROM settings LIMIT 1');
    if (settingsResult.rows.length === 0) {
      return res.status(503).json({ detail: 'Clinic not configured yet' });
    }
    const settings = settingsResult.rows[0];

    // Validate clinic day
    const d = new Date(appointment_date + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[d.getDay()];
    const clinicDays = Array.isArray(settings.clinic_days) ? settings.clinic_days : JSON.parse(settings.clinic_days);
    if (!clinicDays.includes(dayName)) {
      return res.status(400).json({ detail: 'Clinic is not open on this day' });
    }

    // Validate not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.status(400).json({ detail: 'Cannot book appointments in the past' });
    }

    // Calculate end time
    const duration = visit_type === 'wound_care' ? 30 : 20;
    const startMins = timeToMinutes(start_time);
    const endTime = minutesToTime(startMins + duration);

    // Check overlapping appointments
    const startTimeStr = String(start_time).slice(0, 5) + ':00';
    const endTimeStr = endTime + ':00';

    const existingResult = await query(
      'SELECT start_time, end_time FROM appointments WHERE appointment_date = $1',
      [appointment_date]
    );

    for (const apt of existingResult.rows) {
      const aptStart = String(apt.start_time).slice(0, 5);
      const aptEnd = String(apt.end_time).slice(0, 5);
      const newStart = String(start_time).slice(0, 5);
      const newEnd = endTime;
      if (newStart < aptEnd && newEnd > aptStart) {
        return res.status(409).json({ detail: 'This time slot is no longer available' });
      }
    }

    const insertResult = await query(
      `INSERT INTO appointments (full_name, age, gender, phone_number, visit_type, visit_category, reason, appointment_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [full_name, parseInt(age), gender, phone_number || null, visit_type, visit_category, reason || null, appointment_date, startTimeStr, endTimeStr]
    );

    const row = insertResult.rows[0];
    res.json({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      visit_type: row.visit_type,
      visit_category: row.visit_category,
      reason: row.reason,
      appointment_date: formatDateISO(row.appointment_date),
      start_time: fmtTime(row.start_time),
      end_time: fmtTime(row.end_time),
    });
  } catch (e) {
    console.error('appointment error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/settings/status ──
app.get('/api/admin/settings/status', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as cnt FROM settings');
    res.json({ is_configured: parseInt(result.rows[0].cnt) > 0 });
  } catch (e) {
    console.error('settings status error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/admin/settings/setup ──
app.post('/api/admin/settings/setup', async (req, res) => {
  try {
    const { password, clinic_days } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT COUNT(*) as cnt FROM settings');
    if (parseInt(existing.rows[0].cnt) > 0) {
      return res.status(400).json({ detail: 'Admin already configured' });
    }

    const days = clinic_days || ['Monday', 'Wednesday', 'Friday'];
    const passwordHash = hashPassword(password);

    await query(
      `INSERT INTO settings (clinic_days, morning_start, morning_end, afternoon_start, afternoon_end, admin_password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [JSON.stringify(days), '09:00:00', '13:00:00', '13:30:00', '17:00:00', passwordHash]
    );

    res.json({ message: 'Admin setup complete' });
  } catch (e) {
    console.error('setup error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/admin/login ──
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ detail: 'Password is required' });
    }

    const result = await query('SELECT * FROM settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Admin not set up yet' });
    }

    const settings = result.rows[0];
    if (!verifyPassword(password, settings.admin_password_hash)) {
      return res.status(401).json({ detail: 'Invalid password' });
    }

    const token = createToken({ sub: 'admin' });
    res.json({ access_token: token, token_type: 'bearer' });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/settings (auth required) ──
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Settings not configured' });
    }
    const s = result.rows[0];
    res.json({
      clinic_days: Array.isArray(s.clinic_days) ? s.clinic_days : JSON.parse(s.clinic_days),
      morning_start: fmtTime(s.morning_start),
      morning_end: fmtTime(s.morning_end),
      afternoon_start: fmtTime(s.afternoon_start),
      afternoon_end: fmtTime(s.afternoon_end),
    });
  } catch (e) {
    console.error('get settings error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── PUT /api/admin/settings (auth required) ──
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Settings not configured' });
    }
    const current = result.rows[0];
    const { clinic_days, morning_start, morning_end, afternoon_start, afternoon_end, new_password } = req.body;

    const updatedDays = clinic_days !== undefined ? JSON.stringify(clinic_days) : JSON.stringify(current.clinic_days);
    const updatedMS = morning_start || fmtTimeFull(current.morning_start);
    const updatedME = morning_end || fmtTimeFull(current.morning_end);
    const updatedAS = afternoon_start || fmtTimeFull(current.afternoon_start);
    const updatedAE = afternoon_end || fmtTimeFull(current.afternoon_end);
    const updatedPW = new_password ? hashPassword(new_password) : current.admin_password_hash;

    await query(
      `UPDATE settings SET clinic_days = $1, morning_start = $2, morning_end = $3,
       afternoon_start = $4, afternoon_end = $5, admin_password_hash = $6 WHERE id = $7`,
      [updatedDays, updatedMS, updatedME, updatedAS, updatedAE, updatedPW, current.id]
    );

    res.json({ message: 'Settings updated' });
  } catch (e) {
    console.error('update settings error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/appointments (auth required) ──
app.get('/api/admin/appointments', requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    let result;
    if (date) {
      result = await query(
        'SELECT * FROM appointments WHERE appointment_date = $1 ORDER BY appointment_date, start_time',
        [date]
      );
    } else {
      result = await query('SELECT * FROM appointments ORDER BY appointment_date, start_time');
    }

    const appointments = result.rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      visit_type: row.visit_type,
      visit_category: row.visit_category,
      reason: row.reason,
      appointment_date: formatDateISO(row.appointment_date),
      start_time: fmtTime(row.start_time),
      end_time: fmtTime(row.end_time),
    }));

    res.json(appointments);
  } catch (e) {
    console.error('get appointments error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── DELETE /api/admin/appointments/:id (auth required) ──
app.delete('/api/admin/appointments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM appointments WHERE id = $1 RETURNING id', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted' });
  } catch (e) {
    console.error('delete appointment error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/admin/schedule-print?date=... (auth required) ──
app.post('/api/admin/schedule-print', requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ detail: 'date query parameter is required' });
    }

    const result = await query(
      'SELECT * FROM appointments WHERE appointment_date = $1 ORDER BY start_time',
      [date]
    );

    const appointments = result.rows.map(row => ({
      ...row,
      start_time: fmtTime(row.start_time),
      end_time: fmtTime(row.end_time),
    }));

    const pdfBuffer = await generateSchedulePDF(date, appointments);
    const pdfBase64 = pdfBuffer.toString('base64');

    res.json({
      filename: `schedule_${date}.pdf`,
      data: pdfBase64,
    });
  } catch (e) {
    console.error('schedule-print error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/surgeries ── (public: patient books a surgery)
app.post('/api/surgeries', async (req, res) => {
  try {
    const { full_name, age, gender, phone_number, surgery_type, diagnosis, preferred_date, notes } = req.body;

    if (!full_name || age === undefined || !gender || !surgery_type || !preferred_date) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }

    // Validate not in the past
    const d = new Date(preferred_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.status(400).json({ detail: 'Cannot schedule surgery in the past' });
    }

    const insertResult = await query(
      `INSERT INTO surgeries (full_name, age, gender, phone_number, surgery_type, diagnosis, preferred_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [full_name, parseInt(age), gender, phone_number || null, surgery_type, diagnosis || null, preferred_date, notes || null]
    );

    const row = insertResult.rows[0];
    res.json({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      surgery_type: row.surgery_type,
      diagnosis: row.diagnosis,
      preferred_date: formatDateISO(row.preferred_date),
      notes: row.notes,
      status: row.status,
    });
  } catch (e) {
    console.error('surgery booking error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/surgeries (auth required) ──
app.get('/api/admin/surgeries', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let result;
    if (status) {
      result = await query(
        'SELECT * FROM surgeries WHERE status = $1 ORDER BY preferred_date, created_at',
        [status]
      );
    } else {
      result = await query('SELECT * FROM surgeries ORDER BY preferred_date, created_at');
    }

    const surgeries = result.rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      surgery_type: row.surgery_type,
      diagnosis: row.diagnosis,
      preferred_date: formatDateISO(row.preferred_date),
      surgeon_name: row.surgeon_name,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
    }));

    res.json(surgeries);
  } catch (e) {
    console.error('get surgeries error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── PUT /api/admin/surgeries/:id (auth required) ──
app.put('/api/admin/surgeries/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, surgeon_name, preferred_date, notes } = req.body;

    const existing = await query('SELECT * FROM surgeries WHERE id = $1', [parseInt(id)]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ detail: 'Surgery booking not found' });
    }
    const current = existing.rows[0];

    const updatedStatus = status || current.status;
    const updatedSurgeon = surgeon_name !== undefined ? surgeon_name : current.surgeon_name;
    const updatedDate = preferred_date || formatDateISO(current.preferred_date);
    const updatedNotes = notes !== undefined ? notes : current.notes;

    await query(
      `UPDATE surgeries SET status = $1, surgeon_name = $2, preferred_date = $3, notes = $4 WHERE id = $5`,
      [updatedStatus, updatedSurgeon, updatedDate, updatedNotes, parseInt(id)]
    );

    res.json({ message: 'Surgery booking updated' });
  } catch (e) {
    console.error('update surgery error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── DELETE /api/admin/surgeries/:id (auth required) ──
app.delete('/api/admin/surgeries/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM surgeries WHERE id = $1 RETURNING id', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Surgery booking not found' });
    }
    res.json({ message: 'Surgery booking deleted' });
  } catch (e) {
    console.error('delete surgery error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── Helpers ──
function fmtTime(t) {
  if (!t) return '00:00';
  return String(t).slice(0, 5);
}

function fmtTimeFull(t) {
  if (!t) return '00:00:00';
  const s = String(t);
  return s.length >= 8 ? s.slice(0, 8) : s + ':00';
}

function formatDateISO(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return d.toISOString().split('T')[0];
  }
  return String(d).slice(0, 10);
}

// ── Local dev server ──
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8002;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
