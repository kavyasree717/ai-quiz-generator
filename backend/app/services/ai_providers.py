"""
Pluggable AI provider layer.

Each provider implements `complete(prompt, system) -> str` returning raw text
(expected to be JSON). All providers use the OpenAI-compatible REST shape where
possible; Gemini uses its own endpoint. Adding a provider = add a subclass and
register it in PROVIDERS.

Free-tier friendly providers supported out of the box:
  - gemini      (Google AI Studio - generous free tier)
  - groq        (free, very fast Llama / Mixtral models)
  - openrouter  (many free models, e.g. ':free' suffixed models)
  - openai      (paid, but standard)
"""
from __future__ import annotations

import httpx

TIMEOUT = httpx.Timeout(90.0, connect=15.0)


class ProviderError(Exception):
    """Raised when an upstream provider call fails."""


class BaseProvider:
    name = "base"
    default_model = ""

    def __init__(self, api_key: str, model: str = ""):
        self.api_key = api_key
        self.model = model or self.default_model

    def complete(self, prompt: str, system: str = "") -> str:
        raise NotImplementedError


class OpenAICompatProvider(BaseProvider):
    """Works for OpenAI, Groq and OpenRouter (chat/completions shape)."""
    base_url = ""

    def complete(self, prompt: str, system: str = "") -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
        }
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                r = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
        except httpx.HTTPError as e:
            raise ProviderError(f"Network error contacting {self.name}: {e}") from e

        if r.status_code != 200:
            # Some free models reject response_format; retry once without it.
            if "response_format" in payload:
                payload.pop("response_format")
                with httpx.Client(timeout=TIMEOUT) as client:
                    r = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
        if r.status_code != 200:
            raise ProviderError(f"{self.name} error {r.status_code}: {r.text[:300]}")

        data = r.json()
        return data["choices"][0]["message"]["content"]


class OpenAIProvider(OpenAICompatProvider):
    name = "openai"
    base_url = "https://api.openai.com/v1"
    default_model = "gpt-4o-mini"


class GroqProvider(OpenAICompatProvider):
    name = "groq"
    base_url = "https://api.groq.com/openai/v1"
    default_model = "llama-3.3-70b-versatile"


class OpenRouterProvider(OpenAICompatProvider):
    name = "openrouter"
    base_url = "https://openrouter.ai/api/v1"
    default_model = "google/gemma-3-27b-it:free"


class GeminiProvider(BaseProvider):
    name = "gemini"
    default_model = "gemini-1.5-flash"

    def complete(self, prompt: str, system: str = "") -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )
        full = f"{system}\n\n{prompt}" if system else prompt
        payload = {
            "contents": [{"parts": [{"text": full}]}],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json",
            },
        }
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                r = client.post(url, json=payload)
        except httpx.HTTPError as e:
            raise ProviderError(f"Network error contacting Gemini: {e}") from e

        if r.status_code != 200:
            raise ProviderError(f"Gemini error {r.status_code}: {r.text[:300]}")
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            raise ProviderError(f"Unexpected Gemini response: {str(data)[:300]}") from e


PROVIDERS = {
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
    "groq": GroqProvider,
    "openrouter": OpenRouterProvider,
}

# Metadata exposed to the frontend Settings page.
PROVIDER_META = [
    {
        "id": "gemini",
        "label": "Google Gemini",
        "free": True,
        "default_model": GeminiProvider.default_model,
        "get_key_url": "https://aistudio.google.com/app/apikey",
        "note": "Generous free tier. Recommended default.",
    },
    {
        "id": "groq",
        "label": "Groq (Llama / Mixtral)",
        "free": True,
        "default_model": GroqProvider.default_model,
        "get_key_url": "https://console.groq.com/keys",
        "note": "Free and extremely fast.",
    },
    {
        "id": "openrouter",
        "label": "OpenRouter",
        "free": True,
        "default_model": OpenRouterProvider.default_model,
        "get_key_url": "https://openrouter.ai/keys",
        "note": "Access many free models (use a ':free' model).",
    },
    {
        "id": "openai",
        "label": "OpenAI",
        "free": False,
        "default_model": OpenAIProvider.default_model,
        "get_key_url": "https://platform.openai.com/api-keys",
        "note": "Paid. Highest quality.",
    },
]


def build_provider(provider_id: str, api_key: str, model: str = "") -> BaseProvider:
    cls = PROVIDERS.get(provider_id)
    if not cls:
        raise ProviderError(f"Unknown provider '{provider_id}'")
    return cls(api_key=api_key, model=model)
