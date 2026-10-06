from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

import stripe
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.core.config import settings
from app.core.rate_limit import PAYMENT_LIMIT, rate_limiter
from app.db.database import get_db
from app.models.admin import Admin
from app.models.checkout import PaymentWebhookEvent
from app.models.order import Order
from app.models.payment import Payment
from app.payments.service import create_payment
from app.schemas.payment import PaymentResponse
from app.services.activity_services import record_activity
from app.services.customer_status_emails import ORDER_RECEIVED, queue_status_email
from app.services.notification_services import notify_owners_with_email
from app.services.storefront_checkout import cancel_unpaid_storefront_order


router = APIRouter()


@router.post(
    "/orders/{order_id}",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_order_payment(
    order_id: int,
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    await rate_limiter.check(request, "payment-link", PAYMENT_LIMIT)
    result = await db.execute(
        select(Order).where(
            Order.id == order_id
        )
    )

    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    if order.status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create payment for a cancelled order.",
        )

    if order.payment_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already paid.",
        )

    payment, created = await create_payment(
        db=db,
        order=order,
    )

    if created:
        await record_activity(db, admin=current_admin, action="created", entity_type="payment", entity_id=payment.id, description=f"Created Stripe test payment for order #{order_id}.")
        await db.commit()
        await db.refresh(payment)

    return payment


@router.get(
    "/orders/{order_id}",
    response_model=PaymentResponse | None,
)
async def get_order_payment(
    order_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id
        )
    )

    order = order_result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    payment_result = await db.execute(
        select(Payment)
        .where(
            Payment.order_id == order_id
        )
        .order_by(
            Payment.created_at.desc()
        )
    )

    payment = payment_result.scalars().first()

    return payment


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
):
    payload = await request.body()

    signature = request.headers.get(
        "stripe-signature"
    )

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature.",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            settings.STRIPE_WEBHOOK_SECRET.get_secret_value(),
        )

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        )

    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe signature.",
        )

    event_type = event["type"]

    if event_type not in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
    }:
        return {
            "received": True,
        }

    # Stripe may redeliver an event; each event id is handled once. The row is
    # committed together with the changes the event makes.
    event_id = str(event["id"])
    already_handled = await db.scalar(
        select(PaymentWebhookEvent.id).where(
            PaymentWebhookEvent.provider == "stripe",
            PaymentWebhookEvent.event_id == event_id,
        )
    )
    if already_handled is not None:
        return {
            "received": True,
            "message": "Event already processed.",
        }
    db.add(PaymentWebhookEvent(provider="stripe", event_id=event_id, event_type=event_type))

    session = event["data"]["object"].to_dict()

    metadata = session.get("metadata")

    if not metadata:
        return {
            "received": True,
            "message": "Webhook metadata missing.",
        }

    payment_id = metadata.get("payment_id")
    if not payment_id:
        return {
            "received": True,
            "message": "Webhook metadata missing.",
        }

    try:
        payment_id = int(payment_id)
    except (TypeError, ValueError):
        return {
            "received": True,
            "message": "Invalid webhook metadata.",
        }

    # Row locks serialise duplicate or concurrent deliveries of the same event.
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id
        ).with_for_update()
    )

    payment = result.scalar_one_or_none()

    if payment is None:
        return {
            "received": True,
            "message": "Payment not found.",
        }

    if (
        payment.provider != "stripe"
        or payment.provider_payment_id != session.get("id")
    ):
        return {
            "received": True,
            "message": "Payment does not match this Stripe session.",
        }

    if event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
        if payment.status == "PAID":
            return {
                "received": True,
                "message": "Payment already paid.",
            }

        if payment.status in {"EXPIRED", "FAILED"}:
            # Already closed locally, e.g. when the order was cancelled.
            return {
                "received": True,
                "message": f"Payment already {payment.status.lower()}.",
            }

        failed = event_type == "checkout.session.async_payment_failed"
        payment.status = "FAILED" if failed else "EXPIRED"
        if failed:
            order = await db.get(Order, payment.order_id)
            if order is not None and order.payment_status == "UNPAID":
                order.payment_status = "FAILED"
        await db.flush()

        # Unpaid website orders give their stock back straight away.
        released = await cancel_unpaid_storefront_order(db, payment.order_id)
        outcome = "failed" if failed else "expired without a completed payment"
        description = f"The payment for order #{payment.order_id} {outcome}."
        if released:
            description += " The website order was cancelled and its stock restored."

        await notify_owners_with_email(db, notification_type="PAYMENT", title="Payment failed" if failed else "Payment link expired", description=description, entity_type="payment", entity_id=payment.id, email_type="PAYMENT_FAILED", idempotency_key_prefix=f"payment-{'failed' if failed else 'expired'}:{payment.id}")
        await record_activity(db, admin=None, action="failed" if failed else "expired", entity_type="payment", entity_id=payment.id, description=description)

        await db.commit()

        return {
            "received": True,
            "message": "Payment failed." if failed else "Payment expired.",
        }

    if event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    }:
        if payment.status == "PAID":
            return {
                "received": True,
                "message": "Payment already processed.",
            }

        if session.get("payment_status") != "paid":
            return {
                "received": True,
                "message": "Checkout session is not paid.",
            }

        expected_amount = int(Decimal(str(payment.amount)) * 100)
        if (
            session.get("amount_total") != expected_amount
            or str(session.get("currency", "")).upper() != payment.currency.upper()
        ):
            await notify_owners_with_email(db, notification_type="PAYMENT", title="Payment needs review", description=f"A Stripe payment for order #{payment.order_id} did not match the expected amount, so it was not marked as paid.", entity_type="payment", entity_id=payment.id, email_type="PAYMENT_FAILED", idempotency_key_prefix=f"payment-mismatch:{payment.id}")
            await record_activity(db, admin=None, action="flagged", entity_type="payment", entity_id=payment.id, description=f"Stripe payment for order #{payment.order_id} did not match the expected amount.")
            await db.commit()
            return {
                "received": True,
                "message": "Payment amount does not match.",
            }

        result = await db.execute(
            select(Order).where(
                Order.id == payment.order_id
            ).with_for_update()
        )

        order = result.scalar_one_or_none()

        if order is None:
            return {
                "received": True,
                "message": "Order not found.",
            }

        payment.status = "PAID"
        payment.paid_at = datetime.now(UTC)

        order.payment_status = "PAID"

        if order.status == "CANCELLED":
            # The customer finished paying after the order was cancelled. Record
            # the money truthfully and ask an owner to raise the refund.
            await notify_owners_with_email(db, notification_type="PAYMENT", title="Payment received for a cancelled order", description=f"Order #{payment.order_id} was paid after it was cancelled. Create a refund request for this order.", entity_type="payment", entity_id=payment.id, email_type="PAYMENT_CONFIRMED", idempotency_key_prefix=f"payment-after-cancel:{payment.id}")
            await record_activity(db, admin=None, action="paid", entity_type="payment", entity_id=payment.id, description=f"Stripe payment for cancelled order #{payment.order_id} was received and needs a refund.")
            await db.commit()
            return {
                "received": True,
                "message": "Payment received for a cancelled order.",
            }

        await notify_owners_with_email(
            db,
            notification_type="PAYMENT",
            title="Payment confirmed",
            description=f"Payment for order #{payment.order_id} was confirmed.",
            entity_type="payment",
            entity_id=payment.id,
            email_type="PAYMENT_CONFIRMED",
            idempotency_key_prefix=f"payment-confirmed:{payment.id}",
        )

        await queue_status_email(db, order, ORDER_RECEIVED)
        await record_activity(db, admin=None, action="paid", entity_type="payment", entity_id=payment.id, description=f"Stripe payment for order #{payment.order_id} was confirmed.")

        await db.commit()

        return {
            "received": True,
            "message": "Payment successfully processed.",
        }

    return {
        "received": True,
    }
