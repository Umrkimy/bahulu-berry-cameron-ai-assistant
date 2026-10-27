"""Owner-edited Berry menu wording, with fictional staff and customers."""

import itertools

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select

from app.api.router import api_router
from app.auth.dependencies import get_current_admin
from app.auth.permissions import MANAGER, OWNER, STAFF
from app.core.config import settings
from app.db.database import get_db
from app.models import Admin
from app.models.activity_log import ActivityLog
from app.models.messaging import MessagingConversation, MessagingEvent
from app.services.messaging import NormalizedInboundMessage, ask_for_rating, process_inbound_message
from app.services.whatsapp_menu import BUSINESS, DEFAULT_COPY

URL = "/api/support/whatsapp-menu"
message_ids = itertools.count(1)


@pytest.fixture(autouse=True)
def menu_enabled(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_RAG_ENABLED", False)


@pytest.fixture
async def team(session):
    members = {
        role: Admin(username=f"menu-{role.lower()}", email=f"menu-{role.lower()}@example.com", password_hash="unused", role=role, is_superuser=role == OWNER, is_active=True)
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


async def send(session, text: str, conversation: str = "menu-copy-1"):
    message = NormalizedInboundMessage("SIMULATOR", f"menu-copy-message-{next(message_ids)}", conversation, "60123450000", text, "AUTO")
    return await process_inbound_message(session, message=message)


async def last_reply(session) -> str:
    event = await session.scalar(select(MessagingEvent).where(MessagingEvent.direction == "OUTBOUND").order_by(MessagingEvent.id.desc()).limit(1))
    return event.content


async def save(client, version: int, copy: dict):
    return await client.put(URL, json={"expected_version": version, "copy": copy})


@pytest.mark.asyncio
async def test_only_owners_can_read_or_change_menu_text(as_role):
    for role in (MANAGER, STAFF):
        client = await as_role(role)
        assert (await client.get(URL)).status_code == 403
        assert (await save(client, 1, DEFAULT_COPY)).status_code == 403


@pytest.mark.asyncio
async def test_saved_text_is_used_by_berry_and_reset_returns_default(session, as_role):
    client = await as_role(OWNER)
    initial = (await client.get(URL)).json()
    assert initial["version"] == 1
    assert initial["current"] == initial["defaults"]
    assert initial["placeholders"]["order_status"] == ["number", "status"]

    copy = initial["current"]
    copy["EN"]["menu"] = "Fictional main menu.\n1 Products\n5 Staff"
    copy["MS"]["menu"] = "Menu rekaan.\n1 Produk\n5 Staf"
    copy["EN"]["handoff"] = "Fictional handoff. We are open {hours}."
    copy["EN"]["rating_ask"] = "Fictional rating question?"
    copy["EN"]["statuses"]["PENDING"] = "fictionally received"
    response = await save(client, 1, copy)
    assert response.status_code == 200, response.text
    assert response.json()["version"] == 2

    await send(session, "hi")
    assert await last_reply(session) == "Fictional main menu.\n1 Products\n5 Staff"
    await send(session, "6")
    assert await last_reply(session) == "Menu rekaan.\n1 Produk\n5 Staf"
    await send(session, "hello", conversation="menu-copy-2")
    await send(session, "5", conversation="menu-copy-2")
    assert await last_reply(session) == f"Fictional handoff. We are open {BUSINESS['hours']['EN']}."
    conversation = await session.scalar(select(MessagingConversation).where(MessagingConversation.external_conversation_id == "menu-copy-2"))
    owner_id = (await session.scalar(select(Admin).where(Admin.role == OWNER))).id
    assert await ask_for_rating(session, conversation, admin_id=owner_id, support_request_id=conversation.support_request_id)
    await session.commit()
    assert await last_reply(session) == "Fictional rating question?"

    saved = response.json()["current"]
    saved["EN"] = response.json()["defaults"]["EN"]
    reset = await save(client, 2, saved)
    assert reset.status_code == 200
    assert reset.json()["current"]["EN"] == reset.json()["defaults"]["EN"]
    assert reset.json()["current"]["MS"]["menu"] == "Menu rekaan.\n1 Produk\n5 Staf"

    activity = (await session.execute(select(ActivityLog).where(ActivityLog.action == "whatsapp_menu_text_saved").order_by(ActivityLog.id))).scalars().all()
    assert len(activity) == 2


@pytest.mark.asyncio
async def test_stale_saves_are_rejected(as_role):
    client = await as_role(OWNER)
    copy = (await client.get(URL)).json()["current"]
    assert (await save(client, 1, copy)).status_code == 200
    stale = await save(client, 1, copy)
    assert stale.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("key", "text"),
    [
        ("order_status", "Order {number} is {0.__class__}"),
        ("order_status", "Order #{number}"),
        ("browse", "Photos at {address}"),
        ("menu", "Hi {name}"),
        ("menu", "Stray } bracket"),
        ("menu", "   "),
        ("menu", "x" * 1001),
    ],
)
async def test_invalid_text_is_rejected(as_role, key, text):
    client = await as_role(OWNER)
    copy = (await client.get(URL)).json()["current"]
    copy["EN"][key] = text
    assert (await save(client, 1, copy)).status_code == 422


@pytest.mark.asyncio
async def test_unknown_keys_and_bracketed_status_labels_are_rejected(as_role):
    client = await as_role(OWNER)
    copy = (await client.get(URL)).json()["current"]
    copy["EN"]["extra"] = "Fictional"
    assert (await save(client, 1, copy)).status_code == 422
    del copy["EN"]["extra"]
    copy["MS"]["statuses"]["SHIPPED"] = "{status}"
    assert (await save(client, 1, copy)).status_code == 422
