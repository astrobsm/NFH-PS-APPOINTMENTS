from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

from database import engine, Base
from routes import appointments, admin, settings, slots

app = FastAPI(title="Niger Foundation Hospital PS-Consultation API", version="1.0.0")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables at module level (Vercel doesn't fire ASGI startup events)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create tables: {e}")

# Include routers
app.include_router(slots.router)
app.include_router(appointments.router)
app.include_router(admin.router)
app.include_router(settings.router)


@app.get("/api/health")
def health_check():
    """Health check with DB connectivity test."""
    db_status = "unknown"
    db_error = None
    try:
        from database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    return {
        "status": "ok",
        "app": "NFH PS-Consultation",
        "database": db_status,
        "db_error": db_error,
        "db_url_prefix": os.getenv("DATABASE_URL", "NOT SET")[:30] + "...",
    }
