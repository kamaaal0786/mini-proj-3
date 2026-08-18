"""
FastAPI application entry point — Phase 2.

Routers:
  /api/auth, /api/me       — authentication
  /api/users, /api/courses — admin management
  /api/students            — role-filtered CRUD
  /api/academic/upload     — CSV/XLSX pipeline
  /api/students/{id}/academic — manual update
  /api/risk                — inference, history, explanation
  /api/credits             — credit engine
  /api/interventions       — intervention CRUD + status
  /api/dashboard           — role-aware KPIs
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.base import init_db

from app.auth.router import router as auth_router, me_router as auth_me_router
from app.users.router import router as users_router
from app.users.courses_router import router as courses_router
from app.students.router import router as students_router
from app.uploads.router import router as uploads_router
from app.academics.router import router as academics_router
from app.risk.router import router as risk_router
from app.credits.router import router as credits_router
from app.interventions.router import router as interventions_router
from app.dashboard.router import router as dashboard_router

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables + load ML model."""
    init_db()
    from app.risk.inference import ModelService
    ModelService.get().load()
    logger.info("Application startup complete.")
    yield


app = FastAPI(
    title="AI Credit & Dropout Evaluation System",
    description="Early-intervention platform for dropout risk prediction and credit tracking.",
    version="0.2.0-phase2",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(auth_me_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(students_router)
app.include_router(uploads_router)
app.include_router(academics_router)
app.include_router(risk_router)
app.include_router(credits_router)
app.include_router(interventions_router)
app.include_router(dashboard_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": app.version}
