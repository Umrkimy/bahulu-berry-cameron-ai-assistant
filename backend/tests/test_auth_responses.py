import pytest
from fastapi import status

from app.api.routes.auth import logout


@pytest.mark.asyncio
async def test_logout_returns_no_content_and_clears_auth_cookies():
    response = await logout()

    assert response.status_code == status.HTTP_204_NO_CONTENT
    cookies = response.headers.getlist("set-cookie")
    assert len(cookies) == 2
    assert all("Max-Age=0" in cookie for cookie in cookies)
