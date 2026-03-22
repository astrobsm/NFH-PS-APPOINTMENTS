from fastapi import FastAPI
import sys
import os

app = FastAPI()

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "python": sys.version,
        "env_keys": [k for k in os.environ if k in ("DATABASE_URL", "SECRET_KEY", "VERCEL")]
    }

handler = app
