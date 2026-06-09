"""Quiz and Question models with saved generation prompt for regeneration."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(255), default="Untitled Quiz")
    subject: Mapped[str] = mapped_column(String(160), default="")
    topic: Mapped[str] = mapped_column(String(255), default="")
    difficulty: Mapped[str] = mapped_column(String(40), default="Medium")

    # How it was made: pdf | topic | prompt
    source_type: Mapped[str] = mapped_column(String(20), default="prompt")
    # The exact prompt used so the user can edit & regenerate.
    generation_prompt: Mapped[str] = mapped_column(Text, default="")
    bloom_levels: Mapped[str] = mapped_column(String(255), default="")  # comma separated

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="quizzes")
    questions = relationship(
        "Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    quiz_id: Mapped[str] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), index=True)

    order: Mapped[int] = mapped_column(Integer, default=0)
    qtype: Mapped[str] = mapped_column(String(30), default="mcq")  # mcq/true_false/short_answer/scenario
    text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str] = mapped_column(Text, default="[]")  # JSON-encoded list[str]
    correct_answer: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    bloom_level: Mapped[str] = mapped_column(String(40), default="")
    difficulty: Mapped[str] = mapped_column(String(40), default="")

    quiz = relationship("Quiz", back_populates="questions")
