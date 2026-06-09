"""
Quiz + summary generation orchestration.

Builds teaching-focused, Bloom's-Taxonomy-aware prompts, calls the chosen AI
provider, and parses/normalises the JSON output. Bloom's levels are applied
AUTOMATICALLY by the model (a sensible spread) rather than being chosen by the
end user.
"""
from __future__ import annotations

import json
import re
from typing import List

from app.services.ai_providers import BaseProvider, ProviderError

# Full Bloom's spread the model is told to distribute across automatically.
BLOOM_GUIDE = {
    "Remember": "recall facts, terms, basic concepts",
    "Understand": "explain ideas or concepts in plain language",
    "Apply": "use information in a new situation",
    "Analyze": "compare, break down, find relationships",
    "Evaluate": "judge, justify, or critique",
    "Create": "design or propose something new",
}

QTYPE_GUIDE = {
    "mcq": "multiple choice with exactly 4 distinct, plausible options and one correct",
    "true_false": "a meaningful statement answerable as True or False (options = ['True','False'])",
    "short_answer": "a question answered in a short phrase (options = [])",
    "scenario": "a short realistic scenario followed by an applied question with 4 options",
    "fill_blank": (
        "a sentence with ONE blank shown as '_____'; the correct_answer is the exact "
        "word/phrase that fills the blank; options = [] (no multiple choice)"
    ),
}

# Strong rules so the model produces *teaching* questions, not trivia/nonsense.
QUALITY_RULES = """
CRITICAL QUALITY RULES (follow ALL — failure to follow makes the quiz useless):
- Every question must teach something specific. A reader who is NEW to the topic
  should learn a real fact/concept by reading the question + answer + explanation.
- Each question MUST cover a DIFFERENT concept, sub-topic, or angle. Absolutely NO
  repeated, reworded, or template-style questions. Do NOT reuse the same sentence
  frame (e.g. never write multiple "Which statement best demonstrates understanding
  of X?" questions). Vary the wording, focus, and difficulty of every single item.
- Ask about concrete ideas, mechanisms, examples, comparisons, causes/effects,
  trade-offs, and applications — NOT vague "which best describes" filler.
- NEVER ask meta/text-lookup questions such as "which line appears in the text",
  "what does the passage say", or anything about the wording/formatting of the
  source. Ask about the IDEAS themselves.
- Distractors (wrong options) must be plausible, specific, and related — never
  silly, joke, or obviously-wrong options.
- The explanation must say WHY the answer is correct AND briefly why it matters.
- Keep language clear and beginner-friendly.
"""

SYSTEM_PROMPT = (
    "You are an expert teacher and instructional designer. You write clear, "
    "accurate, beginner-friendly assessment content that helps people genuinely "
    "learn. You ALWAYS respond with a single valid JSON object and nothing else."
)


# --------------------------------------------------------------------------- #
# Summary generation (Step 2 of the wizard)
# --------------------------------------------------------------------------- #
SUMMARY_SYSTEM = (
    "You are an expert tutor who explains topics so clearly that a complete "
    "beginner can understand. You ALWAYS respond with a single valid JSON object."
)


def build_summary_prompt(content: str, context_label: str) -> str:
    """Ask the model for a rich, structured teaching summary."""
    return f"""
Read the following {context_label} and produce a clear teaching summary that helps
a beginner understand it BEFORE they take a quiz.

{context_label.upper()}:
\"\"\"
{content}
\"\"\"

Respond ONLY with JSON in this exact shape:
{{
  "title": "a concise title for this material",
  "overview": "2-4 sentence plain-language overview of what this is about",
  "key_concepts": [
    {{"concept": "name of concept", "explanation": "1-2 sentence beginner-friendly explanation"}}
  ],
  "takeaways": ["3-6 short, important things the learner should remember"]
}}
Rules:
- 4 to 8 key_concepts.
- No markdown, JSON only.
""".strip()


def generate_summary(provider: BaseProvider, content: str, context_label: str) -> dict:
    raw = provider.complete(build_summary_prompt(content, context_label), system=SUMMARY_SYSTEM)
    try:
        parsed = _extract_json(raw)
    except json.JSONDecodeError as e:
        raise ProviderError(f"The model returned invalid JSON for the summary. ({e})") from e
    return {
        "title": str(parsed.get("title", "Summary")).strip()[:255],
        "overview": str(parsed.get("overview", "")).strip(),
        "key_concepts": [
            {
                "concept": str(c.get("concept", "")).strip(),
                "explanation": str(c.get("explanation", "")).strip(),
            }
            for c in parsed.get("key_concepts", [])
            if isinstance(c, dict)
        ][:8],
        "takeaways": [str(t).strip() for t in parsed.get("takeaways", []) if str(t).strip()][:6],
    }


# --------------------------------------------------------------------------- #
# Quiz generation (Step 3 of the wizard)
# --------------------------------------------------------------------------- #
def _json_schema_block(num: int, types: List[str], difficulty: str) -> str:
    type_desc = "; ".join(f"{t} ({QTYPE_GUIDE.get(t, '')})" for t in types)
    allowed_types = " or ".join(f'"{t}"' for t in types)
    bloom_desc = "; ".join(f"{b} ({d})" for b, d in BLOOM_GUIDE.items())
    return f"""
Produce EXACTLY {num} DISTINCT questions (no repeats, no near-duplicates).

STRICT QUESTION TYPE REQUIREMENT:
Use ONLY these question type(s): {type_desc}.
The "qtype" of EVERY question MUST be exactly one of: {allowed_types}.
Do NOT include any other question type. If only one type is allowed, EVERY
question must be that type.

STRICT DIFFICULTY REQUIREMENT:
EVERY question must be at "{difficulty}" difficulty. Set "difficulty" to exactly
"{difficulty}" for ALL questions — do NOT mix in easier or harder questions.

AUTOMATICALLY assign a Bloom's Taxonomy level to each question (this is separate
from difficulty) and vary them sensibly: {bloom_desc}.

{QUALITY_RULES}

Respond ONLY with JSON in this exact shape:
{{
  "title": "concise quiz title",
  "questions": [
    {{
      "qtype": {allowed_types},
      "text": "the question",
      "options": ["A","B","C","D"],
      "correct_answer": "exact correct option text (or expected short answer)",
      "explanation": "why it's correct + why the concept matters",
      "bloom_level": "Remember|Understand|Apply|Analyze|Evaluate|Create",
      "difficulty": "{difficulty}"
    }}
  ]
}}
Rules:
- short_answer => "options": [].
- fill_blank => "options": []; include exactly one "_____" blank in the text.
- true_false => "options": ["True","False"].
- For mcq/true_false/scenario, correct_answer MUST exactly match one option.
- No markdown fences. JSON only.
""".strip()


def build_topic_prompt(subject, topic, num, types, difficulty) -> str:
    return (
        f"Create a quiz that TEACHES this topic.\nSubject: {subject}\nTopic: {topic}\n\n"
        + _json_schema_block(num, types, difficulty)
    )


def build_prompt_based_prompt(user_prompt, num, types, difficulty) -> str:
    return (
        f"The user described the quiz they want:\n\"\"\"\n{user_prompt}\n\"\"\"\n\n"
        f"Honour their request, but make the quiz genuinely educational.\n"
        + _json_schema_block(num, types, difficulty)
    )


def build_pdf_prompt(content, num, types, difficulty) -> str:
    return (
        "Create a quiz that helps a reader UNDERSTAND the ideas in the source "
        "material below. Base questions on the CONCEPTS, not on the wording.\n\n"
        f"SOURCE MATERIAL:\n\"\"\"\n{content}\n\"\"\"\n\n"
        + _json_schema_block(num, types, difficulty)
    )


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def normalise_questions(
    parsed: dict,
    allowed_types: List[str] | None = None,
    forced_difficulty: str | None = None,
) -> tuple[str, list[dict]]:
    """
    Clean & validate the model output.

    - allowed_types: if given, drop any question whose qtype isn't requested
      (safety net so "MCQ only" really means MCQ only).
    - forced_difficulty: if given, force every question to this difficulty
      (so the chosen level isn't mixed).
    """
    title = (parsed.get("title") or "Generated Quiz").strip()[:255]
    out = []
    seen = set()
    allowed = {t.strip().lower() for t in allowed_types} if allowed_types else None
    for q in parsed.get("questions", []):
        text = str(q.get("text", "")).strip()
        if not text:
            continue
        key = re.sub(r"\W+", "", text.lower())[:80]  # dedupe near-identical questions
        if key in seen:
            continue
        qtype = (q.get("qtype") or "mcq").strip().lower()
        # Enforce requested question types.
        if allowed and qtype not in allowed:
            continue
        seen.add(key)
        options = q.get("options") or []
        if not isinstance(options, list):
            options = []
        options = [str(o).strip() for o in options][:4]
        out.append(
            {
                "order": len(out),
                "qtype": qtype,
                "text": text,
                "options": options,
                "correct_answer": str(q.get("correct_answer", "")).strip(),
                "explanation": str(q.get("explanation", "")).strip(),
                "bloom_level": str(q.get("bloom_level", "")).strip(),
                # Enforce requested difficulty.
                "difficulty": (forced_difficulty or str(q.get("difficulty", "")).strip()),
            }
        )
    return title, out


def generate_quiz(
    provider: BaseProvider,
    prompt: str,
    allowed_types: List[str] | None = None,
    forced_difficulty: str | None = None,
) -> tuple[str, list[dict]]:
    raw = provider.complete(prompt, system=SYSTEM_PROMPT)
    try:
        parsed = _extract_json(raw)
    except json.JSONDecodeError as e:
        raise ProviderError(f"The model returned invalid JSON. Try again. ({e})") from e
    title, questions = normalise_questions(parsed, allowed_types, forced_difficulty)
    if not questions:
        raise ProviderError("The model returned no questions. Try again or switch provider.")
    return title, questions
