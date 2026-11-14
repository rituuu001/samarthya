
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.routers.applications import router as applications_router
from app.routers.sprints import router as sprints_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.verifications import router as verifications_router
from app.routers.files import router as files_router
from app.routers.submissions import router as submissions_router
from app.routers.payments import router as payments_router
from app.routers.proof_records import router as proof_records_router
from app.routers.portfolio_projects import router as portfolio_projects_router


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the Samarthya platform",
    version="0.1.0",
)

app.include_router(sprints_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(verifications_router)
app.include_router(files_router)
app.include_router(applications_router)
app.include_router(submissions_router)
app.include_router(payments_router)
app.include_router(proof_records_router)
app.include_router(portfolio_projects_router)


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
