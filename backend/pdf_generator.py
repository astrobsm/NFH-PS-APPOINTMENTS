from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.platypus.flowables import Flowable
from datetime import date
from io import BytesIO
import os

LOGO_PATH = os.path.join(os.path.dirname(__file__), "NFH-LOGO.png")


class WatermarkFlowable(Flowable):
    """Draws a centered watermark logo on the page."""
    def __init__(self, img_path, width=250, height=250, opacity=0.08):
        super().__init__()
        self.img_path = img_path
        self.img_width = width
        self.img_height = height
        self.opacity = opacity
        self.width = 0
        self.height = 0

    def draw(self):
        canvas = self.canv
        page_w, page_h = A4
        x = (page_w - self.img_width) / 2
        y = (page_h - self.img_height) / 2
        canvas.saveState()
        canvas.setFillAlpha(self.opacity)
        canvas.drawImage(
            self.img_path, x, y,
            width=self.img_width, height=self.img_height,
            preserveAspectRatio=True, mask='auto'
        )
        canvas.restoreState()


def _draw_watermark(canvas_obj, doc):
    """Called on every page to draw the watermark behind content."""
    if os.path.exists(LOGO_PATH):
        canvas_obj.saveState()
        page_w, page_h = A4
        wm_size = 250
        x = (page_w - wm_size) / 2
        y = (page_h - wm_size) / 2
        canvas_obj.setFillAlpha(0.08)
        canvas_obj.drawImage(
            LOGO_PATH, x, y,
            width=wm_size, height=wm_size,
            preserveAspectRatio=True, mask='auto'
        )
        canvas_obj.restoreState()


def generate_schedule_pdf(schedule_date: date, appointments: list) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = getSampleStyleSheet()

    elements = []

    # Hospital logo at top
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=60, height=60)
        logo.hAlign = 'CENTER'
        elements.append(logo)
        elements.append(Spacer(1, 6))

    # Hospital Name
    hospital_style = ParagraphStyle(
        "HospitalName",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#1e40af"),
        alignment=1,
        spaceAfter=4,
    )
    elements.append(Paragraph("Niger Foundation Hospital, Enugu", hospital_style))

    # Title
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1e40af"),
        alignment=1,
        spaceAfter=12,
    )
    elements.append(Paragraph("PS-Consultation Appointment Schedule", title_style))

    # Subtitle with date
    date_style = ParagraphStyle(
        "DateStyle",
        parent=styles["Normal"],
        fontSize=14,
        alignment=1,
        spaceAfter=20,
    )
    elements.append(
        Paragraph(
            f"Appointment Schedule &mdash; {schedule_date.strftime('%A, %B %d, %Y')}",
            date_style,
        )
    )
    elements.append(Spacer(1, 12))

    if not appointments:
        elements.append(
            Paragraph("No appointments scheduled for this date.", styles["Normal"])
        )
    else:
        data = [
            ["#", "Time", "Patient Name", "Age", "Gender", "Visit Type", "Category", "Reason"]
        ]

        for i, apt in enumerate(appointments, 1):
            visit_type = "Wound Care" if apt.visit_type == "wound_care" else "Non-Wound Care"
            category = "First Time" if apt.visit_category == "first_time" else "Follow-up"
            time_str = f"{apt.start_time.strftime('%H:%M')} - {apt.end_time.strftime('%H:%M')}"
            reason = (apt.reason or "-")[:40]

            data.append(
                [str(i), time_str, apt.full_name, str(apt.age), apt.gender, visit_type, category, reason]
            )

        table = Table(data, colWidths=[28, 78, 100, 32, 48, 80, 58, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("TOPPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f0f4ff")],
                    ),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(table)

    # Footer
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=1,
    )
    elements.append(
        Paragraph(
            f"Generated on {date.today().strftime('%Y-%m-%d')} | Niger Foundation Hospital, Enugu",
            footer_style,
        )
    )

    doc.build(elements, onFirstPage=_draw_watermark, onLaterPages=_draw_watermark)
    return buffer.getvalue()
