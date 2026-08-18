"""
Test configuration — SQLite in-memory, no PostgreSQL needed.

Key: We patch app.db.base.engine AFTER import (since .env file takes precedence
over os.environ for pydantic-settings). We rebind all sessions to SQLite.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Create SQLite test engine ─────────────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_phase1.db"
_test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


# ── Patch the app's engine BEFORE importing app.main ─────────────────────────
import app.db.base as _db_base
_db_base.engine = _test_engine
_db_base.SessionLocal = _TestingSession

from app.main import app  # noqa: E402 — import after patching
from app.db.base import get_db  # noqa: E402


def override_get_db():
    db = _TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create all tables in SQLite test DB once per session."""
    from app.db import models  # noqa — registers models
    from app.db.base import Base
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)
    # Note: on Windows the SQLite file may be locked until process ends — safe to ignore


@pytest.fixture()
def db():
    session = _TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture()
def admin_token(client, db):
    from passlib.context import CryptContext
    from app.db.models import User, UserRole, UserStatus

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    existing = db.query(User).filter(User.email == "test_admin@test.com").first()
    if not existing:
        user = User(
            email="test_admin@test.com",
            name="Test Admin",
            password_hash=pwd_ctx.hash("admin123"),
            role=UserRole.admin,
            status=UserStatus.active,
        )
        db.add(user)
        db.commit()

    resp = client.post(
        "/api/auth/login",
        data={"username": "test_admin@test.com", "password": "admin123"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture()
def student_token(client, db):
    from passlib.context import CryptContext
    from app.db.models import User, StudentProfile, UserRole, UserStatus

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    existing = db.query(User).filter(User.email == "test_student@test.com").first()
    if not existing:
        user = User(
            email="test_student@test.com",
            name="Test Student",
            password_hash=pwd_ctx.hash("student123"),
            role=UserRole.student,
            status=UserStatus.active,
        )
        db.add(user)
        db.flush()
        profile = StudentProfile(
            user_id=user.id,
            roll_no="TEST001",
            program="B.Tech",
            semester=3,
            is_demo=True,
        )
        db.add(profile)
        db.commit()

    resp = client.post(
        "/api/auth/login",
        data={"username": "test_student@test.com", "password": "student123"},
    )
    assert resp.status_code == 200, f"Student login failed: {resp.text}"
    return resp.json()["access_token"]
