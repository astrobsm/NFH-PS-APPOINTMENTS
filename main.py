from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"hello": "world"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
