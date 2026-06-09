#!/usr/bin/env bash
# Convenience launcher: starts backend (port 8000) + frontend (port 5173) together.
# Usage: bash start.sh   (Ctrl+C stops both)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Setting up backend…"
cd "$ROOT/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
  # auto-generate strong secrets for local use
  SK=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
  EK=$(python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())")
  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$SK|" .env
  sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$EK|" .env
  rm -f .env.bak
  echo "  generated secrets in backend/.env"
fi
uvicorn app.main:app --reload --port 8000 &
BE=$!

echo "▶ Setting up frontend…"
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then npm install; fi
npm run dev &
FE=$!

trap "echo; echo 'Stopping…'; kill $BE $FE 2>/dev/null" INT TERM
echo ""
echo "✅ Backend:  http://localhost:8000  (docs at /docs)"
echo "✅ Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."
wait
