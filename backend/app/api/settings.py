"""API-key (provider) settings routes. Keys are stored encrypted and never returned raw."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import decrypt_secret, encrypt_secret, mask_secret
from app.db.session import get_db
from app.models import ApiKey, User
from app.schemas.api_key import ApiKeyOut, ApiKeyUpsert
from app.services.ai_providers import PROVIDER_META, PROVIDERS, ProviderError, build_provider

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/providers")
def list_providers():
    """Public metadata about supported providers (for the Settings UI)."""
    return PROVIDER_META


@router.get("/keys", response_model=list[ApiKeyOut])
def list_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
    by_provider = {r.provider: r for r in rows}
    out = []
    for meta in PROVIDER_META:
        pid = meta["id"]
        row = by_provider.get(pid)
        if row:
            plain = decrypt_secret(row.encrypted_key)
            out.append(ApiKeyOut(provider=pid, masked_key=mask_secret(plain), model=row.model, is_set=True))
        else:
            out.append(ApiKeyOut(provider=pid, masked_key="", model=meta["default_model"], is_set=False))
    return out


@router.put("/keys", response_model=ApiKeyOut)
def upsert_key(
    payload: ApiKeyUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    row = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == user.id, ApiKey.provider == payload.provider)
        .first()
    )
    enc = encrypt_secret(payload.api_key.strip())
    if row:
        row.encrypted_key = enc
        row.model = payload.model or row.model
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = ApiKey(
            user_id=user.id,
            provider=payload.provider,
            encrypted_key=enc,
            model=payload.model or "",
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return ApiKeyOut(
        provider=row.provider,
        masked_key=mask_secret(payload.api_key.strip()),
        model=row.model,
        is_set=True,
    )


@router.delete("/keys/{provider}", status_code=204)
def delete_key(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(ApiKey).filter(ApiKey.user_id == user.id, ApiKey.provider == provider).first()
    if row:
        db.delete(row)
        db.commit()
    return None


@router.post("/keys/{provider}/test")
def test_key(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Make a tiny call to verify the stored key works."""
    row = db.query(ApiKey).filter(ApiKey.user_id == user.id, ApiKey.provider == provider).first()
    if not row:
        raise HTTPException(status_code=400, detail="No key stored for this provider")
    key = decrypt_secret(row.encrypted_key)
    prov = build_provider(provider, key, row.model)
    try:
        prov.complete('Reply with JSON: {"ok": true}', system="You only output JSON.")
        return {"ok": True, "message": f"{provider} key is working."}
    except ProviderError as e:
        raise HTTPException(status_code=400, detail=str(e))
