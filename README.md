# 📘 AI Quiz Generator

An educational, AI-powered platform that lets students and teachers learn from
**PDFs**, **topics**, or **custom prompts** through a simple **3-step flow**:

1. **Provide info** — choose a method (PDF / Topic / Prompt) and pick question types.
2. **Read the summary** — the AI reads your input and explains it (overview, key
   concepts, takeaways) so even a beginner understands *before* the quiz.
3. **Take the quiz** — the AI builds a teaching quiz where **Bloom's Taxonomy
   levels are applied automatically** (recall → higher-order thinking).

Other highlights:
- **No provider picker in the way** — the AI provider lives in **Settings**, with
  **automatic fallback**: if your default key hits a rate limit, the app switches
  to your next saved key automatically.
- Export any quiz to a **printable PDF** with answer key + explanations.
- Clean, polished, **notebook/classroom-inspired** UI.

## ▶ Quick start (one command)
```bash
bash start.sh        # sets up + runs backend (:8000) and frontend (:5173)
```
Then open **http://localhost:5173** — you'll land on the home page. Click
**Start Generating** (or **Sign In**), create your own account (any email &
password), add a free API key in **Settings**, and you're in the 3-step flow.

Pages:
- `/`         — landing / home page
- `/login`    — sign up / log in
- `/create`   — the 3-step quiz wizard (protected)
- `/library`  — your saved quizzes (protected)
- `/settings` — profile + API keys with auto-fallback (protected)

🌗 A **dark-mode toggle** (moon/sun icon) lives in the top navbar.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **3 generation methods** | 📚 By Topic (subject/topic/difficulty/count) · 💬 By Prompt (free-text) · 📄 From PDF (upload notes/textbooks) |
| **Bloom's Taxonomy** | Choose any of Remember / Understand / Apply / Analyze / Evaluate / Create; every question is tagged |
| **Question types** | MCQ · True/False · Short Answer · Scenario-based |
| **Per-question detail** | Question, 4 options, correct answer, detailed explanation, Bloom tag, difficulty tag |
| **Prompt editing** | See the original generation prompt, edit it, and **Regenerate Quiz** |
| **PDF analysis** | Extracts text, detects key concepts, builds context-aware questions |
| **PDF export** | Printable quiz with title, questions, options, **answer key** & explanations |
| **Switchable AI providers** | Bring your own **free** API key: Gemini, Groq, OpenRouter (or paid OpenAI). Change in Settings |
| **Settings** | User profile (name, institution, role, bio) + encrypted API-key manager with test/remove |
| **Accounts & history** | JWT auth, saved quiz library per user |

---

## 🏗️ Architecture

```
┌──────────────┐        HTTPS / JSON        ┌────────────────────┐
│  React (Vite)│  ───────────────────────▶  │  FastAPI (Python)  │
│  SPA frontend│  ◀───────────────────────  │  REST API          │
└──────────────┘                            └─────────┬──────────┘
                                                       │
                          ┌────────────────────────────┼───────────────────────────┐
                          ▼                            ▼                            ▼
                   ┌─────────────┐            ┌──────────────────┐         ┌────────────────┐
                   │ SQLAlchemy  │            │  AI Provider     │         │  PDF services  │
                   │  + DB       │            │  layer (Gemini / │         │  pypdf extract │
                   │ (SQLite/PG) │            │  Groq/OpenRouter)│         │  reportlab gen │
                   └─────────────┘            └──────────────────┘         └────────────────┘
```

### Backend folder structure
```
backend/
├── app/
│   ├── main.py                 # FastAPI app + router wiring
│   ├── core/
│   │   ├── config.py           # env-driven settings
│   │   └── security.py         # bcrypt, JWT, Fernet encryption
│   ├── db/
│   │   └── session.py          # engine/session, init_db
│   ├── models/                 # SQLAlchemy ORM (User, ApiKey, Quiz, Question)
│   ├── schemas/                # Pydantic request/response models
│   ├── services/
│   │   ├── ai_providers.py     # pluggable provider abstraction
│   │   ├── quiz_service.py     # Bloom-aware prompt building + parsing
│   │   ├── pdf_service.py      # text extraction + concept detection
│   │   └── export_service.py   # PDF export (reportlab)
│   └── api/
│       ├── deps.py             # auth + provider resolution dependencies
│       ├── auth.py             # /auth (register, login, profile)
│       ├── settings.py         # /settings (providers, encrypted keys)
│       └── quizzes.py          # /quizzes (generate, regenerate, export…)
├── requirements.txt
├── Dockerfile
└── .env.example
```

### Frontend folder structure
```
frontend/
├── src/
│   ├── api/client.js           # fetch wrapper + JWT
│   ├── context/AuthContext.jsx # auth state
│   ├── components/             # Navbar, QuizView, GenerationControls, PromptEditor…
│   ├── pages/                  # Login, Create, Library, Settings
│   ├── styles/index.css        # notebook theme
│   ├── App.jsx                 # routes
│   └── main.jsx
├── package.json
├── vite.config.js              # dev proxy to backend
├── Dockerfile + nginx.conf
```

---

## 🗄️ Database Schema

**users**
| column | type | notes |
|--------|------|-------|
| id | uuid (PK) | |
| email | string, unique | login |
| hashed_password | string | bcrypt |
| full_name, institution, role, bio | string | profile |
| default_provider | string | preferred AI provider |
| created_at | datetime | |

**api_keys** (unique per user+provider)
| column | type | notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | FK → users | |
| provider | string | gemini/openai/groq/openrouter |
| encrypted_key | string | **Fernet-encrypted** at rest |
| model | string | optional preferred model |

**quizzes**
| column | type | notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | FK → users | |
| title, subject, topic, difficulty | string | |
| source_type | string | pdf / topic / prompt |
| generation_prompt | text | saved for **regeneration** |
| bloom_levels | string | comma-separated |
| created_at | datetime | |

**questions**
| column | type | notes |
|--------|------|-------|
| id | uuid (PK) | |
| quiz_id | FK → quizzes | |
| order | int | |
| qtype | string | mcq/true_false/short_answer/scenario |
| text | text | |
| options | text | JSON list |
| correct_answer, explanation | text | |
| bloom_level, difficulty | string | tags |

---

## 🔌 API Design

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | health check |
| POST | `/api/auth/register` | create account → JWT |
| POST | `/api/auth/login` | login → JWT |
| GET/PUT | `/api/auth/me` | get / update profile |
| GET | `/api/settings/providers` | provider metadata (free flags, key URLs) |
| GET | `/api/settings/keys` | list keys (masked) |
| PUT | `/api/settings/keys` | add/replace a key (encrypted) |
| DELETE | `/api/settings/keys/{provider}` | remove key |
| POST | `/api/settings/keys/{provider}/test` | verify key works |
| POST | `/api/quizzes/generate/topic` | generate from subject+topic |
| POST | `/api/quizzes/generate/prompt` | generate from free-text prompt |
| POST | `/api/quizzes/generate/pdf` | generate from uploaded PDF (multipart) |
| POST | `/api/quizzes/{id}/regenerate` | regenerate with edited prompt |
| GET | `/api/quizzes` | list user's quizzes |
| GET | `/api/quizzes/{id}` | full quiz |
| DELETE | `/api/quizzes/{id}` | delete |
| GET | `/api/quizzes/{id}/export` | download PDF |

Interactive docs available at **`/docs`** (Swagger) when the backend runs.

---

## 🔐 Security Best Practices

- **Passwords**: hashed with bcrypt (never stored in plaintext).
- **Auth**: stateless JWT bearer tokens, signed with `SECRET_KEY`.
- **API keys at rest**: symmetric **Fernet encryption** (`ENCRYPTION_KEY`); only a
  masked preview (`gsk••••3456`) is ever returned to the client.
- **Authorization**: every quiz/key query is scoped to the authenticated user.
- **CORS**: locked to configured origins.
- **Uploads**: size-limited (`MAX_UPLOAD_MB`) and PDF-type validated.
- **Secrets via env**: nothing hard-coded; `.env` is git-ignored.

> ⚠️ In production you **must** set strong `SECRET_KEY` and `ENCRYPTION_KEY`
> (see commands below) and use Postgres + HTTPS.

---

## 🚀 Getting Started (local)

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit secrets (see below)
uvicorn app.main:app --reload --port 8000
```
Generate strong secrets and paste into `.env`:
```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api → :8000)
```

### 3. Use it
1. Sign up at `http://localhost:5173`.
2. Go to **Settings → AI API Keys**, grab a **free** key:
   - **Gemini** → https://aistudio.google.com/app/apikey
   - **Groq** → https://console.groq.com/keys
   - **OpenRouter** → https://openrouter.ai/keys (use a `:free` model)
3. Save & **Test** the key.
4. Go to **Create**, pick a method, generate, edit/regenerate, and **Export PDF**.

---

## 🐳 Deployment

### Docker Compose (Postgres + backend + frontend)
```bash
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())")
docker compose up --build
# frontend → http://localhost:8080   backend → http://localhost:8000
```

### Recommended production setup
- **Frontend**: build (`npm run build`) and serve `dist/` via Nginx/CDN (Vercel/Netlify also work).
- **Backend**: run `uvicorn`/`gunicorn` workers behind a reverse proxy with HTTPS.
- **Database**: managed Postgres; switch `DATABASE_URL` accordingly.
- **Migrations**: for schema evolution, add **Alembic** (current code auto-creates tables for convenience).
- **Scaling**: backend is stateless → scale horizontally; AI calls are per-request with the user's own key.

---

## 🧩 Extending

- **Add an AI provider**: subclass `BaseProvider` in `services/ai_providers.py`,
  add it to `PROVIDERS` and `PROVIDER_META`. The UI picks it up automatically.
- **Add a question type**: extend `QUESTION_TYPES` + `QTYPE_GUIDE` and the UI chip list.

---

## 📄 License
MIT — free to use for personal development and learning.
