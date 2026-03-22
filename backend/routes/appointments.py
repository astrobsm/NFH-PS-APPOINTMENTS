from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models import Appointment, Settings
from schemas import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentResponse)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
    if not settings:
        raise HTTPException(status_code=503, detail="Clinic not configured yet")

    # Validate clinic day
    day_name = data.appointment_date.strftime("%A")
    if day_name not in settings.clinic_days:
        raise HTTPException(status_code=400, detail="Clinic is not open on this day")

    # Validate not in the past
    if data.appointment_date < datetime.now().date():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")

    # Validate visit type
    if data.visit_type not in ("wound_care", "non_wound_care"):
        raise HTTPException(status_code=400, detail="Invalid visit type")

    # Validate visit category
    if data.visit_category not in ("first_time", "follow_up"):
        raise HTTPException(status_code=400, detail="Invalid visit category")

    # Calculate end time
    duration = 30 if data.visit_type == "wound_care" else 20
    start_dt = datetime.combine(data.appointment_date, data.start_time)
    end_dt = start_dt + timedelta(minutes=duration)
    end_time = end_dt.time()

    # Check for overlapping appointments
    existing = (
        db.query(Appointment)
        .filter(Appointment.appointment_date == data.appointment_date)
        .all()
    )

    for apt in existing:
        if data.start_time < apt.end_time and end_time > apt.start_time:
            raise HTTPException(status_code=409, detail="This time slot is no longer available")

    appointment = Appointment(
        full_name=data.full_name,
        age=data.age,
        gender=data.gender,
        visit_type=data.visit_type,
        visit_category=data.visit_category,
        reason=data.reason,
        appointment_date=data.appointment_date,
        start_time=data.start_time,
        end_time=end_time,
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment
