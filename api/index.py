"""Minimal diagnostic - absolutely no external imports"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import sys
import os

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "minimal_test_ok", "python": sys.version}

@app.get("/api/test")
async def test():
    return {"message": "API is working", "env_vars": [k for k in os.environ if k in ("DATABASE_URL", "SECRET_KEY", "VERCEL")]}

handler = app
