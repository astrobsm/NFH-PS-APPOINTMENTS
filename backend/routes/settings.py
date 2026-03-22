from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import time

from database import get_db
from models import Settings
from schemas import SettingsUpdate, SettingsResponse, AdminSetup
from auth import hash_password, get_current_admin

router = APIRouter(prefix="/api/admin/settings", tags=["settings"])


@router.get("/status")
def get_setup_status(db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
    return {"is_configured": settings is not None}


@router.post("/setup")
def initial_setup(data: AdminSetup, db: Session = Depends(get_db)):
    existing = db.query(Settings).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already configured")

    settings = Settings(
        clinic_days=data.clinic_days or ["Monday", "Wednesday", "Friday"],
        morning_start=time(9, 0),
        morning_end=time(13, 0),
        afternoon_start=time(13, 30),
        afternoon_end=time(17, 0),
        admin_password_hash=hash_password(data.password),
    )
    db.add(settings)
    db.commit()
    return {"message": "Admin setup complete"}


@router.get("", response_model=SettingsResponse)
def get_settings(
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    settings = db.query(Settings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not configured")
    return settings


@router.put("")
def update_settings(
    data: SettingsUpdate,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    settings = db.query(Settings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not configured")

    if data.clinic_days is not None:
        settings.clinic_days = data.clinic_days
    if data.morning_start is not None:
        settings.morning_start = data.morning_start
    if data.morning_end is not None:
        settings.morning_end = data.morning_end
    if data.afternoon_start is not None:
        settings.afternoon_start = data.afternoon_start
    if data.afternoon_end is not None:
        settings.afternoon_end = data.afternoon_end
    if data.new_password:
        settings.admin_password_hash = hash_password(data.new_password)

    db.commit()
    return {"message": "Settings updated"}
