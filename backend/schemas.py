from pydantic import BaseModel, Field
from datetime import date, time
from typing import Optional, List


class AppointmentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=150)
    gender: str
    visit_type: str
    visit_category: str
    reason: Optional[str] = None
    appointment_date: date
    start_time: time


class AppointmentResponse(BaseModel):
    id: int
    full_name: str
    age: int
    gender: str
    visit_type: str
    visit_category: str
    reason: Optional[str]
    appointment_date: date
    start_time: time
    end_time: time

    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    password: str


class SettingsUpdate(BaseModel):
    clinic_days: Optional[List[str]] = None
    morning_start: Optional[time] = None
    morning_end: Optional[time] = None
    afternoon_start: Optional[time] = None
    afternoon_end: Optional[time] = None
    new_password: Optional[str] = None


class SettingsResponse(BaseModel):
    clinic_days: List[str]
    morning_start: time
    morning_end: time
    afternoon_start: time
    afternoon_end: time

    class Config:
        from_attributes = True


class SlotResponse(BaseModel):
    start_time: str
    end_time: str


class AdminSetup(BaseModel):
    password: str = Field(..., min_length=6)
    clinic_days: Optional[List[str]] = None
