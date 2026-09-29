"""Private order tracking for website customers, without an account.

Each website order gets a random tracking token at checkout. Only its SHA-256
hash is stored, so a database leak does not reveal working links. Customers can
also find an order with its number and the phone number used at checkout.
Tracking stops ``TRACKING_RETENTION_DAYS`` after the order closes.
"""

import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.storefront import (
    StorefrontTrackedDelivery,
    StorefrontTrackedItem,
    StorefrontTrackedOrder,
)
from app.services.contact_normalization import ContactNormalizationError, normalize_phone_number

TRACKING_RETENTION_DAYS = 90
# token_urlsafe(32) gives 43 URL-safe characters; accept a little slack.
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,64}$")


def new_tracking_token() -> str:
    return secrets.token_urlsafe(32)


def hash_tracking_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_tracking_token(order: Order) -> str:
    """Give the order a fresh token, replacing any earlier one."""
    token = new_tracking_token()
    order.tracking_token_hash = hash_tracking_token(token)
    return token


def _as_utc(value: datetime) -> datetime:
    # SQLite hands back naive datetimes; they were stored as UTC.
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _utc_or_none(value: datetime | None) -> datetime | None:
    return _as_utc(value) if value else None


def is_trackable(order: Order, now: datetime | None = None) -> bool:
    if order.source != "STOREFRONT":
        return False
    if order.closed_at is None:
        return True
    now = now or datetime.now(UTC)
    return now <= _as_utc(order.closed_at) + timedelta(days=TRACKING_RETENTION_DAYS)


def _tracked_order_query():
    return select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.delivery),
        selectinload(Order.customer),
    )


async def find_order_by_token(db: AsyncSession, token: str) -> Order | None:
    if not TOKEN_PATTERN.fullmatch(token):
        return None
    order = await db.scalar(_tracked_order_query().where(Order.tracking_token_hash == hash_tracking_token(token)))
    return order if order is not None and is_trackable(order) else None


async def find_order_by_phone(db: AsyncSession, order_number: int, phone_number: str) -> Order | None:
    """Match a website order by number and the phone used to place it.

    Every failure returns None so callers give one generic answer.
    """
    try:
        phone = normalize_phone_number(phone_number)
    except ContactNormalizationError:
        return None
    order = await db.scalar(_tracked_order_query().where(Order.id == order_number, Order.source == "STOREFRONT"))
    if order is None or not is_trackable(order):
        return None
    known_phones = {
        order.delivery.recipient_phone if order.delivery else None,
        order.customer.canonical_phone_number if order.customer else None,
    }
    return order if phone in known_phones else None


def _first_name(full_name: str | None) -> str | None:
    parts = (full_name or "").split()
    return parts[0] if parts else None


def _last_digits(phone: str | None) -> str | None:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-4:] if len(digits) >= 4 else None


def tracking_view(order: Order) -> StorefrontTrackedOrder:
    delivery = order.delivery
    return StorefrontTrackedOrder(
        order_number=order.id,
        created_at=_as_utc(order.created_at),
        closed_at=_utc_or_none(order.closed_at),
        status=order.status,
        payment_status=order.payment_status,
        items=[
            StorefrontTrackedItem(
                name_en=item.product.name,
                name_ms=item.product.name_ms or item.product.name,
                quantity=item.quantity,
                total_amount=item.total_amount,
            )
            for item in order.items
        ],
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        delivery=StorefrontTrackedDelivery(
            status=delivery.status,
            courier=delivery.courier,
            tracking_number=delivery.tracking_number,
            shipped_at=_utc_or_none(delivery.shipped_at),
            out_for_delivery_at=_utc_or_none(delivery.out_for_delivery_at),
            delivered_at=_utc_or_none(delivery.delivered_at),
            failed_at=_utc_or_none(delivery.failed_at),
        ) if delivery else None,
        recipient_first_name=_first_name(delivery.recipient_name if delivery else order.customer.full_name),
        phone_last_digits=_last_digits(delivery.recipient_phone if delivery else order.customer.canonical_phone_number),
    )
