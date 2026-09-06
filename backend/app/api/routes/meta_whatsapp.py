import hashlib
import hmac
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.core.config import settings
from app.db.database import get_db
from app.models.admin import Admin
from app.services.messaging import MetaWhatsAppAdapter, process_inbound_message


router = APIRouter()


def _is_enabled() -> bool:
    return settings.WHATSAPP_META_INBOUND_ENABLED


def _verify_signature(raw_body: bytes, signature: str | None) -> bool:
    secret = settings.WHATSAPP_META_APP_SECRET.get_secret_value()
    if not secret or not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, f"sha256={expected}")


@router.get("/webhooks/meta/whatsapp", include_in_schema=False)
async def verify_meta_webhook(request: Request):
    if not _is_enabled():
        raise HTTPException(404, detail="Not found.")
    verify_token = settings.WHATSAPP_META_VERIFY_TOKEN.get_secret_value()
    if not verify_token or request.query_params.get("hub.mode") != "subscribe":
        raise HTTPException(403, detail="Webhook verification failed.")
    if not hmac.compare_digest(request.query_params.get("hub.verify_token", ""), verify_token):
        raise HTTPException(403, detail="Webhook verification failed.")
    challenge = request.query_params.get("hub.challenge")
    if not challenge:
        raise HTTPException(400, detail="Webhook verification failed.")
    return Response(content=challenge, media_type="text/plain")


@router.post("/webhooks/meta/whatsapp", status_code=200, include_in_schema=False)
async def receive_meta_webhook(request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    if not _is_enabled():
        raise HTTPException(404, detail="Not found.")
    raw_body = await request.body()
    if not _verify_signature(raw_body, request.headers.get("X-Hub-Signature-256")):
        raise HTTPException(403, detail="Webhook signature verification failed.")
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise HTTPException(400, detail="Malformed webhook payload.") from error
    adapter = MetaWhatsAppAdapter()
    if not adapter.verify_inbound(payload):
        raise HTTPException(400, detail="Malformed webhook payload.")
    processed = 0
    for message in adapter.normalize_inbound(payload):
        await process_inbound_message(db, message=message)
        processed += 1
    return {"status": "accepted", "processed": processed}


@router.get("/api/support/meta/status")
async def meta_connection_status(admin: Annotated[Admin, Depends(get_current_superuser)]):
    del admin
    app_secret_configured = bool(settings.WHATSAPP_META_APP_SECRET.get_secret_value())
    verify_token_configured = bool(settings.WHATSAPP_META_VERIFY_TOKEN.get_secret_value())
    phone_number_configured = bool(settings.WHATSAPP_META_PHONE_NUMBER_ID)
    return {
        "provider": "META_WHATSAPP_CLOUD_API",
        "inbound_enabled": settings.WHATSAPP_META_INBOUND_ENABLED,
        "webhook_url": "/webhooks/meta/whatsapp",
        "app_secret_configured": app_secret_configured,
        "verify_token_configured": verify_token_configured,
        "phone_number_configured": phone_number_configured,
        "outbound_enabled": False,
        "mode": "DRAFT_ONLY",
    }
