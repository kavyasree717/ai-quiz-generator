"""API key management schemas (keys are never returned in plaintext)."""
from typing import Optional

from pydantic import BaseModel


class ApiKeyUpsert(BaseModel):
    provider: str  # gemini | openai | groq | openrouter
    api_key: str
    model: Optional[str] = ""


class ApiKeyOut(BaseModel):
    provider: str
    masked_key: str
    model: str
    is_set: bool
