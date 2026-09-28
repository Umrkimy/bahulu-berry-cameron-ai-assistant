import pytest
from fastapi import status
from starlette.requests import Request

from app.api.routes.auth import logout
from app.auth.jwt import create_access_token
from app.core.config import settings
from app.models.admin import Admin


def logout_request(session_cookie: str | None = None) -> Request:
    headers = [] if session_cookie is None else [(b"cookie", f"{settings.SESSION_COOKIE_NAME}={session_cookie}".encode())]
    return Request({"type": "http", "method": "POST", "path": "/api/auth/logout", "headers": headers})


@pytest.mark.asyncio
async def test_logout_returns_no_content_and_clears_auth_cookies(session):
    response = await logout(logout_request(), session)

    assert response.status_code == status.HTTP_204_NO_CONTENT
    cookies = response.headers.getlist("set-cookie")
    assert len(cookies) == 2
    assert all("Max-Age=0" in cookie for cookie in cookies)


@pytest.mark.asyncio
async def test_logout_revokes_every_session_for_the_account(session):
    admin = Admin(username="Fictional Owner", email="owner@example.invalid", password_hash="x", role="OWNER")
    session.add(admin)
    await session.commit()
    original_version = admin.session_version
    token = create_access_token({"sub": str(admin.id), "sv": original_version})

    await logout(logout_request(token), session)
    await session.refresh(admin)

    assert admin.session_version == original_version + 1


@pytest.mark.asyncio
async def test_logout_ignores_an_invalid_session_cookie(session):
    response = await logout(logout_request("not-a-token"), session)

    assert response.status_code == status.HTTP_204_NO_CONTENT
