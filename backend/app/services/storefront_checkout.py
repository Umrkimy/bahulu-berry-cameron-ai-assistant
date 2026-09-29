"""Website checkout: turn a customer's cart into an order and a payment link.

The backend prices the order, deducts stock and creates the payment. Money is
only marked as paid by the provider's signed webhook. Unpaid website orders
are cancelled after ``STOREFRONT_UNPAID_ORDER_MINUTES`` so their stock returns.
"""

import hashlib
import logging
from datetime import UTC, datetime, timedelta

import stripe
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.checkout import CheckoutRequest
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.payments.service import create_payment
from app.schemas.storefront import StorefrontCheckoutRequest, StorefrontCheckoutResponse
from app.services.activity_services import record_activity
from app.services.contact_normalization import (
    ContactNormalizationError,
    normalize_email,
    normalize_phone_number,
)
from app.services.order_services import cancel_order, create_order
from app.services.order_tracking import issue_tracking_token

logger = logging.getLogger("bahulu.checkout")


class CheckoutError(Exception):
    """A checkout problem that is safe to show the customer."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _request_hash(data: StorefrontCheckoutRequest) -> str:
    return hashlib.sha256(data.model_dump_json().encode()).hexdigest()


def _response(order: Order, payment: Payment, tracking_token: str) -> StorefrontCheckoutResponse:
    return StorefrontCheckoutResponse(
        order_number=order.id,
        total_amount=order.total_amount,
        payment_url=payment.payment_url,
        tracking_token=tracking_token,
    )


async def _replay(db: AsyncSession, existing: CheckoutRequest, request_hash: str) -> StorefrontCheckoutResponse:
    if existing.request_hash != request_hash:
        raise CheckoutError(409, "IDEMPOTENCY_MISMATCH", "This checkout was already submitted with different details.")
    order = await db.get(Order, existing.order_id)
    payment = await db.get(Payment, existing.payment_id) if existing.payment_id else None
    if order is None or payment is None or payment.status != "PENDING" or not payment.payment_url:
        raise CheckoutError(409, "CHECKOUT_CLOSED", "This checkout has finished. Please start again from your cart.")
    # The first token was never stored, so a retry gets a new one; only the
    # latest link works.
    tracking_token = issue_tracking_token(order)
    await db.commit()
    return _response(order, payment, tracking_token)


async def _customer_for_checkout(db: AsyncSession, data: StorefrontCheckoutRequest, phone: str) -> Customer:
    """Find the customer by phone, or create one.

    An existing customer's saved details are never changed from public input;
    the order's delivery snapshot carries what was typed at checkout.
    """
    customer = await db.scalar(select(Customer).where(Customer.canonical_phone_number == phone))
    if customer is not None:
        if customer.is_archived:
            raise CheckoutError(409, "CONTACT_US", "We could not place this order online. Please message us on WhatsApp.")
        return customer

    contact = data.contact
    email = normalize_email(contact.email)
    if email and await db.scalar(select(Customer.id).where(Customer.canonical_email == email)):
        # The email belongs to another record; keep it off this one rather
        # than reveal or merge anything.
        email = None

    def new_customer(email: str | None) -> Customer:
        return Customer(
            full_name=contact.full_name,
            phone_number=phone,
            canonical_phone_number=phone,
            email=email,
            canonical_email=email,
            address=contact.address,
            city=contact.city,
            state=contact.state,
            postal_code=contact.postal_code,
            country="Malaysia",
        )

    try:
        async with db.begin_nested():
            customer = new_customer(email)
            db.add(customer)
            await db.flush()
    except IntegrityError:
        # A simultaneous checkout created this phone or email first.
        existing = await db.scalar(select(Customer).where(Customer.canonical_phone_number == phone))
        if existing is not None:
            if existing.is_archived:
                raise CheckoutError(409, "CONTACT_US", "We could not place this order online. Please message us on WhatsApp.")
            return existing
        customer = new_customer(None)
        db.add(customer)
        await db.flush()
    return customer


async def place_storefront_order(
    db: AsyncSession,
    data: StorefrontCheckoutRequest,
    idempotency_key: str,
) -> StorefrontCheckoutResponse:
    request_hash = _request_hash(data)
    existing = await db.scalar(select(CheckoutRequest).where(CheckoutRequest.idempotency_key == idempotency_key))
    if existing is not None:
        return await _replay(db, existing, request_hash)

    try:
        phone = normalize_phone_number(data.contact.phone_number)
    except ContactNormalizationError as error:
        raise CheckoutError(422, "INVALID_PHONE", error.message) from error

    customer = await _customer_for_checkout(db, data, phone)
    contact = data.contact
    delivery_details = {
        "recipient_name": contact.full_name,
        "recipient_phone": phone,
        "address": contact.address,
        "city": contact.city,
        "state": contact.state,
        "postal_code": contact.postal_code,
        "country": "Malaysia",
    }
    items = [{"product_id": item.product_id, "quantity": item.quantity} for item in data.items]

    unavailable = CheckoutError(409, "UNAVAILABLE", "Some items are no longer available. Please review your cart.")
    try:
        result = await create_order(db, customer.id, items, source="STOREFRONT", delivery_details=delivery_details)
    except HTTPException as error:
        # Stock changed between pricing and deduction.
        await db.rollback()
        raise unavailable from error
    if not result["success"]:
        await db.rollback()
        raise unavailable

    order = await db.get(Order, result["order"]["id"])
    try:
        payment, _ = await create_payment(
            db,
            order,
            customer_name=contact.full_name,
            customer_email=normalize_email(contact.email),
            customer_phone=phone,
        )
    except (stripe.StripeError, ValueError) as error:
        await db.rollback()
        logger.warning("storefront_payment_create_failed", extra={"error_type": type(error).__name__})
        raise CheckoutError(503, "PAYMENT_UNAVAILABLE", "Online payment is unavailable right now. Please try again shortly.") from error

    tracking_token = issue_tracking_token(order)
    db.add(CheckoutRequest(
        idempotency_key=idempotency_key,
        request_hash=request_hash,
        order_id=order.id,
        payment_id=payment.id,
    ))
    await record_activity(
        db,
        action="created",
        entity_type="order",
        entity_id=order.id,
        description=f"Website order #{order.id} was placed and is awaiting payment.",
        metadata={"source": "STOREFRONT", "locale": data.locale},
    )
    await db.commit()
    return _response(order, payment, tracking_token)


async def cancel_unpaid_storefront_order(db: AsyncSession, order_id: int) -> bool:
    """Cancel a website order that was never paid, restoring its stock.

    Admin orders are never touched; staff decide what happens to those.
    """
    order = await db.get(Order, order_id)
    if (
        order is None
        or order.source != "STOREFRONT"
        or order.status != "PENDING"
        or order.payment_status == "PAID"
    ):
        return False
    result = await cancel_order(db, order_id)
    return bool(result["success"])


async def cancel_stale_storefront_orders(db: AsyncSession) -> int:
    """Cancel website orders left unpaid past the configured window."""
    cutoff = datetime.now(UTC) - timedelta(minutes=settings.STOREFRONT_UNPAID_ORDER_MINUTES)
    order_ids = (await db.scalars(
        select(Order.id).where(
            Order.source == "STOREFRONT",
            Order.status == "PENDING",
            Order.payment_status.in_(["UNPAID", "FAILED"]),
            Order.created_at < cutoff,
        )
    )).all()

    cancelled = 0
    for order_id in order_ids:
        if await cancel_unpaid_storefront_order(db, order_id):
            await record_activity(
                db,
                action="cancelled",
                entity_type="order",
                entity_id=order_id,
                description=f"Unpaid website order #{order_id} was cancelled and its stock restored.",
            )
            await db.commit()
            cancelled += 1
        else:
            await db.rollback()
    return cancelled
