import sys
import os
import traceback
import json

# Minimal test first - verify Python runtime works
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

# Test 1: Basic function works
@app.get("/api/test")
async def test():
    return {"status": "ok", "python": sys.version}

# Test 2: Try importing each dependency to find what crashes
import_results = {}
for mod_name in ["sqlalchemy", "pydantic", "python_jose", "dotenv", "bcrypt", "reportlab", "PIL", "psycopg"]:
    try:
        __import__(mod_name)
        import_results[mod_name] = "ok"
    except Exception as e:
        import_results[mod_name] = str(e)

@app.get("/api/imports")
async def imports():
    return {"imports": import_results}

# Test 3: Try loading the actual backend app
backend_error = None
try:
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
    sys.path.insert(0, backend_dir)
    from main import app as real_app
    app = real_app  # Replace the test app with the real one
except Exception as e:
    backend_error = traceback.format_exc()

@app.get("/api/debug")
async def debug():
    return JSONResponse(content={
        "backend_loaded": backend_error is None,
        "backend_error": backend_error,
        "imports": import_results,
        "python": sys.version,
        "cwd": os.getcwd(),
        "env_keys": [k for k in os.environ if k in ("DATABASE_URL", "SECRET_KEY")],
    })

handler = app
