import pytest
from fastapi import HTTPException

from app.api.routes.team import create_team_member
from app.models.admin import Admin
from app.schemas.admin import AdminCreate


async def test_duplicate_team_email_returns_a_field_error(session):
    owner = Admin(
        username="owner",
        email="owner@example.com",
        password_hash="x",
        role="OWNER",
        is_superuser=True,
        is_active=True,
    )
    session.add(owner)
    await session.commit()

    await create_team_member(
        AdminCreate(
            username="firststaff",
            email="staff@example.com",
            password="password123",
        ),
        session,
        owner,
    )

    with pytest.raises(HTTPException) as error:
        await create_team_member(
            AdminCreate(
                username="secondstaff",
                email="staff@example.com",
                password="password123",
            ),
            session,
            owner,
        )

    assert error.value.status_code == 400
    assert error.value.detail["field_errors"]["email"] == "This email address is already in use."
