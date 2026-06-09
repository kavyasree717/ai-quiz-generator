"""
Security utilities: password hashing, JWT tokens, and symmetric encryption
for storing third-party API keys at rest.
"""
import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

from app.core.config import settings


# --- Password hashing (bcrypt directly to avoid passlib version warnings) ----
def hash_password(password: str) -> str:
    # bcrypt has a 72-byte input limit; truncate defensively.
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# --- JWT access tokens ------------------------------------------------------
def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Return the subject (user id) if the token is valid, else None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# --- Symmetric encryption for API keys --------------------------------------
def _get_fernet() -> Fernet:
    """Build a Fernet instance from ENCRYPTION_KEY, deriving one if absent."""
    key = settings.ENCRYPTION_KEY
    if not key:
        # Derive a deterministic 32-byte key from SECRET_KEY (dev fallback).
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return ""


def mask_secret(plaintext: str) -> str:
    """Return a masked preview like 'sk-...d4f2' for display in the UI."""
    if not plaintext:
        return ""
    if len(plaintext) <= 8:
        return "••••"
    return f"{plaintext[:3]}••••{plaintext[-4:]}"
