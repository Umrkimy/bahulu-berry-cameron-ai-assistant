"""Create a repeatable, fictional dataset for the public portfolio demo.

Run only with ``--fictional-demo``. This command never imports client records,
provider credentials, or production data.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.auth.password import hash_password
from app.db.database import AsyncSessionLocal
from app.models import (
    Admin,
    Customer,
    Discount,
    HandoffRule,
    Inventory,
    MessagingConversation,
    MessagingEvent,
    Order,
    OrderItem,
    Payment,
    Product,
    RefundRequest,
    SupportFAQ,
    SupportRequest,
    SupportRequestNote,
    SupportTemplate,
)


async def first_or_create(session, model, defaults: dict, **filters):
    result = await session.execute(select(model).filter_by(**filters))
    record = result.scalar_one_or_none()
    if record is None:
        record = model(**filters, **defaults)
        session.add(record)
        await session.flush()
    return record


async def seed_demo() -> None:
    """Seed fictional examples without overwriting existing records."""
    now = datetime.now(UTC)
    async with AsyncSessionLocal() as session:
        owner = await first_or_create(
            session,
            Admin,
            {
                "username": "portfolio-owner",
                "password_hash": hash_password("DemoOwner123!"),
                "role": "OWNER",
                "is_superuser": True,
                "is_active": True,
            },
            email="owner@demo.invalid",
        )
        staff = await first_or_create(
            session,
            Admin,
            {
                "username": "portfolio-staff",
                "password_hash": hash_password("DemoStaff123!"),
                "role": "STAFF",
                "is_superuser": False,
                "is_active": True,
            },
            email="staff@demo.invalid",
        )

        customer = await first_or_create(
            session,
            Customer,
            {
                "full_name": "Amina Example",
                "email": "amina@example.invalid",
                "address": "Fictional portfolio address",
                "city": "Demo City",
                "state": "Demo State",
                "postal_code": "00000",
                "country": "Malaysia",
            },
            phone_number="0100000001",
        )
        product = await first_or_create(
            session,
            Product,
            {
                "description": "Fictional portfolio sample. Not a real product, price, or client offer.",
                "price": Decimal("18.00"),
                "category": "Portfolio sample",
                "is_active": True,
            },
            name="Fictional Berry Treat",
        )
        await first_or_create(
            session,
            Inventory,
            {"quantity": 42, "low_stock_threshold": 8},
            product_id=product.id,
        )
        discount = await first_or_create(
            session,
            Discount,
            {
                "discount_type": "PERCENTAGE",
                "discount_value": Decimal("10.00"),
                "bundle_quantity": None,
                "stack_with_bundle": False,
                "start_at": now - timedelta(days=1),
                "end_at": now + timedelta(days=30),
                "is_active": True,
            },
            product_id=product.id,
            name="Fictional 10% portfolio promotion",
        )

        order = await first_or_create(
            session,
            Order,
            {
                "status": "PROCESSING",
                "payment_status": "PAID",
                "subtotal": Decimal("36.00"),
                "discount_amount": Decimal("3.60"),
                "total_amount": Decimal("32.40"),
            },
            customer_id=customer.id,
        )
        await first_or_create(
            session,
            OrderItem,
            {
                "quantity": 2,
                "unit_price": Decimal("18.00"),
                "subtotal": Decimal("36.00"),
                "discount_id": discount.id,
                "discount_name": discount.name,
                "discount_type": discount.discount_type,
                "discount_value": discount.discount_value,
                "discount_amount": Decimal("3.60"),
                "total_amount": Decimal("32.40"),
            },
            order_id=order.id,
            product_id=product.id,
        )
        payment = await first_or_create(
            session,
            Payment,
            {
                "provider": "PORTFOLIO_DEMO",
                "provider_payment_id": "demo-payment-001",
                "amount": Decimal("32.40"),
                "currency": "MYR",
                "status": "PAID",
                "paid_at": now - timedelta(hours=2),
            },
            order_id=order.id,
        )
        await first_or_create(
            session,
            RefundRequest,
            {
                "requested_by_admin_id": staff.id,
                "reviewed_by_admin_id": owner.id,
                "status": "REQUESTED",
                "reason": "Fictional portfolio refund request for demonstration only.",
                "internal_note": "No real payment or customer is involved.",
            },
            order_id=order.id,
        )

        await first_or_create(
            session,
            SupportFAQ,
            {
                "category": "Portfolio demo",
                "answer_en": "This is an approved fictional answer used only in the portfolio demonstration.",
                "question_ms": "Adakah ini jawapan demo fiksyen?",
                "answer_ms": "Ya. Ini jawapan fiksyen yang diluluskan untuk demonstrasi portfolio sahaja.",
                "is_active": True,
            },
            question_en="Is this a fictional demo answer?",
        )
        await first_or_create(
            session,
            SupportTemplate,
            {
                "category": "Portfolio demo",
                "content_en": "Thanks for your message. A team member will help with this fictional portfolio request.",
                "content_ms": "Terima kasih atas mesej anda. Seorang ahli pasukan akan membantu permintaan portfolio fiksyen ini.",
                "is_active": True,
            },
            name="Fictional human handoff",
        )
        await first_or_create(
            session,
            HandoffRule,
            {
                "description": "Route fictional requests for a person to the internal support queue.",
                "is_active": True,
            },
            trigger="portfolio-human-handoff",
        )
        ticket = await first_or_create(
            session,
            SupportRequest,
            {
                "customer_id": customer.id,
                "contact": "fictional-contact",
                "source": "WHATSAPP_FUTURE",
                "notes": "Fictional ticket. No customer conversation is stored.",
                "handoff_reason": "HUMAN_REQUEST",
                "priority": "HIGH",
                "status": "IN_PROGRESS",
                "assigned_admin_id": staff.id,
            },
            customer_name="Amina Example",
            subject="Fictional human-handoff request",
        )
        await first_or_create(
            session,
            SupportRequestNote,
            {
                "author_admin_id": staff.id,
                "content": "Fictional internal note for the portfolio workspace.",
            },
            support_request_id=ticket.id,
        )
        conversation = await first_or_create(
            session,
            MessagingConversation,
            {"support_request_id": ticket.id},
            provider="PORTFOLIO_SIMULATOR",
            external_conversation_id="fictional-conversation-001",
        )
        await first_or_create(
            session,
            MessagingEvent,
            {
                "support_request_id": ticket.id,
                "direction": "INBOUND",
                "outcome": "HANDOFF_CREATED",
                "payload_hash": hashlib.sha256(b"fictional portfolio message").hexdigest(),
                "processed_at": now,
            },
            provider="PORTFOLIO_SIMULATOR",
            external_message_id="fictional-message-001",
            conversation_id=conversation.id,
        )
        await session.commit()
        print(
            "Fictional portfolio demo data is ready. "
            "Owner: owner@demo.invalid / DemoOwner123!; "
            "Staff: staff@demo.invalid / DemoStaff123!"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fictional portfolio demo data.")
    parser.add_argument(
        "--fictional-demo",
        action="store_true",
        help="Required acknowledgement that this command is for fictional demo data only.",
    )
    args = parser.parse_args()
    if not args.fictional_demo:
        parser.error("Refusing to run without --fictional-demo.")
    asyncio.run(seed_demo())


if __name__ == "__main__":
    main()
