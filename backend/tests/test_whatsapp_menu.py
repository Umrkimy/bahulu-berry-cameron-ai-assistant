"""WhatsApp menu replies with fictional customers, numbers and products."""

import itertools
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.messaging import MessagingEvent
from app.models.order import Order
from app.models.product import Product
from app.models.support import SupportRequest
from app.services.messaging import NormalizedInboundMessage, process_inbound_message

message_ids = itertools.count(1)
SENDER = "60123456789"


@pytest.fixture(autouse=True)
def menu_enabled(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_RAG_ENABLED", False)


async def send(session, text: str, conversation: str = "conversation-1", sender: str = SENDER, language: str = "AUTO"):
    message = NormalizedInboundMessage("SIMULATOR", f"menu-message-{next(message_ids)}", conversation, sender, text, language)
    return await process_inbound_message(session, message=message)


async def add_product(session, name: str, name_ms: str, price: str, quantity: int, published: bool = True) -> Product:
    product = Product(name=name, name_ms=name_ms, price=Decimal(price), is_active=True, storefront_published=published)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=quantity, low_stock_threshold=1))
    await session.commit()
    return product


async def add_order(session, phone: str) -> Order:
    customer = Customer(full_name="Fictional Buyer", phone_number=phone, canonical_phone_number=phone, email=f"buyer{phone[-4:]}@example.com", address="1 Jalan Rekaan", city="Tanah Rata", state="Pahang", postal_code="39000", country="Malaysia")
    session.add(customer)
    await session.flush()
    order = Order(customer_id=customer.id, status="PROCESSING", total_amount=Decimal("20.00"), subtotal=Decimal("20.00"), discount_amount=Decimal("0.00"))
    session.add(order)
    await session.commit()
    return order


@pytest.mark.asyncio
async def test_greeting_shows_menu_and_records_auto_reply(session):
    result = await send(session, "Hi!")

    assert result.outcome == "MENU"
    assert result.draft is None
    assert "1  See our products and prices" in result.reply
    outbound = (await session.scalars(select(MessagingEvent).where(MessagingEvent.direction == "OUTBOUND"))).all()
    assert [event.outcome for event in outbound] == ["AUTO_REPLY"]
    assert outbound[0].content == result.reply


@pytest.mark.asyncio
async def test_malay_greeting_and_language_switch(session):
    first = await send(session, "salam")
    switched = await send(session, "6")
    back = await send(session, "6")

    assert "Lihat produk dan harga" in first.reply
    assert "See our products and prices" in switched.reply
    assert "Lihat produk dan harga" in back.reply


@pytest.mark.asyncio
async def test_product_list_reads_published_products_from_backend(session):
    await add_product(session, "Fictional Original", "Rekaan Asli", "12.5", 5)
    await add_product(session, "Fictional Berry", "Rekaan Beri", "15.00", 0)
    await add_product(session, "Hidden Draft", "Draf Tersembunyi", "9.00", 5, published=False)

    await send(session, "hi")
    result = await send(session, "1")

    assert "• Fictional Original - RM 12.50" in result.reply
    assert "• Fictional Berry - RM 15.00 (sold out)" in result.reply
    assert "Hidden Draft" not in result.reply
    assert settings.STOREFRONT_PUBLIC_URL in result.reply


@pytest.mark.asyncio
async def test_empty_product_list_points_to_staff(session):
    await send(session, "hi")
    result = await send(session, "1")

    assert "Reply 5" in result.reply
    assert "RM" not in result.reply


@pytest.mark.asyncio
async def test_order_status_only_for_the_senders_own_order(session):
    own = await add_order(session, "+60123456789")
    other = await add_order(session, "+60199999999")

    await send(session, "hi")
    await send(session, "3")
    found = await send(session, f"#{own.id}")
    await send(session, "3")
    hidden = await send(session, str(other.id))

    assert f"Order #{own.id}: being prepared." in found.reply
    assert "could not find" in hidden.reply
    assert str(other.id) not in hidden.reply.split("could not find")[0]


@pytest.mark.asyncio
async def test_order_number_step_is_forgotten_after_one_reply(session):
    await add_order(session, "+60123456789")
    await send(session, "hi")
    await send(session, "3")
    await send(session, "*")
    result = await send(session, "1")

    assert "Order #" not in result.reply


@pytest.mark.asyncio
async def test_hours_and_location_use_approved_values(session):
    await send(session, "hi")
    result = await send(session, "4")

    assert "Open daily, 9am–5:30pm (until sold out)" in result.reply
    assert "39000 Tanah Rata, Pahang" in result.reply


@pytest.mark.asyncio
async def test_talk_to_staff_hands_off_and_berry_goes_quiet(session):
    await send(session, "hi")
    handoff = await send(session, "5")
    follow_up = await send(session, "I want 3 boxes for Saturday")

    assert handoff.outcome == "HANDOFF"
    assert handoff.ticket_created is True
    assert "Our staff will reply here" in handoff.reply
    ticket = await session.get(SupportRequest, handoff.support_request_id)
    assert ticket.handoff_state == "HUMAN_REQUESTED"
    assert follow_up.outcome == "HANDOFF"
    assert follow_up.reply is None
    assert follow_up.support_request_id == handoff.support_request_id


@pytest.mark.asyncio
async def test_asking_for_a_live_agent_hands_off(session):
    await send(session, "hello")
    result = await send(session, "can I talk to a live agent please")

    assert result.outcome == "HANDOFF"
    assert "Our staff will reply here" in result.reply


@pytest.mark.asyncio
async def test_typed_question_on_first_contact_gets_handoff_when_ai_cannot_answer(session):
    result = await send(session, "Do you deliver to Kuala Lumpur?")

    assert result.outcome == "HANDOFF"
    assert result.draft is not None and result.draft.handoff_required
    assert "Our staff will reply here" in result.reply


@pytest.mark.asyncio
async def test_menu_off_keeps_draft_only_behaviour(session, monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", False)
    result = await send(session, "hi")

    assert result.outcome == "HANDOFF"
    assert result.reply is None
    assert (await session.scalars(select(MessagingEvent).where(MessagingEvent.direction == "OUTBOUND"))).all() == []
