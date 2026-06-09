"""Encrypted third-party provider API keys, one row per (user, provider)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ApiKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_provider"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    provider: Mapped[str] = mapped_column(String(40), nullable=False)  # gemini/openai/groq/openrouter
    encrypted_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    model: Mapped[str] = mapped_column(String(120), default="")  # optional preferred model

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="api_keys")
