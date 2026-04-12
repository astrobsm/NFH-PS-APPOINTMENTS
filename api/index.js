const express = require('express');
const cors = require('cors');
const { query, initTables } = require('./db');
const { hashPassword, verifyPassword, createToken, requireAdmin } = require('./auth');
const { generateSchedulePDF, generateSurgeryBookingPDF } = require('./pdf');

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

// ── GET /api/patients?q=... ── (public: search returning patients by name)
app.get('/api/patients', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }
    const search = `%${q.trim()}%`;
    // Union distinct patients from appointments and surgeries, most recent first
    const result = await query(
      `SELECT full_name, age, gender, phone_number, MAX(created_at) as last_visit FROM (
         SELECT full_name, age, gender, phone_number, created_at FROM appointments
         UNION ALL
         SELECT full_name, age, gender, phone_number, created_at FROM surgeries
       ) AS all_patients
       WHERE full_name ILIKE $1
       GROUP BY full_name, age, gender, phone_number
       ORDER BY MAX(created_at) DESC
       LIMIT 10`,
      [search]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('patient search error:', e);
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
    const {
      full_name, age, gender, phone_number, surgery_type, diagnosis, preferred_date, notes,
      procedure_name, pre_op_planning, investigations, requirements, readiness_checklist,
      pre_op_education, post_op_education
    } = req.body;

    if (!full_name || age === undefined || !gender || !preferred_date) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }
    if (!surgery_type && !procedure_name) {
      return res.status(400).json({ detail: 'Procedure name is required' });
    }

    // Validate not in the past
    const d = new Date(preferred_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      return res.status(400).json({ detail: 'Cannot schedule surgery in the past' });
    }

    const insertResult = await query(
      `INSERT INTO surgeries (
        full_name, age, gender, phone_number, surgery_type, diagnosis, preferred_date, notes, status,
        procedure_name, pre_op_planning, investigations, requirements, readiness_checklist,
        pre_op_education, post_op_education
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        full_name, parseInt(age), gender, phone_number || null,
        surgery_type || procedure_name, diagnosis || null, preferred_date, notes || null,
        procedure_name || surgery_type || null,
        pre_op_planning ? JSON.stringify(pre_op_planning) : null,
        investigations ? JSON.stringify(investigations) : null,
        requirements ? JSON.stringify(requirements) : null,
        readiness_checklist ? JSON.stringify(readiness_checklist) : null,
        pre_op_education || null,
        post_op_education || null,
      ]
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
      procedure_name: row.procedure_name,
      pre_op_planning: row.pre_op_planning,
      investigations: row.investigations,
      requirements: row.requirements,
      readiness_checklist: row.readiness_checklist,
      pre_op_education: row.pre_op_education,
      post_op_education: row.post_op_education,
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
      procedure_name: row.procedure_name,
      pre_op_planning: row.pre_op_planning,
      investigations: row.investigations,
      requirements: row.requirements,
      readiness_checklist: row.readiness_checklist,
      pre_op_education: row.pre_op_education,
      post_op_education: row.post_op_education,
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

// ── POST /api/surgery-education ── (generate AI-aided patient education)
app.post('/api/surgery-education', async (req, res) => {
  try {
    const { procedure_name, diagnosis } = req.body;
    if (!procedure_name) {
      return res.status(400).json({ detail: 'Procedure name is required' });
    }
    const education = generateSurgeryEducation(procedure_name, diagnosis);
    res.json(education);
  } catch (e) {
    console.error('surgery education error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/surgery-pdf/:id ── (generate surgery booking PDF)
app.get('/api/admin/surgery-pdf/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM surgeries WHERE id = $1', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Surgery booking not found' });
    }
    const surg = result.rows[0];
    const pdfBuffer = await generateSurgeryBookingPDF(surg);
    const pdfBase64 = pdfBuffer.toString('base64');
    res.json({
      filename: `surgery_booking_${surg.id}_${formatDateISO(surg.preferred_date)}.pdf`,
      data: pdfBase64,
    });
  } catch (e) {
    console.error('surgery-pdf error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── POST /api/ward-rounds ── (admin-only: schedule a ward round)
app.post('/api/ward-rounds', requireAdmin, async (req, res) => {
  try {
    const { full_name, age, gender, phone_number, ward, bed_number, diagnosis, planned_procedures, round_date, round_time, attending_doctor, notes } = req.body;

    if (!full_name || age === undefined || !gender || !ward || !planned_procedures || !round_date) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }
    if (!Array.isArray(planned_procedures) || planned_procedures.length === 0) {
      return res.status(400).json({ detail: 'At least one planned procedure is required' });
    }

    const insertResult = await query(
      `INSERT INTO ward_rounds (full_name, age, gender, phone_number, ward, bed_number, diagnosis, planned_procedures, round_date, round_time, attending_doctor, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled')
       RETURNING *`,
      [full_name, parseInt(age), gender, phone_number || null, ward, bed_number || null, diagnosis || null, JSON.stringify(planned_procedures), round_date, round_time || null, attending_doctor || null, notes || null]
    );

    const row = insertResult.rows[0];
    res.json({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      ward: row.ward,
      bed_number: row.bed_number,
      diagnosis: row.diagnosis,
      planned_procedures: row.planned_procedures,
      round_date: formatDateISO(row.round_date),
      round_time: row.round_time ? fmtTime(row.round_time) : null,
      attending_doctor: row.attending_doctor,
      notes: row.notes,
      status: row.status,
    });
  } catch (e) {
    console.error('ward round booking error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── GET /api/admin/ward-rounds (auth required) ──
app.get('/api/admin/ward-rounds', requireAdmin, async (req, res) => {
  try {
    const { date, status } = req.query;
    let result;
    if (date && status) {
      result = await query(
        'SELECT * FROM ward_rounds WHERE round_date = $1 AND status = $2 ORDER BY round_date, round_time',
        [date, status]
      );
    } else if (date) {
      result = await query(
        'SELECT * FROM ward_rounds WHERE round_date = $1 ORDER BY round_date, round_time',
        [date]
      );
    } else if (status) {
      result = await query(
        'SELECT * FROM ward_rounds WHERE status = $1 ORDER BY round_date, round_time',
        [status]
      );
    } else {
      result = await query('SELECT * FROM ward_rounds ORDER BY round_date, round_time');
    }

    const rounds = result.rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      age: row.age,
      gender: row.gender,
      phone_number: row.phone_number,
      ward: row.ward,
      bed_number: row.bed_number,
      diagnosis: row.diagnosis,
      planned_procedures: Array.isArray(row.planned_procedures) ? row.planned_procedures : JSON.parse(row.planned_procedures),
      round_date: formatDateISO(row.round_date),
      round_time: row.round_time ? fmtTime(row.round_time) : null,
      attending_doctor: row.attending_doctor,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
    }));

    res.json(rounds);
  } catch (e) {
    console.error('get ward rounds error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── PUT /api/admin/ward-rounds/:id (auth required) ──
app.put('/api/admin/ward-rounds/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, attending_doctor, round_date, round_time, planned_procedures, notes } = req.body;

    const existing = await query('SELECT * FROM ward_rounds WHERE id = $1', [parseInt(id)]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ detail: 'Ward round not found' });
    }
    const current = existing.rows[0];

    const updatedStatus = status || current.status;
    const updatedDoctor = attending_doctor !== undefined ? attending_doctor : current.attending_doctor;
    const updatedDate = round_date || formatDateISO(current.round_date);
    const updatedTime = round_time !== undefined ? round_time : (current.round_time ? fmtTimeFull(current.round_time) : null);
    const updatedProcedures = planned_procedures ? JSON.stringify(planned_procedures) : JSON.stringify(current.planned_procedures);
    const updatedNotes = notes !== undefined ? notes : current.notes;

    await query(
      `UPDATE ward_rounds SET status = $1, attending_doctor = $2, round_date = $3, round_time = $4, planned_procedures = $5, notes = $6 WHERE id = $7`,
      [updatedStatus, updatedDoctor, updatedDate, updatedTime, updatedProcedures, updatedNotes, parseInt(id)]
    );

    res.json({ message: 'Ward round updated' });
  } catch (e) {
    console.error('update ward round error:', e);
    res.status(500).json({ detail: e.message });
  }
});

// ── DELETE /api/admin/ward-rounds/:id (auth required) ──
app.delete('/api/admin/ward-rounds/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM ward_rounds WHERE id = $1 RETURNING id', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Ward round not found' });
    }
    res.json({ message: 'Ward round deleted' });
  } catch (e) {
    console.error('delete ward round error:', e);
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

// ── AI-Aided Surgery Education Generator ──
function generateSurgeryEducation(procedureName, diagnosis) {
  const procedures = {
    'Wound Debridement': {
      pre: `PRE-OPERATIVE EDUCATION: WOUND DEBRIDEMENT

What is Wound Debridement?
Wound debridement is a surgical procedure to remove dead (necrotic), damaged, or infected tissue from a wound. This helps promote healing by creating a clean wound bed.

Why is this procedure necessary?
${diagnosis ? `Based on your diagnosis (${diagnosis}), y` : 'Y'}our surgeon has determined that debridement is needed to remove non-viable tissue that may be preventing your wound from healing or causing infection.

Before Your Surgery:
• You will need to fast (not eat or drink) for at least 6-8 hours before surgery if general anaesthesia is planned
• Continue taking your regular medications unless your doctor advises otherwise
• Inform your doctor about any allergies, especially to anaesthetics or antibiotics
• Blood tests and other investigations will be done beforehand to ensure your safety
• If you are on blood thinners (e.g., aspirin, warfarin), discuss with your surgeon whether to stop them

What to Expect:
• The procedure may be done under local or general anaesthesia depending on wound extent
• Duration typically ranges from 30 minutes to 2 hours depending on wound size
• You may need wound dressings, and possibly a wound vacuum (VAC) device after the procedure
• Some bleeding is normal; the surgical team will ensure proper haemostasis`,
      post: `POST-OPERATIVE EDUCATION: WOUND DEBRIDEMENT

Immediately After Surgery:
• Some pain and discomfort around the wound site is expected – pain medication will be provided
• Keep the wound dressing clean and dry until your next scheduled dressing change
• Elevate the affected area when possible to reduce swelling

Wound Care:
• Follow the dressing change schedule given by your surgeon (usually every 2-3 days)
• Watch for signs of infection: increased redness, swelling, warmth, pus, or fever
• Do not remove wound dressings yourself unless instructed
• If a wound VAC is in place, ensure the device remains connected and notify staff if it alarms

Activity and Recovery:
• Avoid strenuous activities and heavy lifting until cleared by your surgeon
• Maintain a balanced diet rich in protein, vitamins A and C, and zinc to promote wound healing
• Keep all follow-up appointments for wound assessment
• Recovery time varies: small wounds may heal in 1-2 weeks, larger wounds may take several weeks

When to Seek Emergency Care:
• Heavy or uncontrolled bleeding from the wound
• High fever (above 38.5°C) or chills
• Sudden increase in pain not relieved by prescribed medication
• Foul-smelling discharge from the wound`
    },
    'Skin Grafting': {
      pre: `PRE-OPERATIVE EDUCATION: SKIN GRAFTING

What is Skin Grafting?
A skin graft involves taking healthy skin from one part of your body (donor site) and transplanting it to cover a wound or defect at another site (recipient site).

Types of Skin Grafts:
• Split-thickness graft: A thin layer of skin including the epidermis and part of the dermis
• Full-thickness graft: The entire thickness of the skin is used (for smaller, cosmetically important areas)

Before Your Surgery:
• Fast for 6-8 hours before surgery
• The donor site is usually the thigh, buttock, or upper arm
• Both the donor site and the recipient site will be prepared
• Pre-operative blood tests are essential to ensure you are fit for anaesthesia
• Stop smoking at least 2 weeks before surgery – smoking significantly reduces graft survival
• ${diagnosis ? `Your specific condition (${diagnosis}) will be factored into the surgical plan` : 'Discuss your specific condition with the surgical team'}

What to Expect:
• Surgery duration: 1-3 hours depending on the size of the graft
• You may need general or regional anaesthesia
• The graft will be secured with sutures, staples, or a bolster dressing
• A special dressing (e.g., paraffin gauze, bolster) will protect the graft for 5-7 days`,
      post: `POST-OPERATIVE EDUCATION: SKIN GRAFTING

Graft Site (Recipient Site) Care:
• DO NOT disturb the graft dressing for the first 5-7 days unless instructed by your surgeon
• Keep the area absolutely still – movement can dislodge the graft and cause failure
• Elevate the grafted area above heart level to reduce swelling
• Avoid any pressure on the grafted area
• The first dressing check will be done by your surgeon (usually day 5-7)

Donor Site Care:
• The donor site will have a separate dressing (often an alginate or transparent film)
• It will be sore and may ooze for the first few days – this is normal
• The donor site typically heals in 10-14 days for split-thickness grafts
• Keep the donor site clean and dry; do not pick at any crusting

Activity Restrictions:
• Limit movement of the grafted area for at least 2 weeks
• No heavy exercise or activities that cause sweating near the graft for 4-6 weeks
• Protect the healed graft from sun exposure for 6-12 months (use SPF 30+ sunscreen)

Signs Graft May Be Failing:
• Graft appears dark/black rather than pink
• Increasing foul smell from the dressing
• Persistent fluid collection under the graft
• Report any concerns immediately to your surgeon

Expected Outcomes:
• Successful grafts gradually change from pale to pink over 2-4 weeks
• The grafted area will look different from surrounding skin but will improve over months
• Some numbness or altered sensation at the graft site is normal and may improve over time`
    },
    'Flap Surgery': {
      pre: `PRE-OPERATIVE EDUCATION: FLAP SURGERY

What is Flap Surgery?
Flap surgery involves transferring a piece of tissue (skin, fat, muscle, or bone) with its own blood supply from one area of the body to another. Unlike grafts, flaps carry their own blood vessels.

Before Your Surgery:
• This is a more complex procedure requiring careful pre-operative planning
• You may need CT angiography or Doppler assessment of blood vessels
• Fast for 6-8 hours before surgery
• Stop smoking at least 4 weeks prior – this is critical for flap survival
• Ensure all blood tests, imaging, and assessments are complete
• ${diagnosis ? `Your diagnosis (${diagnosis}) has been considered in the flap design and planning` : 'Discuss the specific type of flap planned with your surgeon'}
• You may need blood products to be cross-matched and available

What to Expect:
• Surgery may take 2-8 hours depending on the type and complexity of the flap
• General anaesthesia is usually required
• You may stay in the hospital for several days for flap monitoring
• The flap will be checked frequently (every 1-2 hours initially) for its blood supply`,
      post: `POST-OPERATIVE EDUCATION: FLAP SURGERY

Critical Post-Operative Period (First 72 Hours):
• The flap will be closely monitored every 1-2 hours by the nursing staff
• DO NOT press on, lean against, or allow anything to compress the flap
• The flap should be warm and pink with capillary refill – report any changes immediately
• Keep the flap elevated when possible
• You must remain in the hospital during this critical monitoring period

Flap Monitoring – Watch For:
• Colour change: pale/white (arterial problem) or purple/blue (venous congestion)
• Temperature change: cold flap suggests blood flow problems
• Excessive swelling or tension around the flap
• Any of these require IMMEDIATE attention – call the nurse immediately

Recovery:
• Hospital stay: typically 5-14 days depending on flap complexity
• Gradually resume activities as directed by your surgeon
• The donor site will also need care and monitoring
• Physiotherapy may be needed for rehabilitation
• Full recovery may take 6-12 weeks

Long-Term Care:
• Protect the flap from trauma and sun exposure
• Follow-up appointments are crucial for assessing healing and planning any refinement surgery
• Sensation and appearance of the flap will continue to improve for up to 1-2 years`
    },
    'Scar Revision': {
      pre: `PRE-OPERATIVE EDUCATION: SCAR REVISION

What is Scar Revision?
Scar revision is a surgical procedure to improve the appearance and/or function of a scar. It cannot completely remove a scar but can make it less noticeable and improve symptoms like tightness or itching.

Before Your Surgery:
• Photographs of the scar will be taken for documentation
• Discuss your expectations with the surgeon – perfect results are not always achievable
• Stop smoking at least 2 weeks before surgery
• Avoid sun exposure to the scar area for 4 weeks before surgery
• ${diagnosis ? `Your condition (${diagnosis}) has been evaluated for the best revision technique` : 'The specific technique will depend on your scar type and location'}
• Fast for 6-8 hours if general anaesthesia is planned (local anaesthesia may be used for small scars)`,
      post: `POST-OPERATIVE EDUCATION: SCAR REVISION

After Surgery:
• Mild swelling and bruising around the area is normal and resolves in 1-2 weeks
• Keep the wound clean, dry, and covered as instructed
• Sutures may be removed in 5-14 days depending on the location

Scar Management (Starting 2-3 weeks after suture removal):
• Use silicone gel sheets or silicone scar cream as directed
• Gentle massage of the scar (once fully healed) helps soften the tissue
• Protect the scar from sunlight for 12 months – use SPF 50 sunscreen
• Avoid stretching the scar area during early healing

What to Expect:
• The new scar may initially look worse (red, raised) before it improves
• Final results may take 6-18 months to become apparent
• Additional treatments (steroid injections, laser) may be recommended later
• Keloid-prone patients should inform their surgeon for additional preventive measures`
    },
  };

  // Default education for procedures not in the specific template list
  const defaultEducation = {
    pre: `PRE-OPERATIVE EDUCATION: ${procedureName.toUpperCase()}

About Your Procedure:
${diagnosis ? `Based on your diagnosis (${diagnosis}), your surgeon has recommended ${procedureName}.` : `Your surgeon has recommended ${procedureName} to address your condition.`}

General Pre-Operative Instructions:
• Fast (do not eat or drink) for 6-8 hours before your scheduled surgery time
• Take only approved medications with a small sip of water on the morning of surgery
• Inform the surgical team about ALL medications you take, including herbal supplements
• Disclose any allergies (medications, latex, adhesive tape, foods)
• Remove all jewellery, nail polish, and body piercings before coming to the operating theatre
• Arrange for a responsible adult to accompany you home after the procedure

Pre-Operative Preparation:
• Complete all requested blood tests and investigations before your surgery date
• Stop smoking at least 2 weeks before surgery (smoking impairs healing significantly)
• If you are on blood-thinning medications (aspirin, warfarin, clopidogrel), consult your surgeon about when to stop
• Shower with antiseptic soap the night before and morning of surgery
• Wear loose, comfortable clothing on the day of surgery

What to Expect on Surgery Day:
• You will be admitted and prepared by the nursing team
• An IV line will be placed for fluids and medications
• Your vital signs will be checked and the surgical site will be marked
• The anaesthesia team will review your history and explain the anaesthesia plan
• The surgery duration will vary – your surgeon will provide a specific estimate

Important Information:
• You have the right to ask questions about your procedure at any time
• Informed consent must be signed before surgery can proceed
• If you feel unwell (fever, cough, infection) before your surgery date, inform the hospital immediately`,
    post: `POST-OPERATIVE EDUCATION: ${procedureName.toUpperCase()}

Immediately After Surgery:
• You will be monitored in the recovery room until you are fully awake
• Some pain, swelling, and discomfort are expected – pain medication will be provided
• Follow all instructions regarding wound care, dressing changes, and medications

Wound Care:
• Keep surgical dressings clean and dry until your scheduled dressing change
• Do not remove or adjust dressings yourself unless instructed
• Watch for signs of infection: increasing redness, swelling, warmth, pus drainage, or fever
• Clean hands thoroughly before and after touching near any wound site

Medications:
• Take all prescribed medications as directed (antibiotics, pain relievers, etc.)
• Complete the full course of antibiotics even if you feel better
• Do not take additional pain medications beyond what is prescribed without consulting your doctor
• Report any adverse medication reactions (rash, nausea, difficulty breathing) immediately

Activity and Diet:
• Rest adequately – your body needs energy to heal
• Gradually increase activity as directed by your surgeon
• Eat a balanced diet rich in protein, fruits, vegetables, and plenty of water
• Avoid alcohol and smoking during the recovery period

Follow-Up:
• Attend all scheduled follow-up appointments
• Your first post-operative check will typically be within 1-2 weeks
• Bring a list of any concerns or questions to discuss during follow-up

When to Seek Emergency Care:
• Heavy or uncontrolled bleeding
• Fever above 38.5°C (101.3°F) not responding to prescribed medication
• Severe pain not relieved by prescribed pain medication
• Difficulty breathing or chest pain
• Sudden swelling or change in colour of the surgical area
• Any unexpected symptoms that concern you

Contact the Plastic Surgery Unit at Niger Foundation Hospital if you have any questions or concerns during your recovery.`
  };

  const specific = procedures[procedureName];
  return {
    pre_op_education: specific ? specific.pre : defaultEducation.pre,
    post_op_education: specific ? specific.post : defaultEducation.post,
  };
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
