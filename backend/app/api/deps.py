"""Common FastAPI dependencies (current user, provider resolution + fallback)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, decrypt_secret
from app.db.session import get_db
from app.models import ApiKey, User
from app.services.ai_providers import ProviderError, build_provider

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def _ordered_keys(db: Session, user: User, preferred: str | None):
    """Return user's API keys ordered with the preferred/default provider first."""
    rows = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
    if not rows:
        return []
    pref = preferred or user.default_provider or "gemini"
    rows.sort(key=lambda r: 0 if r.provider == pref else 1)
    return rows


def run_with_fallback(db: Session, user: User, fn, preferred: str | None = None):
    """
    Try `fn(provider)` against the user's keys, falling back to the next key if
    one fails (e.g. rate limit / quota exhausted / bad key).

    Returns (result, provider_id_used). Raises HTTPException if all keys fail or
    none are configured.
    """
    rows = _ordered_keys(db, user, preferred)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API key configured. Add one in Settings to start generating.",
        )

    errors = []
    for row in rows:
        api_key = decrypt_secret(row.encrypted_key)
        if not api_key:
            errors.append(f"{row.provider}: stored key could not be decrypted")
            continue
        provider = build_provider(row.provider, api_key, row.model)
        try:
            return fn(provider), row.provider
        except ProviderError as e:
            # Move on to the next configured key.
            errors.append(f"{row.provider}: {e}")
            continue

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="All configured API keys failed. Details — " + " | ".join(errors),
    )
