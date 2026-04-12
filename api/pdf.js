const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

async function generateSchedulePDF(scheduleDate, appointments) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = doc.addPage([pageWidth, pageHeight]);

  const blue = rgb(0.118, 0.251, 0.686);
  let y = pageHeight - 50;

  // Hospital Name
  const hospitalName = 'Niger Foundation Hospital, Enugu';
  const hospitalWidth = fontBold.widthOfTextAtSize(hospitalName, 16);
  page.drawText(hospitalName, {
    x: (pageWidth - hospitalWidth) / 2, y, size: 16, font: fontBold, color: blue,
  });
  y -= 25;

  // Subtitle
  const subtitle = 'PS-Consultation Appointment Schedule';
  const subWidth = fontBold.widthOfTextAtSize(subtitle, 13);
  page.drawText(subtitle, {
    x: (pageWidth - subWidth) / 2, y, size: 13, font: fontBold, color: blue,
  });
  y -= 25;

  // Date
  const dateStr = `Schedule - ${formatDate(scheduleDate)}`;
  const dateWidth = font.widthOfTextAtSize(dateStr, 12);
  page.drawText(dateStr, {
    x: (pageWidth - dateWidth) / 2, y, size: 12, font,
  });
  y -= 30;

  if (!appointments || appointments.length === 0) {
    page.drawText('No appointments scheduled for this date.', {
      x: 50, y, size: 11, font,
    });
  } else {
    const headers = ['#', 'Time', 'Patient Name', 'Age', 'Gender', 'Visit Type', 'Category', 'Reason'];
    const colWidths = [25, 75, 100, 30, 45, 75, 60, 105];
    const colX = [30];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }

    const rowHeight = 20;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header background
    page.drawRectangle({
      x: 30, y: y - rowHeight + 5, width: tableWidth, height: rowHeight, color: blue,
    });

    // Header text
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: colX[i] + 3, y: y - 10, size: 8, font: fontBold, color: rgb(1, 1, 1),
      });
    });
    y -= rowHeight;

    // Data rows
    appointments.forEach((apt, idx) => {
      if (y < 60) {
        // Would need a new page for many appointments
        return;
      }

      const visitType = apt.visit_type === 'wound_care' ? 'Wound Care' : 'Non-Wound';
      const category = apt.visit_category === 'first_time' ? 'First Time' : 'Follow-up';
      const timeStr = `${fmtTime(apt.start_time)} - ${fmtTime(apt.end_time)}`;
      const reason = (apt.reason || '-').substring(0, 20);

      const row = [String(idx + 1), timeStr, apt.full_name, String(apt.age), apt.gender, visitType, category, reason];

      // Alternating row background
      if (idx % 2 === 1) {
        page.drawRectangle({
          x: 30, y: y - rowHeight + 5, width: tableWidth, height: rowHeight,
          color: rgb(0.941, 0.957, 1),
        });
      }

      row.forEach((cell, i) => {
        const text = String(cell || '');
        page.drawText(text, {
          x: colX[i] + 3, y: y - 10, size: 7, font, color: rgb(0, 0, 0),
        });
      });
      y -= rowHeight;
    });
  }

  // Footer
  const today = new Date().toISOString().split('T')[0];
  const footer = `Generated on ${today} | Niger Foundation Hospital, Enugu`;
  const footerWidth = font.widthOfTextAtSize(footer, 8);
  page.drawText(footer, {
    x: (pageWidth - footerWidth) / 2, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
  });

  return Buffer.from(await doc.save());
}

// ── Surgery Booking PDF Generation ──

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function generateSurgeryBookingPDF(surg) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 50;
  const blue = rgb(0.118, 0.251, 0.686);
  const purple = rgb(0.4, 0.2, 0.6);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const gray = rgb(0.4, 0.4, 0.4);
  const green = rgb(0.1, 0.5, 0.2);
  const red = rgb(0.7, 0.1, 0.1);

  function checkNewPage(needed) {
    if (y - needed < 60) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }
  }

  function drawSectionHeader(title, color) {
    checkNewPage(30);
    page.drawRectangle({ x: margin, y: y - 3, width: contentWidth, height: 20, color: color || blue });
    page.drawText(title, { x: margin + 8, y: y + 2, size: 11, font: fontBold, color: rgb(1, 1, 1) });
    y -= 28;
  }

  function drawField(label, value) {
    checkNewPage(18);
    page.drawText(label + ':', { x: margin + 5, y, size: 9, font: fontBold, color: darkGray });
    const labelW = fontBold.widthOfTextAtSize(label + ': ', 9);
    const val = String(value || 'N/A');
    page.drawText(val, { x: margin + 5 + labelW, y, size: 9, font, color: gray });
    y -= 15;
  }

  function drawWrappedText(text, indent) {
    if (!text) return;
    const lines = text.split('\n');
    for (const line of lines) {
      const wrapped = wrapText(line, font, 8, contentWidth - (indent || 10));
      for (const wl of wrapped) {
        checkNewPage(13);
        page.drawText(wl, { x: margin + (indent || 5), y, size: 8, font, color: darkGray });
        y -= 12;
      }
    }
  }

  // ── Header ──
  const hospitalName = 'NIGER FOUNDATION HOSPITAL, ENUGU';
  const hnW = fontBold.widthOfTextAtSize(hospitalName, 16);
  page.drawText(hospitalName, { x: (pageWidth - hnW) / 2, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  const subtitle = 'PLASTIC SURGERY UNIT – SURGERY BOOKING FORM';
  const stW = fontBold.widthOfTextAtSize(subtitle, 11);
  page.drawText(subtitle, { x: (pageWidth - stW) / 2, y, size: 11, font: fontBold, color: purple });
  y -= 15;
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.5, color: blue });
  y -= 8;
  const refText = `Booking Ref: NFH-SRG-${String(surg.id).padStart(4, '0')}`;
  const refW = font.widthOfTextAtSize(refText, 9);
  page.drawText(refText, { x: pageWidth - margin - refW, y, size: 9, font: fontBold, color: blue });
  y -= 20;

  // ── Section 1: Patient Information ──
  drawSectionHeader('1. PATIENT INFORMATION');
  drawField('Full Name', surg.full_name);
  drawField('Age', surg.age);
  drawField('Gender', surg.gender);
  drawField('Phone', surg.phone_number || 'Not provided');
  y -= 5;

  // ── Section 2: Pre-Operative Planning ──
  const plan = surg.pre_op_planning || {};
  drawSectionHeader('2. PRE-OPERATIVE PLANNING', purple);
  drawField('Diagnosis', plan.diagnosis || surg.diagnosis);
  if (plan.bleeding_risk) drawField('Bleeding Risk', `${plan.bleeding_risk.level || 'Not assessed'}${plan.bleeding_risk.notes ? ' – ' + plan.bleeding_risk.notes : ''}`);
  if (plan.dvt_risk) drawField('DVT Risk', `${plan.dvt_risk.level || 'Not assessed'}${plan.dvt_risk.notes ? ' – ' + plan.dvt_risk.notes : ''}`);
  if (plan.nutritional_assessment) drawField('Nutritional Status', `${plan.nutritional_assessment.status || 'Not assessed'}${plan.nutritional_assessment.notes ? ' – ' + plan.nutritional_assessment.notes : ''}`);
  if (plan.cardiovascular_risk) drawField('Cardiovascular Risk', `${plan.cardiovascular_risk.level || 'Not assessed'}${plan.cardiovascular_risk.notes ? ' – ' + plan.cardiovascular_risk.notes : ''}`);
  if (plan.pressure_sore_risk) drawField('Pressure Sore Risk', `${plan.pressure_sore_risk.level || 'Not assessed'}${plan.pressure_sore_risk.notes ? ' – ' + plan.pressure_sore_risk.notes : ''}`);
  y -= 5;

  // ── Section 3: Pre-Operative Investigations ──
  const inv = surg.investigations || {};
  drawSectionHeader('3. PRE-OPERATIVE INVESTIGATIONS', red);
  if (inv.compulsory) {
    const compLabels = { hiv: 'HIV Screening', fbc: 'FBC', seucr: 'SEUCR', hcv: 'HCV', hbsag: 'HBsAg' };
    page.drawText('Compulsory Tests:', { x: margin + 5, y, size: 9, font: fontBold, color: darkGray });
    y -= 14;
    for (const [key, label] of Object.entries(compLabels)) {
      checkNewPage(14);
      const done = inv.compulsory[key] ? '✓' : '✗';
      const clr = inv.compulsory[key] ? green : red;
      page.drawText(`  ${done} ${label}`, { x: margin + 10, y, size: 8, font, color: clr });
      y -= 13;
    }
  }
  if (inv.additional && inv.additional.length > 0) {
    y -= 3;
    drawField('Additional Tests', inv.additional.join(', '));
  }
  y -= 5;

  // ── Section 4: Procedure ──
  drawSectionHeader('4. NAME OF PROCEDURE', rgb(0, 0.5, 0.5));
  drawField('Procedure', surg.procedure_name || surg.surgery_type);
  y -= 5;

  // ── Section 5: Surgical Requirements ──
  const req = surg.requirements || {};
  drawSectionHeader('5. SURGICAL REQUIREMENTS', rgb(0.3, 0.3, 0.7));
  drawField('Anaesthesia Type', req.anaesthesia_type);
  drawField('Tourniquet', req.tourniquet ? 'Yes' : 'No');
  drawField('Diathermy', req.diathermy ? `Yes – ${req.diathermy_type || 'Unspecified'}` : 'No');
  if (req.special_instruments && req.special_instruments.length > 0) drawField('Special Instruments', req.special_instruments.join(', '));
  if (req.dressing_materials && req.dressing_materials.length > 0) drawField('Dressing Materials', req.dressing_materials.join(', '));
  if (req.solutions && req.solutions.length > 0) drawField('Solutions', req.solutions.join(', '));
  y -= 5;

  // ── Section 6: Surgery Date ──
  drawSectionHeader('6. SURGERY DATE', rgb(0.7, 0.5, 0));
  drawField('Preferred Date', formatDate(formatDateISO2(surg.preferred_date)));
  if (surg.notes) drawField('Notes', surg.notes);
  drawField('Status', (surg.status || 'pending').toUpperCase());
  if (surg.surgeon_name) drawField('Assigned Surgeon', surg.surgeon_name);
  y -= 5;

  // ── Section 7: Readiness Checklist ──
  const rc = surg.readiness_checklist || {};
  drawSectionHeader('7. READINESS CHECKLIST', green);
  const readinessLabels = {
    consent_signed: 'Informed consent signed',
    npo_confirmed: 'NPO status confirmed',
    site_marked: 'Surgical site marked',
    blood_available: 'Blood products available',
    investigations_reviewed: 'Investigations reviewed',
    pre_medication: 'Pre-medication administered',
    iv_access: 'IV access established',
    allergies_documented: 'Allergies documented',
    anaesthesia_review: 'Pre-anaesthetic review completed',
    vitals_checked: 'Vital signs documented',
  };
  for (const [key, label] of Object.entries(readinessLabels)) {
    checkNewPage(14);
    const done = rc[key] ? '✓' : '✗';
    const clr = rc[key] ? green : red;
    page.drawText(`  ${done} ${label}`, { x: margin + 10, y, size: 8, font, color: clr });
    y -= 13;
  }
  y -= 5;

  // ── Section 8: Patient Education ──
  if (surg.pre_op_education || surg.post_op_education) {
    drawSectionHeader('8. PATIENT EDUCATION', rgb(0.7, 0.2, 0.4));
    if (surg.pre_op_education) {
      page.drawText('Pre-Operative Education:', { x: margin + 5, y, size: 9, font: fontBold, color: darkGray });
      y -= 14;
      drawWrappedText(surg.pre_op_education, 10);
      y -= 8;
    }
    if (surg.post_op_education) {
      checkNewPage(20);
      page.drawText('Post-Operative Education:', { x: margin + 5, y, size: 9, font: fontBold, color: darkGray });
      y -= 14;
      drawWrappedText(surg.post_op_education, 10);
    }
  }

  // ── Footer ──
  const today = new Date().toISOString().split('T')[0];
  const footer = `Generated on ${today} | Niger Foundation Hospital Enugu – Plastic Surgery Unit | CONFIDENTIAL`;
  const fW = font.widthOfTextAtSize(footer, 7);
  // Draw on all pages
  const pages = doc.getPages();
  for (const p of pages) {
    p.drawText(footer, { x: (pageWidth - fW) / 2, y: 25, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
  }

  return Buffer.from(await doc.save());
}

function formatDateISO2(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  return new Date(d).toISOString().split('T')[0];
}

module.exports = { generateSchedulePDF, generateSurgeryBookingPDF };
