from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    visit_type = Column(String(20), nullable=False)
    visit_category = Column(String(20), nullable=False)
    reason = Column(Text, nullable=True)
    appointment_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    clinic_days = Column(JSON, nullable=False)
    morning_start = Column(Time, nullable=False)
    morning_end = Column(Time, nullable=False)
    afternoon_start = Column(Time, nullable=False)
    afternoon_end = Column(Time, nullable=False)
    admin_password_hash = Column(String(255), nullable=False)
