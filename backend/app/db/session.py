"""Database engine and session management (SQLAlchemy 2.x)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite needs a special connect arg; other DBs ignore it.
connect_args = (
    {"check_same_thread": False}
    if settings.sqlalchemy_url.startswith("sqlite")
    else {}
)

engine = create_engine(settings.sqlalchemy_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""
    pass


def get_db():
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables. For real production use Alembic migrations instead."""
    # Import models so they register on the metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
