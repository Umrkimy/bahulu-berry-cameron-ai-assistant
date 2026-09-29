from contextlib import asynccontextmanager
import asyncio
import logging
import re
from pathlib import Path
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.static_assets import PublicStaticFiles
from sqlalchemy.exc import IntegrityError

from app.db.database import AsyncSessionLocal, engine

from app.core.config import settings
from app.core.logging import configure_logging, request_id_var, safe_request_id
from app.core.observability import init_sentry
from app.core.security import verify_csrf_request
from app.database_readiness import check_readiness
import app.models
import app.schemas
from app.api.router import api_router
from app.api.routes.meta_whatsapp import router as meta_whatsapp_router
from app.services.messaging import purge_expired_message_content
from app.services.notification_services import purge_expired_notifications
from app.services.email_services import purge_expired_email_security_records
from app.services.storefront_checkout import cancel_stale_storefront_orders


configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
init_sentry()

logger = logging.getLogger("bahulu.api")
STATIC_DIRECTORY = Path(__file__).resolve().parent / "static"
# Bundled assets are separate from persistent product uploads. Create this
# directory so clean checkouts can serve static assets without an empty Git folder.
STATIC_DIRECTORY.mkdir(parents=True, exist_ok=True)


def is_image_upload_request(method: str, path: str, content_type: str) -> bool:
    if method not in {"POST", "PUT"} or not content_type.startswith("multipart/form-data"):
        return False
    return bool(re.fullmatch(
        rf"{re.escape(settings.API_PREFIX)}/(?:media|products/\d+/images(?:/\d+)?)",
        path,
    ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def message_retention_loop() -> None:
        while True:
            try:
                async with AsyncSessionLocal() as session:
                    await purge_expired_message_content(session)
                    await purge_expired_notifications(session)
                    await purge_expired_email_security_records(session)
            except Exception:
                logger.exception("message_retention_cleanup_failed")
            await asyncio.sleep(3600)

    async def unpaid_order_loop() -> None:
        # Returns stock held by website orders nobody paid for.
        while True:
            try:
                async with AsyncSessionLocal() as session:
                    await cancel_stale_storefront_orders(session)
            except Exception:
                logger.exception("unpaid_storefront_order_cleanup_failed")
            await asyncio.sleep(300)

    background_tasks = [
        asyncio.create_task(message_retention_loop()),
        asyncio.create_task(unpaid_order_loop()),
    ]
    try:
        yield
    finally:
        for task in background_tasks:
            task.cancel()
        await asyncio.gather(*background_tasks, return_exceptions=True)
        await engine.dispose()


app = FastAPI(
    title="Bahulu Berry Cameron Admin API",
    description="API for Bahulu Berry Cameron business operations",
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    lifespan=lifespan,
)

settings.validate_runtime_security()
settings.validate_payment_safety()


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
async def readiness_check():
    # Ready only when the database answers and is on this build's migration.
    ready, body = await check_readiness()
    if not ready:
        return JSONResponse(status_code=503, content=body)
    return body


@app.exception_handler(IntegrityError)
async def handle_integrity_error(_, __):
    return JSONResponse(
        status_code=409,
        content={
            "detail": "A record with those details already exists. Please review your entries and try again.",
        },
    )

app.mount(
    "/static",
    PublicStaticFiles(directory=STATIC_DIRECTORY),
    name="static",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS or ["localhost", "127.0.0.1", "testserver"],
)


@app.middleware("http")
async def apply_security_controls(request: Request, call_next):
    # A caller's request ID is reused only when it is safe to write to logs.
    request_id = safe_request_id(request.headers.get("X-Request-ID")) or str(uuid4())
    token = request_id_var.set(request_id)
    started = time.perf_counter()
    try:
        response = await check_request_then_call(request, call_next)
        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            },
        )
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


async def check_request_then_call(request: Request, call_next):
    content_length = request.headers.get("content-length")
    image_upload = is_image_upload_request(request.method, request.url.path, request.headers.get("content-type", ""))
    if image_upload and not content_length:
        return JSONResponse(status_code=411, content={"detail": "Image uploads require Content-Length."})
    if content_length:
        try:
            # Image multipart requests include a small envelope above the 5 MB file limit.
            limit = 6 * 1024 * 1024 if image_upload else settings.MAX_REQUEST_BODY_BYTES
            is_too_large = int(content_length) > limit
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid request size."})
        if is_too_large:
            return JSONResponse(status_code=413, content={"detail": "Request is too large."})

    try:
        verify_csrf_request(request)
    except Exception as error:
        if hasattr(error, "status_code"):
            return JSONResponse(status_code=error.status_code, content={"detail": error.detail})
        raise

    return await call_next(request)


app.include_router(
    api_router,
    prefix="/api",
)

app.include_router(meta_whatsapp_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
