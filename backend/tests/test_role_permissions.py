import secrets

import httpx
import pytest
from fastapi import FastAPI

from app.api.router import api_router
from app.auth.dependencies import get_current_admin
from app.auth.permissions import MANAGER, OWNER, ROLE_PERMISSIONS, STAFF, Permission
from app.db.database import get_db
from app.models import Admin
from app.models.task import Task


@pytest.fixture
async def team(session):
    members = {
        role: Admin(username=role.lower(), email=f"{role.lower()}@example.com", password_hash="unused", role=role, is_superuser=role == OWNER, is_active=True)
        for role in (OWNER, MANAGER, STAFF)
    }
    session.add_all(members.values())
    await session.commit()
    return members


@pytest.fixture
async def as_role(session, team):
    app = FastAPI()
    app.include_router(api_router, prefix="/api")

    async def database():
        yield session

    app.dependency_overrides[get_db] = database
    clients = []

    async def client_for(role):
        app.dependency_overrides[get_current_admin] = lambda: team[role]
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        clients.append(client)
        return client

    yield client_for
    for client in clients:
        await client.aclose()


def test_role_matrix():
    assert ROLE_PERMISSIONS[OWNER] == frozenset(Permission)
    assert ROLE_PERMISSIONS[STAFF] == {Permission.VIEW_ENQUIRIES, Permission.UPDATE_ENQUIRIES}
    assert ROLE_PERMISSIONS[MANAGER] == frozenset(Permission)
    assert ROLE_PERMISSIONS.get("UNKNOWN") is None


# Each request uses a missing record or harmless body, so a non-403 answer
# means the role got past the permission check.
CASES = [
    ("post", "/api/tasks", {"title": "Fictional task"}, {OWNER, MANAGER}),
    ("patch", "/api/orders/999999", {"status": "CANCELLED"}, {OWNER, MANAGER}),
    ("get", "/api/enquiries", None, {OWNER, MANAGER, STAFF}),
    ("patch", "/api/enquiries/999999/status", {"status": "WORKING"}, {OWNER, MANAGER, STAFF}),
    ("post", "/api/enquiries", {"title": "Fictional enquiry", "notes": "Fictional note", "source": "OTHER"}, {OWNER, MANAGER}),
    ("post", "/api/enquiries/999999/task", {"title": "Fictional task", "instructions": "Fictional instructions"}, {OWNER, MANAGER}),
    ("get", "/api/suppliers", None, {OWNER, MANAGER}),
    ("post", "/api/inventories/999999/opening-balance", {"reason": "Fictional count"}, {OWNER, MANAGER}),
    ("post", "/api/customers/999999/archive", None, {OWNER, MANAGER}),
    ("patch", "/api/products/999999", {"name": "Fictional product"}, {OWNER, MANAGER}),
    ("put", "/api/products/999999/images", {"image_ids": []}, {OWNER, MANAGER}),
    ("post", "/api/media/999999/archive", None, {OWNER, MANAGER}),
    ("get", "/api/reports/summary", None, {OWNER, MANAGER}),
    ("delete", "/api/products/999999", None, {OWNER}),
    ("delete", "/api/media/999999", None, {OWNER}),
    ("get", "/api/reports/summary.csv", None, {OWNER}),
    ("get", "/api/team", None, {OWNER}),
    ("post", "/api/discounts", {"name": "Fictional"}, {OWNER}),
    ("post", "/api/refund-requests/999999/refund", None, {OWNER}),
]


@pytest.mark.parametrize("method,path,body,allowed", CASES)
@pytest.mark.parametrize("role", [OWNER, MANAGER, STAFF])
async def test_route_access_by_role(as_role, role, method, path, body, allowed):
    client = await as_role(role)
    response = await client.request(method.upper(), path, json=body)
    if role in allowed:
        assert response.status_code != 403, response.text
    else:
        assert response.status_code == 403, response.text


async def test_managers_see_and_reassign_all_tasks_while_staff_see_their_own(session, team, as_role):
    session.add_all([
        Task(title="Owner's own task", created_by_admin_id=team[OWNER].id, assigned_admin_id=team[OWNER].id),
        Task(title="Staff task", created_by_admin_id=team[OWNER].id, assigned_admin_id=team[STAFF].id),
    ])
    await session.commit()

    manager = await as_role(MANAGER)
    assert {task["title"] for task in (await manager.get("/api/tasks")).json()} == {"Owner's own task", "Staff task"}
    created = await manager.post("/api/tasks", json={"title": "Pack tomorrow's orders", "assigned_admin_id": team[STAFF].id})
    assert created.status_code == 200, created.text
    moved = await manager.patch(f"/api/tasks/{created.json()['id']}", json={"priority": "HIGH"})
    assert moved.status_code == 200, moved.text

    staff = await as_role(STAFF)
    assert {task["title"] for task in (await staff.get("/api/tasks")).json()} == {"Staff task", "Pack tomorrow's orders"}
    assert (await staff.patch(f"/api/tasks/{created.json()['id']}", json={"priority": "LOW"})).status_code == 403


async def test_owner_can_give_and_remove_the_manager_role(team, as_role):
    owner = await as_role(OWNER)
    password = secrets.token_urlsafe(18)
    created = await owner.post("/api/team", json={"username": "new-manager", "email": "new-manager@example.com", "password": password, "role": "manager"})
    assert created.status_code == 201, created.text
    assert created.json()["role"] == MANAGER and created.json()["is_superuser"] is False
    demoted = await owner.patch(f"/api/team/{created.json()['id']}", json={"role": STAFF})
    assert demoted.status_code == 200 and demoted.json()["role"] == STAFF
    assert (await owner.post("/api/team", json={"username": "x-role", "email": "x@example.com", "password": password, "role": "ADMIN"})).status_code == 422
