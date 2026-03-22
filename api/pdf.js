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

module.exports = { generateSchedulePDF };
