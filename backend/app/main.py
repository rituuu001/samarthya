
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the Samarthya platform",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"message": "Welcome to Samarthya API"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "connected",
    }
