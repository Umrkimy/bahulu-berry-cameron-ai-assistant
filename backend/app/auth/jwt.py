from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings

# Each session type signs its own audience, so a token minted for one kind of
# account can never be replayed against another kind's routes.
ADMIN_AUDIENCE = "bahulu-admin"


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
    audience: str = ADMIN_AUDIENCE,
) -> str:
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES or settings.SESSION_EXPIRE_MINUTES,
        )

    to_encode.update({"exp": expire, "aud": audience})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM,
    )

    return encoded_jwt


def verify_access_token(token: str | None, audience: str = ADMIN_AUDIENCE) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
            audience=audience,
            options={"require": ["exp", "sub", "aud"]},
        )
    except jwt.InvalidTokenError:
        return None

    return payload
