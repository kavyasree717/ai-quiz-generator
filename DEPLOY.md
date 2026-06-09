# 🚀 Deploy AI Quiz Generator (free, public URL)

This gets your app online with a real URL you can open from any browser/phone.

**Stack:**
- **Backend** (FastAPI) → **Render** free web service + free **Postgres**
- **Frontend** (React/Vite) → **Vercel** free static hosting

Total time: ~15 minutes. No credit card required for the free tiers.

---

## Step 0 — Put the code on GitHub

1. Create a free account at <https://github.com> if you don't have one.
2. Create a new **empty** repository, e.g. `ai-quiz-generator`.
3. From the project folder on your computer:
   ```bash
   cd ai-quiz-generator
   git init
   git add .
   git commit -m "AI Quiz Generator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ai-quiz-generator.git
   git push -u origin main
   ```

> The repo already includes `render.yaml` (backend) and `frontend/vercel.json`
> (frontend), plus a `.gitignore`, so secrets/build files won't be committed.

---

## Step 1 — Deploy the BACKEND on Render

1. Go to <https://render.com> → sign up (you can use your GitHub account).
2. Click **New** → **Blueprint** → connect your GitHub and select the repo.
   Render reads `render.yaml` and creates:
   - a web service **ai-quiz-generator-api**
   - a free Postgres database **ai-quiz-db**
3. Before the first deploy finishes, set two env vars on the **web service**
   (Dashboard → your service → **Environment**):
   - **ENCRYPTION_KEY** — generate one and paste it:
     ```bash
     python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
     ```
   - **CORS_ORIGINS** — leave blank for now; you'll set it in Step 3.
   (SECRET_KEY and DATABASE_URL are filled in automatically by the blueprint.)
4. Click **Manual Deploy → Deploy latest commit** (or just wait).
5. When it's live, note your backend URL, e.g.
   **`https://ai-quiz-generator-api.onrender.com`**
6. Test it: open `https://<your-backend>/api/health` — you should see
   `{"status":"ok","app":"AI Quiz Generator"}`.
   You can also explore the API docs at `https://<your-backend>/docs`.

> ℹ️ Render's free tier sleeps after ~15 min idle; the first request after
> sleeping takes ~30–50s to wake up. That's normal.

---

## Step 2 — Deploy the FRONTEND on Vercel

1. Go to <https://vercel.com> → sign up with GitHub.
2. **Add New… → Project** → import your repo.
3. Configure:
   - **Root Directory**: `frontend`
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
4. Add an **Environment Variable**:
   - **VITE_API_BASE** = `https://<your-backend>.onrender.com/api`
     (your Render URL from Step 1, with `/api` on the end)
5. Click **Deploy**. When done you'll get a URL like
   **`https://ai-quiz-generator.vercel.app`** — that's the link you open!

---

## Step 3 — Connect the two (CORS)

1. Back on **Render** → your web service → **Environment** →
   set **CORS_ORIGINS** to your Vercel URL (no trailing slash), e.g.
   ```
   CORS_ORIGINS=https://ai-quiz-generator.vercel.app
   ```
2. Save → Render redeploys automatically.

---

## Step 4 — Use it 🎉

1. Open your Vercel URL.
2. **Sign up** with any email + password.
3. **Settings** → add a free API key (one click via the buttons):
   - Gemini: <https://aistudio.google.com/app/apikey>
   - Groq: <https://console.groq.com/keys>
4. **Start Generating** → pick a method, difficulty, and question types →
   read the summary → take the quiz one question at a time → see your score.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend loads but "Failed to fetch" / network errors | `VITE_API_BASE` is wrong, or `CORS_ORIGINS` on Render doesn't exactly match your Vercel URL. |
| First request very slow | Render free tier was asleep; it wakes in ~30–50s. |
| "stored key could not be decrypted" after redeploy | `ENCRYPTION_KEY` changed. Keep it constant; re-enter your API key in Settings. |
| Login works locally but not deployed | Make sure you set `VITE_API_BASE` and redeployed the frontend. |

---

## Alternative one-box option (Docker)

If you'd rather run everything in one place (e.g. a small VPS), the repo also has
`docker-compose.yml` (Postgres + backend + frontend via Nginx):
```bash
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())")
docker compose up --build
# frontend: http://localhost:8080
```
