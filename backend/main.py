from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, Base
from routes import appointments, admin, settings, slots

app = FastAPI(title="Niger Foundation Hospital PS-Consultation API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(slots.router)
app.include_router(appointments.router)
app.include_router(admin.router)
app.include_router(settings.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "NFH PS-Consultation"}
