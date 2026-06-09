"""
Quiz routes implementing the 3-step wizard:
  Step 1: user provides input (topic / prompt / PDF) + options
  Step 2: /summary  -> AI reads the input and returns a teaching summary
  Step 3: /generate -> AI builds a teaching quiz from the same input

Bloom's levels are applied automatically by the model. The AI provider is taken
from the user's Settings, with automatic fallback across configured keys.
"""
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, run_with_fallback
from app.core.config import settings
from app.db.session import get_db
from app.models import Question, Quiz, User
from app.schemas.quiz import (
    PdfGenerateRequest,
    PromptGenerateRequest,
    PromptSummaryRequest,
    QuizOut,
    QuizSummary,
    RegenerateRequest,
    SummaryOut,
    TopicGenerateRequest,
    TopicSummaryRequest,
)
from app.services import pdf_service, quiz_service
from app.services.export_service import build_quiz_pdf

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _persist_quiz(db, user, *, title, subject, topic, difficulty, source_type,
                  prompt, questions) -> Quiz:
    blooms = sorted({q["bloom_level"] for q in questions if q["bloom_level"]})
    quiz = Quiz(
        user_id=user.id, title=title, subject=subject, topic=topic,
        difficulty=difficulty, source_type=source_type,
        generation_prompt=prompt, bloom_levels=",".join(blooms),
    )
    db.add(quiz)
    db.flush()
    for q in questions:
        db.add(Question(
            quiz_id=quiz.id, order=q["order"], qtype=q["qtype"], text=q["text"],
            options=json.dumps(q["options"]), correct_answer=q["correct_answer"],
            explanation=q["explanation"], bloom_level=q["bloom_level"], difficulty=q["difficulty"],
        ))
    db.commit()
    db.refresh(quiz)
    return quiz


def _serialize(quiz: Quiz, provider_used: str = "") -> dict:
    return {
        "id": quiz.id, "title": quiz.title, "subject": quiz.subject, "topic": quiz.topic,
        "difficulty": quiz.difficulty, "source_type": quiz.source_type,
        "generation_prompt": quiz.generation_prompt, "bloom_levels": quiz.bloom_levels,
        "created_at": quiz.created_at, "provider_used": provider_used,
        "questions": [
            {
                "id": q.id, "order": q.order, "qtype": q.qtype, "text": q.text,
                "options": json.loads(q.options or "[]"), "correct_answer": q.correct_answer,
                "explanation": q.explanation, "bloom_level": q.bloom_level, "difficulty": q.difficulty,
            }
            for q in quiz.questions
        ],
    }


# --------------------------------------------------------------------------- #
# STEP 2: Summaries
# --------------------------------------------------------------------------- #
@router.post("/summary/topic", response_model=SummaryOut)
def summary_topic(payload: TopicSummaryRequest, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    content = f"Subject: {payload.subject}\nTopic: {payload.topic}"
    result, _ = run_with_fallback(
        db, user, lambda p: quiz_service.generate_summary(p, content, "topic")
    )
    return SummaryOut(**result, source_type="topic", subject=payload.subject,
                      topic=payload.topic, content=content)


@router.post("/summary/prompt", response_model=SummaryOut)
def summary_prompt(payload: PromptSummaryRequest, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    result, _ = run_with_fallback(
        db, user, lambda p: quiz_service.generate_summary(p, payload.prompt, "request")
    )
    return SummaryOut(**result, source_type="prompt", prompt=payload.prompt, content=payload.prompt)


@router.post("/summary/pdf", response_model=SummaryOut)
async def summary_pdf(file: UploadFile = File(...), user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")
    try:
        text = pdf_service.extract_text(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")
    if len(text.strip()) < 50:
        raise HTTPException(status_code=400,
                            detail="No extractable text found (scanned/image-only PDFs aren't supported).")
    result, _ = run_with_fallback(
        db, user, lambda p: quiz_service.generate_summary(p, text, "document")
    )
    return SummaryOut(**result, source_type="pdf", content=text)


# --------------------------------------------------------------------------- #
# STEP 3: Quiz generation
# --------------------------------------------------------------------------- #
@router.post("/generate/topic", response_model=QuizOut)
def generate_topic(payload: TopicGenerateRequest, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    prompt = quiz_service.build_topic_prompt(
        payload.subject, payload.topic, payload.num_questions,
        payload.question_types, payload.difficulty)
    (title, questions), used = run_with_fallback(
        db, user, lambda p: quiz_service.generate_quiz(p, prompt, allowed_types=payload.question_types, forced_difficulty=payload.difficulty))
    quiz = _persist_quiz(db, user, title=title or f"{payload.topic} Quiz",
                         subject=payload.subject, topic=payload.topic,
                         difficulty=payload.difficulty, source_type="topic",
                         prompt=prompt, questions=questions)
    return _serialize(quiz, used)


@router.post("/generate/prompt", response_model=QuizOut)
def generate_prompt(payload: PromptGenerateRequest, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    prompt = quiz_service.build_prompt_based_prompt(
        payload.prompt, payload.num_questions, payload.question_types, payload.difficulty)
    (title, questions), used = run_with_fallback(
        db, user, lambda p: quiz_service.generate_quiz(p, prompt, allowed_types=payload.question_types, forced_difficulty=payload.difficulty))
    quiz = _persist_quiz(db, user, title=payload.title or title, subject="", topic="",
                         difficulty=payload.difficulty, source_type="prompt",
                         prompt=prompt, questions=questions)
    return _serialize(quiz, used)


@router.post("/generate/pdf", response_model=QuizOut)
def generate_pdf(payload: PdfGenerateRequest, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if len(payload.content.strip()) < 50:
        raise HTTPException(status_code=400, detail="Missing extracted PDF content.")
    prompt = quiz_service.build_pdf_prompt(
        payload.content, payload.num_questions, payload.question_types, payload.difficulty)
    (title, questions), used = run_with_fallback(
        db, user, lambda p: quiz_service.generate_quiz(p, prompt, allowed_types=payload.question_types, forced_difficulty=payload.difficulty))
    quiz = _persist_quiz(db, user, title=payload.title or title, subject="",
                         topic="", difficulty=payload.difficulty, source_type="pdf",
                         prompt=prompt, questions=questions)
    return _serialize(quiz, used)


@router.post("/{quiz_id}/regenerate", response_model=QuizOut)
def regenerate(quiz_id: str, payload: RegenerateRequest, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    old = db.get(Quiz, quiz_id)
    if not old or old.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    prompt = quiz_service.build_prompt_based_prompt(
        payload.prompt, payload.num_questions, payload.question_types, payload.difficulty)
    (title, questions), used = run_with_fallback(
        db, user, lambda p: quiz_service.generate_quiz(p, prompt, allowed_types=payload.question_types, forced_difficulty=payload.difficulty))
    quiz = _persist_quiz(db, user, title=payload.title or title or old.title,
                         subject=old.subject, topic=old.topic, difficulty=payload.difficulty,
                         source_type=old.source_type, prompt=prompt, questions=questions)
    return _serialize(quiz, used)


# --------------------------------------------------------------------------- #
# Library / export
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[QuizSummary])
def list_quizzes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.user_id == user.id).order_by(Quiz.created_at.desc()).all()
    return [QuizSummary(id=q.id, title=q.title, subject=q.subject, source_type=q.source_type,
                        difficulty=q.difficulty, created_at=q.created_at,
                        question_count=len(q.questions)) for q in quizzes]


@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(quiz_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return _serialize(quiz)


@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(quiz_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    db.delete(quiz)
    db.commit()
    return None


@router.get("/{quiz_id}/export")
def export_quiz(quiz_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    pdf_bytes = build_quiz_pdf(_serialize(quiz))
    filename = (quiz.title or "quiz").replace(" ", "_")[:60] + ".pdf"
    return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})
