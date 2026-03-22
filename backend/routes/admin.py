from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
import base64

from database import get_db
from models import Appointment, Settings
from schemas import AdminLogin, AppointmentResponse
from auth import verify_password, create_token, get_current_admin, get_current_admin_from_token
from pdf_generator import generate_schedule_pdf

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
def admin_login(data: AdminLogin, db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Admin not set up yet")

    if not verify_password(data.password, settings.admin_password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_token({"sub": "admin"})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(
    date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)
    if date:
        query = query.filter(Appointment.appointment_date == date)

    return query.order_by(Appointment.appointment_date, Appointment.start_time).all()


@router.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted"}


@router.post("/schedule-print")
def get_report(
    date: date = Query(...),
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    appointments = (
        db.query(Appointment)
        .filter(Appointment.appointment_date == date)
        .order_by(Appointment.start_time)
        .all()
    )

    pdf_buffer = generate_schedule_pdf(date, appointments)
    pdf_base64 = base64.b64encode(pdf_buffer).decode('ascii')

    return {
        "filename": f"schedule_{date}.pdf",
        "data": pdf_base64,
    }
