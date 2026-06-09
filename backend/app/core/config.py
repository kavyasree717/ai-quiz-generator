"""
Application configuration.

All settings are read from environment variables (with sensible defaults for
local development). In production you MUST override SECRET_KEY and
ENCRYPTION_KEY with strong, randomly generated values.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings loaded from the environment / .env file."""

    # --- General ---
    APP_NAME: str = "AI Quiz Generator"
    API_V1_PREFIX: str = "/api"
    DEBUG: bool = True

    # --- Database ---
    # Default to local SQLite; swap to a Postgres URL in production, e.g.
    # postgresql+psycopg://user:pass@host:5432/quizdb
    DATABASE_URL: str = "sqlite:///./quiz.db"

    # --- Security ---
    # Used to sign JWT access tokens. CHANGE THIS in production.
    SECRET_KEY: str = "CHANGE-ME-dev-secret-key-please-override-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Fernet key used to encrypt provider API keys at rest.
    # Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # If left empty, one is derived from SECRET_KEY (fine for dev, not prod).
    ENCRYPTION_KEY: str = ""

    # --- CORS ---
    # Comma separated list of allowed origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # --- Uploads ---
    MAX_UPLOAD_MB: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        """
        Normalise the DATABASE_URL so it works with SQLAlchemy + psycopg v3.

        Managed Postgres hosts (Render, Heroku, Railway, etc.) hand out URLs like
        `postgres://...` or `postgresql://...`. SQLAlchemy needs an explicit
        driver, so we coerce those to `postgresql+psycopg://...`.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
