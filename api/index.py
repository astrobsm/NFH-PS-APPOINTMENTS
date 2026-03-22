from fastapi import FastAPI
import sys

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "python": sys.version}

@app.get("/api/test")
async def test():
    return {"message": "API works"}

handler = app
