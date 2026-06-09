"""Quiz + summary generation request/response schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

QUESTION_TYPES = ["mcq", "true_false", "short_answer", "scenario", "fill_blank"]


# --------------------------------------------------------------------------- #
# Summary (Step 2)
# --------------------------------------------------------------------------- #
class TopicSummaryRequest(BaseModel):
    subject: str = ""
    topic: str


class PromptSummaryRequest(BaseModel):
    prompt: str


class KeyConcept(BaseModel):
    concept: str
    explanation: str


class SummaryOut(BaseModel):
    title: str
    overview: str
    key_concepts: List[KeyConcept]
    takeaways: List[str]
    source_type: str
    # Echoed back so the frontend can pass it to the quiz step unchanged.
    content: str = ""
    subject: str = ""
    topic: str = ""
    prompt: str = ""


# --------------------------------------------------------------------------- #
# Quiz generation (Step 3) — Bloom levels are automatic, provider is in Settings
# --------------------------------------------------------------------------- #
class GenerationOptions(BaseModel):
    num_questions: int = Field(default=10, ge=1, le=50)
    difficulty: str = "Medium"
    question_types: List[str] = Field(default_factory=lambda: ["mcq"])


class TopicGenerateRequest(GenerationOptions):
    subject: str = ""
    topic: str


class PromptGenerateRequest(GenerationOptions):
    prompt: str
    title: Optional[str] = None


class PdfGenerateRequest(GenerationOptions):
    # The extracted text is carried from the summary step.
    content: str
    title: Optional[str] = None


class RegenerateRequest(GenerationOptions):
    prompt: str
    title: Optional[str] = None


class QuestionOut(BaseModel):
    id: str
    order: int
    qtype: str
    text: str
    options: List[str]
    correct_answer: str
    explanation: str
    bloom_level: str
    difficulty: str


class QuizOut(BaseModel):
    id: str
    title: str
    subject: str
    topic: str
    difficulty: str
    source_type: str
    generation_prompt: str
    bloom_levels: str
    created_at: datetime
    provider_used: str = ""
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class QuizSummary(BaseModel):
    id: str
    title: str
    subject: str
    source_type: str
    difficulty: str
    created_at: datetime
    question_count: int
