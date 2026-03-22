import sys
import os
import traceback

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, backend_dir)

try:
    from main import app
    handler = app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    error_detail = traceback.format_exc()
    app = FastAPI()

    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def error_handler(path: str):
        return JSONResponse(status_code=500, content={
            "error": "App failed to start",
            "details": error_detail,
            "python": sys.version,
        })

    handler = app
