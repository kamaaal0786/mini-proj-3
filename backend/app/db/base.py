import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings


def _get_database_url() -> str:
    """Read DATABASE_URL, forcing SQLite for the demo to avoid Postgres connection errors."""
    url = os.environ.get("DATABASE_URL") or get_settings().database_url
    if "postgres" in url:
        from app.config import DB_PATH
        return f"sqlite:///{DB_PATH}"
    return url


def _make_engine():
    url = _get_database_url()
    kwargs = {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}
    # SQLite (used in tests) doesn't support pool_size/max_overflow
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
    return create_engine(url, **kwargs)


engine = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist. Called at app startup."""
    # Import models so SQLAlchemy registers them with Base before create_all
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
