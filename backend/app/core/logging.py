"""Structured, redacted application logging.

Every log line is one JSON object on stdout carrying the request ID of the
request that produced it. Emails, phone numbers, tokens, cookies,
Authorization values and message text are masked before anything is written,
so logs can be shared with a hosting provider without exposing customers.
"""

from contextvars import ContextVar
from datetime import datetime
import json
import logging
import logging.config
import re
from typing import Any
from zoneinfo import ZoneInfo

KUALA_LUMPUR = ZoneInfo("Asia/Kuala_Lumpur")
REDACTED = "[redacted]"

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

# Extra fields whose values are never logged, whatever they contain.
SENSITIVE_KEY_PATTERN = re.compile(
    r"body|text|message|content|phone|email|cookie|authorization|token|password|secret|signature|api_?key",
    re.IGNORECASE,
)

# Order matters: whole header values and tokens go before the narrower
# email and phone patterns so they are masked as a unit.
REDACTION_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(?i)\b(authorization|cookie|set-cookie)(\s*[:=]\s*)[^\r\n]+"), rf"\1\2{REDACTED}"),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+"), f"Bearer {REDACTED}"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*"), REDACTED),
    (re.compile(r"\b(?:sk|rk|pk|whsec)_(?:live_|test_)?[A-Za-z0-9]{8,}"), REDACTED),
    (
        re.compile(r"(?i)([?&](?:[a-z_]*token|code|key|secret|password|signature|sig)=)[^&\s\"']+"),
        rf"\1{REDACTED}",
    ),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), REDACTED),
    # International (+...), Malaysian mobile (01x / 601x) and landline (03-09).
    (re.compile(r"\+\d[\d\s-]{7,16}\d"), REDACTED),
    (re.compile(r"(?<![\w.-])(?:60|0)1\d[\s-]?\d{3,4}[\s-]?\d{4}(?!\w)"), REDACTED),
    (re.compile(r"(?<![\w.-])(?:60|0)[3-9][\s-]?\d{3,4}[\s-]?\d{4}(?!\w)"), REDACTED),
)

# Attributes every LogRecord has; anything else was passed through ``extra``.
_RESERVED_RECORD_ATTRIBUTES = frozenset(
    vars(logging.LogRecord("", 0, "", 0, "", None, None)).keys()
) | {"message", "asctime", "request_id"}


def redact_text(value: str) -> str:
    for pattern, replacement in REDACTION_PATTERNS:
        value = pattern.sub(replacement, value)
    return value


def redact_value(key: str, value: Any) -> Any:
    if SENSITIVE_KEY_PATTERN.search(key):
        return REDACTED
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, dict):
        return {str(k): redact_value(str(k), v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact_value("", item) for item in value]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return redact_text(str(value))


def safe_request_id(candidate: str | None) -> str | None:
    """Accept a caller's request ID only when it cannot inject into logs."""
    if candidate and REQUEST_ID_PATTERN.fullmatch(candidate):
        return candidate
    return None


class RedactionFilter(logging.Filter):
    """Masks personal data and secrets in the message, args and extras."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:
            message = str(record.msg)
        record.msg = redact_text(message)
        record.args = None
        for key in list(vars(record)):
            if key not in _RESERVED_RECORD_ATTRIBUTES:
                setattr(record, key, redact_value(key, getattr(record, key)))
        record.request_id = request_id_var.get()
        return True


def _extra_fields(record: logging.LogRecord) -> dict[str, Any]:
    return {
        key: value
        for key, value in vars(record).items()
        if key not in _RESERVED_RECORD_ATTRIBUTES and not key.startswith("_")
    }


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, KUALA_LUMPUR).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None)
        if request_id:
            entry["request_id"] = request_id
        entry.update(_extra_fields(record))
        if record.exc_info:
            entry["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
            entry["traceback"] = redact_text(self.formatException(record.exc_info))
        return json.dumps(entry, default=str)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        extras = _extra_fields(record)
        if getattr(record, "request_id", None):
            extras = {"request_id": record.request_id, **extras}
        if extras:
            line = f"{line} {json.dumps(extras, default=str)}"
        return redact_text(line)


def configure_logging(level: str = "INFO", log_format: str = "json") -> None:
    formatter = "json" if log_format.lower() != "text" else "text"
    handler_names = ["stdout"]
    logger_config = {"handlers": handler_names, "level": level.upper(), "propagate": False}
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"redact": {"()": RedactionFilter}},
        "formatters": {
            "json": {"()": JsonFormatter},
            "text": {"()": TextFormatter, "format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": formatter,
                "filters": ["redact"],
            },
        },
        "root": {"handlers": handler_names, "level": level.upper()},
        "loggers": {
            "bahulu": logger_config,
            "uvicorn": logger_config,
            "uvicorn.error": logger_config,
            "uvicorn.access": logger_config,
        },
    })
