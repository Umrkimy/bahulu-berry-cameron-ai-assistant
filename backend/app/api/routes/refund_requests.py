from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.core.rate_limit import REFUND_LIMIT, rate_limiter
from app.db.database import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund_request import RefundRequest
from app.payments.service import refund_payment
from app.schemas.refund_request import RefundRequestCreate, RefundRequestPublic, RefundRequestUpdate
from app.services.activity_services import record_activity


router = APIRouter()
VALID_TRANSITIONS = {
    "REQUESTED": {"UNDER_REVIEW", "APPROVED", "REJECTED"},
    "UNDER_REVIEW": {"APPROVED", "REJECTED"},
    "APPROVED": {"REJECTED"},
    "REJECTED": set(),
    "REFUNDED": set(),
}


def serialize_request(request: RefundRequest) -> RefundRequestPublic:
    if request.order is None or request.order.customer is None:
        raise HTTPException(status_code=500, detail="Refund request order details could not be loaded.")
    return RefundRequestPublic(
        id=request.id,
        order_id=request.order_id,
        customer_name=request.order.customer.full_name,
        order_total=request.order.total_amount,
        status=request.status,
        reason=request.reason,
        internal_note=request.internal_note,
        requested_by_admin_id=request.requested_by_admin_id,
        reviewed_by_admin_id=request.reviewed_by_admin_id,
        created_at=request.created_at,
        reviewed_at=request.reviewed_at,
        refunded_at=request.refunded_at,
        updated_at=request.updated_at,
    )


async def get_request_with_order(db: AsyncSession, request_id: int) -> RefundRequest | None:
    result = await db.execute(
        select(RefundRequest)
        .options(selectinload(RefundRequest.order).selectinload(Order.customer))
        .where(RefundRequest.id == request_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[RefundRequestPublic])
async def list_refund_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    result = await db.execute(
        select(RefundRequest)
        .options(selectinload(RefundRequest.order).selectinload(Order.customer))
        .order_by(RefundRequest.created_at.desc())
    )
    return [serialize_request(request) for request in result.scalars().all()]


@router.get("/orders/{order_id}", response_model=RefundRequestPublic)
async def get_order_refund_request(
    order_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    result = await db.execute(
        select(RefundRequest)
        .options(selectinload(RefundRequest.order).selectinload(Order.customer))
        .where(RefundRequest.order_id == order_id)
    )
    request = result.scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=404, detail="No refund request found for this order.")
    return serialize_request(request)


@router.post("", response_model=RefundRequestPublic, status_code=status.HTTP_201_CREATED)
async def create_refund_request(
    data: RefundRequestCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    await rate_limiter.check(request, "refund-request", REFUND_LIMIT)
    order = await db.get(Order, data.order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.payment_status != "PAID":
        raise HTTPException(status_code=400, detail="Only paid orders can have a refund request.")
    if order.status not in {"PENDING", "PROCESSING"}:
        raise HTTPException(
            status_code=400,
            detail="Only paid orders that are pending or processing can have a refund request.",
        )
    existing = await db.scalar(select(RefundRequest.id).where(RefundRequest.order_id == data.order_id))
    if existing is not None:
        raise HTTPException(status_code=400, detail="This order already has a refund request.")
    request = RefundRequest(order_id=data.order_id, requested_by_admin_id=current_admin.id, reason=data.reason.strip())
    db.add(request)
    await db.flush()
    await record_activity(db, admin=current_admin, action="requested", entity_type="refund_request", entity_id=request.id, description=f"Recorded a refund request for order #{data.order_id}.")
    await db.commit()
    request = await get_request_with_order(db, request.id)
    if request is None:
        raise HTTPException(status_code=500, detail="Refund request could not be loaded.")
    return serialize_request(request)


@router.patch("/{request_id}", response_model=RefundRequestPublic)
async def update_refund_request(
    request_id: int,
    data: RefundRequestUpdate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await rate_limiter.check(request, "refund-review", REFUND_LIMIT)
    request = await get_request_with_order(db, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Refund request not found.")
    if data.status not in VALID_TRANSITIONS[request.status]:
        raise HTTPException(status_code=400, detail="This refund request cannot move to that status.")
    request.status = data.status
    request.internal_note = data.internal_note.strip() if data.internal_note else None
    request.reviewed_by_admin_id = current_admin.id
    request.reviewed_at = datetime.now(UTC)
    await record_activity(db, admin=current_admin, action=data.status.lower(), entity_type="refund_request", entity_id=request.id, description=f"Marked refund request for order #{request.order_id} as {data.status.lower().replace('_', ' ')}.")
    await db.commit()
    updated_request = await get_request_with_order(db, request.id)
    if updated_request is None:
        raise HTTPException(status_code=500, detail="Refund request could not be loaded.")
    return serialize_request(updated_request)


@router.post("/{request_id}/refund", response_model=RefundRequestPublic)
async def execute_refund_request(
    request_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await rate_limiter.check(request, "refund-execution", REFUND_LIMIT)
    request = await get_request_with_order(db, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Refund request not found.")
    if request.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved refund requests can be refunded.")
    if request.order.status not in {"PENDING", "PROCESSING", "CANCELLED"}:
        raise HTTPException(
            status_code=400,
            detail="Only orders that are pending, processing, or cancelled before shipment can be refunded.",
        )
    payment = await db.scalar(
        select(Payment)
        .where(Payment.order_id == request.order_id)
        .order_by(Payment.created_at.desc())
        .with_for_update()
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="No payment found for this order.")
    try:
        await refund_payment(db, payment, request.reason)
        request.status = "REFUNDED"
        request.reviewed_by_admin_id = current_admin.id
        request.refunded_at = datetime.now(UTC)
        await record_activity(db, admin=current_admin, action="refunded", entity_type="refund_request", entity_id=request.id, description=f"Refunded approved request for order #{request.order_id}.")
        await record_activity(db, admin=current_admin, action="refunded", entity_type="payment", entity_id=payment.id, description=f"Refunded Stripe test payment for order #{request.order_id}.")
        await db.commit()
    except ValueError as error:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(error)) from error
    except stripe.StripeError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe could not confirm the refund. No dashboard payment status was changed.",
        ) from None
    updated_request = await get_request_with_order(db, request.id)
    if updated_request is None:
        raise HTTPException(status_code=500, detail="Refund request could not be loaded.")
    return serialize_request(updated_request)
