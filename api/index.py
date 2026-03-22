import sys
import os
import traceback

# PHASE 1: Minimal diagnostic - does basic FastAPI work at all?
from fastapi import FastAPI
from fastapi.responses import JSONResponse

diagnostic_app = FastAPI()
import_errors = {}

# Test each import individually
test_modules = [
    ("sqlalchemy", "sqlalchemy"),
    ("pg8000", "pg8000"),
    ("bcrypt", "bcrypt"),
    ("jose", "jose"),
    ("dotenv", "dotenv"),
    ("pydantic", "pydantic"),
    ("reportlab", "reportlab"),
    ("PIL", "PIL"),
]

for display_name, mod_name in test_modules:
    try:
        __import__(mod_name)
        import_errors[display_name] = "OK"
    except Exception as e:
        import_errors[display_name] = str(e)

# Now try importing the actual app
app_error = None
try:
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
    sys.path.insert(0, backend_dir)
    from main import app
    handler = app
except Exception as e:
    app_error = traceback.format_exc()
    
    @diagnostic_app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def error_handler(path: str):
        return JSONResponse(status_code=500, content={
            "error": "App failed to start",
            "details": app_error,
            "python_version": sys.version,
            "import_tests": import_errors,
            "cwd": os.getcwd(),
            "env_keys": [k for k in os.environ.keys() if k in ("DATABASE_URL", "SECRET_KEY", "VERCEL", "VERCEL_ENV")],
        })
    
    handler = diagnostic_app
