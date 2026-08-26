from datetime import UTC, datetime
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

from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.db.database import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.models.payment import Payment
from app.payments.service import create_payment
from app.schemas.payment import PaymentResponse


router = APIRouter()


@router.post(
    "/orders/{order_id}",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_order_payment(
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

    payment = await create_payment(
        db=db,
        order=order,
    )

    return payment


@router.get(
    "/orders/{order_id}",
    response_model=PaymentResponse,
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

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payment found for this order.",
        )

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
        "checkout.session.expired",
    }:
        return {
            "received": True,
        }

    session = event["data"]["object"].to_dict()

    metadata = session.get("metadata")

    if not metadata:
        return {
            "received": True,
            "message": "Webhook metadata missing.",
        }

    payment_id = metadata.get("payment_id")
    order_id = metadata.get("order_id")

    if not payment_id or not order_id:
        return {
            "received": True,
            "message": "Webhook metadata missing.",
        }

    try:
        payment_id = int(payment_id)
        order_id = int(order_id)

    except (TypeError, ValueError):
        return {
            "received": True,
            "message": "Invalid webhook metadata.",
        }

    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id
        )
    )

    payment = result.scalar_one_or_none()

    if payment is None:
        return {
            "received": True,
            "message": "Payment not found.",
        }

    if event_type == "checkout.session.expired":
        if payment.status == "PAID":
            return {
                "received": True,
                "message": "Payment already paid.",
            }

        payment.status = "EXPIRED"

        await db.commit()

        return {
            "received": True,
            "message": "Payment expired.",
        }

    if event_type == "checkout.session.completed":
        if payment.status == "PAID":
            return {
                "received": True,
                "message": "Payment already processed.",
            }

        result = await db.execute(
            select(Order).where(
                Order.id == order_id
            )
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

        await db.commit()

        return {
            "received": True,
            "message": "Payment successfully processed.",
        }

    return {
        "received": True,
    }