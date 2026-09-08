from contextlib import asynccontextmanager
import asyncio
import json
import logging
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from app.db.database import AsyncSessionLocal, engine

from app.core.config import settings
from app.core.security import verify_csrf_request
import app.models
import app.schemas
from app.api.router import api_router
from app.api.routes.meta_whatsapp import router as meta_whatsapp_router
from app.services.messaging import purge_expired_message_content
from app.services.notification_services import purge_expired_notifications


logger = logging.getLogger("bahulu.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def message_retention_loop() -> None:
        while True:
            try:
                async with AsyncSessionLocal() as session:
                    await purge_expired_message_content(session)
                    await purge_expired_notifications(session)
            except Exception:
                logger.exception("message_retention_cleanup_failed")
            await asyncio.sleep(3600)

    retention_task = asyncio.create_task(message_retention_loop())
    try:
        yield
    finally:
        retention_task.cancel()
        await asyncio.gather(retention_task, return_exceptions=True)
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


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
async def readiness_check():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}


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
    StaticFiles(directory="static"),
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
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    started = time.perf_counter()
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            is_too_large = int(content_length) > settings.MAX_REQUEST_BODY_BYTES
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

    response = await call_next(request)
    logger.info(json.dumps({
        "event": "request_completed",
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration_ms": round((time.perf_counter() - started) * 1000),
    }))
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


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
