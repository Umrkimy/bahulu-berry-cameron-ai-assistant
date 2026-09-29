"""Optional Sentry error reporting.

Off unless SENTRY_DSN is set. Events carry the error and stack trace only:
no cookies, headers, request bodies, query strings, user details or
breadcrumb payloads, and remaining text is passed through log redaction.
"""

from typing import Any

from app.core.config import settings
from app.core.logging import redact_text, redact_value

_REQUEST_FIELDS_TO_DROP = ("cookies", "headers", "data", "query_string", "env")


def scrub_event(event: dict[str, Any], _hint: dict[str, Any] | None = None) -> dict[str, Any]:
    request = event.get("request")
    if isinstance(request, dict):
        for field in _REQUEST_FIELDS_TO_DROP:
            request.pop(field, None)
        if isinstance(request.get("url"), str):
            request["url"] = redact_text(request["url"].split("?", 1)[0])
    event.pop("user", None)
    event.pop("breadcrumbs", None)

    if isinstance(event.get("message"), str):
        event["message"] = redact_text(event["message"])
    logentry = event.get("logentry")
    if isinstance(logentry, dict):
        if isinstance(logentry.get("message"), str):
            logentry["message"] = redact_text(logentry["message"])
        logentry.pop("params", None)

    for exception in (event.get("exception") or {}).get("values") or []:
        if isinstance(exception.get("value"), str):
            exception["value"] = redact_text(exception["value"])
        for frame in (exception.get("stacktrace") or {}).get("frames") or []:
            # Local variables can hold customer data; never send them.
            frame.pop("vars", None)

    if isinstance(event.get("extra"), dict):
        event["extra"] = {key: redact_value(key, value) for key, value in event["extra"].items()}
    return event


def drop_breadcrumb(_crumb: dict[str, Any], _hint: dict[str, Any] | None = None) -> None:
    return None


def init_sentry() -> bool:
    dsn = settings.SENTRY_DSN.get_secret_value()
    if not dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.ENVIRONMENT,
        send_default_pii=False,
        include_local_variables=False,
        traces_sample_rate=0,
        max_breadcrumbs=0,
        before_send=scrub_event,
        before_breadcrumb=drop_breadcrumb,
    )
    return True
