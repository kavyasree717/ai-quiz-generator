"""
AI Quiz Generator — FastAPI application entrypoint.

An educational, AI-powered platform that generates Bloom's-Taxonomy-aligned
quizzes from PDFs, topics, or custom prompts.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, quizzes, settings as settings_routes
from app.core.config import settings
from app.db.session import init_db

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Generate Bloom's-Taxonomy quizzes from PDFs, topics, or prompts.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "app": settings.APP_NAME}


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_routes.router, prefix=settings.API_V1_PREFIX)
app.include_router(quizzes.router, prefix=settings.API_V1_PREFIX)
