import sys
import os

# Ensure backend is on path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, backend_dir)

# Phase 1: minimal test without importing the full app
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()
import_results = {}

# Test imports one by one
for mod in ["sqlalchemy", "pg8000", "bcrypt", "jose", "dotenv", "pydantic", "reportlab", "PIL"]:
    try:
        __import__(mod)
        import_results[mod] = "OK"
    except Exception as e:
        import_results[mod] = str(e)

# Test database import
try:
    from database import engine, Base
    import_results["database"] = "OK"
except Exception as e:
    import_results["database"] = str(e)

# Test full app import
try:
    from main import app as real_app
    import_results["main"] = "OK"
    handler = real_app
except Exception as e:
    import_results["main"] = str(e)

    @app.get("/api/health")
    async def health():
        return JSONResponse(content={
            "status": "diagnostic",
            "imports": import_results,
            "python": sys.version,
            "env_keys": [k for k in os.environ if k in ("DATABASE_URL", "SECRET_KEY", "VERCEL")],
        })

    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path: str):
        return JSONResponse(status_code=500, content={
            "error": "App failed to start",
            "imports": import_results,
        })

    handler = app
