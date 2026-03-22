import os
import ssl
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ps_consultation.db")

if not DATABASE_URL.startswith("sqlite"):
    # Parse and rebuild URL for pg8000 driver
    parsed = urlparse(DATABASE_URL)
    # Strip sslmode from query params (pg8000 uses ssl_context instead)
    params = parse_qs(parsed.query)
    params.pop("sslmode", None)
    clean_query = urlencode(params, doseq=True)
    # Rebuild with pg8000 dialect
    DATABASE_URL = urlunparse((
        "postgresql+pg8000",
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment,
    ))
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "ssl_context": ssl_context,
            "prepare_threshold": None,  # Disable prepared statements for PgBouncer
        },
    )
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
