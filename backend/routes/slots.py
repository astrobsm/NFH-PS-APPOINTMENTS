from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, time, datetime
from typing import List

from database import get_db
from models import Appointment, Settings
from schemas import SlotResponse

router = APIRouter(prefix="/api/slots", tags=["slots"])


def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def minutes_to_time(minutes: int) -> time:
    return time(hour=minutes // 60, minute=minutes % 60)


def generate_available_slots(
    appointment_date: date,
    visit_type: str,
    settings: Settings,
    existing: List[Appointment],
) -> List[dict]:
    duration = 30 if visit_type == "wound_care" else 20

    sessions = [
        (time_to_minutes(settings.morning_start), time_to_minutes(settings.morning_end)),
        (time_to_minutes(settings.afternoon_start), time_to_minutes(settings.afternoon_end)),
    ]

    slots = []
    for session_start, session_end in sessions:
        current = session_start
        while current + duration <= session_end:
            slot_start = minutes_to_time(current)
            slot_end = minutes_to_time(current + duration)

            # Check overlap with existing appointments
            is_available = True
            for apt in existing:
                if slot_start < apt.end_time and slot_end > apt.start_time:
                    is_available = False
                    break

            if is_available:
                slots.append(
                    {
                        "start_time": slot_start.strftime("%H:%M"),
                        "end_time": slot_end.strftime("%H:%M"),
                    }
                )

            current += duration

    return slots


@router.get("", response_model=List[SlotResponse])
def get_available_slots(
    date: date = Query(...),
    visit_type: str = Query(...),
    db: Session = Depends(get_db),
):
    if visit_type not in ("wound_care", "non_wound_care"):
        raise HTTPException(status_code=400, detail="Invalid visit type")

    settings = db.query(Settings).first()
    if not settings:
        raise HTTPException(status_code=503, detail="Clinic not configured yet")

    # Check if the day is an allowed clinic day
    day_name = date.strftime("%A")
    if day_name not in settings.clinic_days:
        return []

    # Check date is not in the past
    if date < datetime.now().date():
        return []

    existing = (
        db.query(Appointment)
        .filter(Appointment.appointment_date == date)
        .all()
    )

    return generate_available_slots(date, visit_type, settings, existing)
