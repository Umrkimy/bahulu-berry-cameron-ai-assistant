"""Customer ratings after a staff-handled WhatsApp chat, with fictional staff and numbers."""

import itertools

import pytest
from sqlalchemy import select

from app.api.routes.support import claim_conversation, return_conversation_to_ai
from app.api.routes.support_ratings import rating_summary, ratings
from app.core.config import settings
from app.models.admin import Admin
from app.models.messaging import MessagingEvent
from app.models.notification import Notification
from app.models.support_rating import SupportRating
from app.services.messaging import NormalizedInboundMessage, process_inbound_message

message_ids = itertools.count(1)


@pytest.fixture(autouse=True)
def menu_enabled(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_RAG_ENABLED", False)


async def member(session, username: str, role: str) -> Admin:
    admin = Admin(username=username, email=f"{username}@example.com", password_hash="test", role=role, is_active=True)
    session.add(admin)
    await session.commit()
    return admin


async def send(session, text: str, conversation: str = "rating-chat", sender: str = "60100000005"):
    message = NormalizedInboundMessage("SIMULATOR", f"rating-message-{next(message_ids)}", conversation, sender, text, "AUTO")
    return await process_inbound_message(session, message=message)


async def finished_chat(session, handler: Admin, conversation: str = "rating-chat", sender: str = "60100000005"):
    await send(session, "hi", conversation, sender)
    handoff = await send(session, "5", conversation, sender)
    await claim_conversation(handoff.support_request_id, session, handler)
    await return_conversation_to_ai(handoff.support_request_id, session, handler)
    return handoff.support_request_id


async def rate(session, handler: Admin, score: str, comment: str | None = None, conversation: str = "rating-chat", sender: str = "60100000005"):
    await finished_chat(session, handler, conversation, sender)
    result = await send(session, score, conversation, sender)
    if comment is not None:
        await send(session, comment, conversation, sender)
    return result


@pytest.mark.asyncio
async def test_finishing_a_chat_asks_for_a_rating_and_records_stars_and_comment(session):
    staff = await member(session, "aina", "STAFF")
    await finished_chat(session, staff)
    question = (await session.scalars(select(MessagingEvent).where(MessagingEvent.direction == "OUTBOUND").order_by(MessagingEvent.id.desc()))).first()
    assert "Reply with a number from 1 to 5" in question.content

    thanks = await send(session, "5")
    comment = await send(session, "Very helpful, thank you")

    assert thanks.outcome == "MENU"
    assert "Thank you for rating us 5/5" in thanks.reply
    assert "passed that on" in comment.reply
    rating = await session.scalar(select(SupportRating))
    assert (rating.admin_id, rating.score, rating.comment, rating.flagged) == (staff.id, 5, "Very helpful, thank you", False)


@pytest.mark.asyncio
async def test_five_while_rating_is_a_score_not_a_handoff(session):
    staff = await member(session, "aina", "STAFF")
    result = await rate(session, staff, "5")

    assert result.outcome == "MENU"
    assert result.ticket_created is False


@pytest.mark.asyncio
async def test_skipping_the_comment_returns_to_the_menu(session):
    staff = await member(session, "aina", "STAFF")
    await rate(session, staff, "4")
    skipped = await send(session, "*")

    assert "1  See our products and prices" in skipped.reply
    assert (await session.scalar(select(SupportRating))).comment is None


@pytest.mark.asyncio
async def test_low_score_is_flagged_and_owners_are_notified(session):
    owner = await member(session, "owner", "OWNER")
    staff = await member(session, "aina", "STAFF")
    await rate(session, staff, "1")

    rating = await session.scalar(select(SupportRating))
    assert rating.flagged is True
    notes = (await session.scalars(select(Notification).where(Notification.admin_id == owner.id))).all()
    assert any(note.title == "Low WhatsApp rating" for note in notes)


@pytest.mark.asyncio
async def test_other_replies_cancel_the_rating(session):
    staff = await member(session, "aina", "STAFF")
    await finished_chat(session, staff)
    result = await send(session, "4")
    assert result.reply.startswith("Thank you for rating")

    await finished_chat(session, staff)
    ignored = await send(session, "do you open on Sunday?")
    assert ignored.reply is None or "rating" not in ignored.reply
    latest = (await session.scalars(select(SupportRating).order_by(SupportRating.id.desc()))).first()
    assert latest.score is None


@pytest.mark.asyncio
async def test_no_rating_question_when_the_menu_is_off(session, monkeypatch):
    staff = await member(session, "aina", "STAFF")
    await send(session, "hi")
    handoff = await send(session, "5")
    await claim_conversation(handoff.support_request_id, session, staff)
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", False)
    await return_conversation_to_ai(handoff.support_request_id, session, staff)

    assert await session.scalar(select(SupportRating)) is None


@pytest.mark.asyncio
async def test_owner_sees_everyone_manager_sees_staff_staff_sees_self(session):
    owner = await member(session, "owner", "OWNER")
    manager = await member(session, "manager-a", "MANAGER")
    other_manager = await member(session, "manager-b", "MANAGER")
    staff = await member(session, "aina", "STAFF")
    other_staff = await member(session, "badrul", "STAFF")
    for handler, score, number in ((manager, "5", "1"), (other_manager, "4", "2"), (staff, "3", "3"), (other_staff, "2", "4")):
        await rate(session, handler, score, conversation=f"chat-{number}", sender=f"6010000001{number}")

    def names(rows):
        return sorted(row.username for row in rows)

    assert names(await rating_summary(session, owner)) == ["aina", "badrul", "manager-a", "manager-b"]
    assert names(await rating_summary(session, manager)) == ["aina", "badrul", "manager-a"]
    assert names(await rating_summary(session, staff)) == ["aina"]
    assert names((await ratings(session, manager)).items) == ["aina", "badrul", "manager-a"]
    assert names((await ratings(session, owner, low_only=True)).items) == ["badrul"]


@pytest.mark.asyncio
async def test_summary_averages_scores(session):
    owner = await member(session, "owner", "OWNER")
    staff = await member(session, "aina", "STAFF")
    await rate(session, staff, "5", conversation="chat-a", sender="60100000021")
    await rate(session, staff, "2", conversation="chat-b", sender="60100000022")

    [row] = await rating_summary(session, owner)
    assert (row.ratings, row.average, row.low) == (2, 3.5, 1)
