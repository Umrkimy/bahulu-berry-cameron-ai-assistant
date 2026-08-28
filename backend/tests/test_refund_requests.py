from datetime import UTC, datetime
from decimal import Decimal

from starlette.requests import Request
from app.api.routes.refund_requests import (
    create_refund_request,
    execute_refund_request,
    update_refund_request,
)
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund_request import RefundRequest
from app.schemas.refund_request import RefundRequestCreate, RefundRequestUpdate
from app.services.order_services import cancel_order


def staff_request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/api/refund-requests", "headers": [], "client": ("127.0.0.1", 50000)})


async def setup_paid_order(session, order_status="PROCESSING"):
    staff = Admin(username="staff", email="staff@example.com", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    owner = Admin(username="owner", email="owner@example.com", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    customer = Customer(full_name="Umar", phone_number="0123456789")
    session.add_all([staff, owner, customer])
    await session.flush()
    order = Order(
        customer_id=customer.id,
        total_amount=Decimal("25.00"),
        status=order_status,
        payment_status="PAID",
    )
    session.add(order)
    await session.flush()
    session.add(Payment(order_id=order.id, provider="stripe", provider_payment_id="cs_test_123", amount=Decimal("25.00"), currency="MYR", status="PAID"))
    await session.commit()
    return staff, owner, order


async def test_staff_can_record_before_owner_approves_and_executes_refund(session, monkeypatch):
    staff, owner, order = await setup_paid_order(session)

    request = await create_refund_request(
        RefundRequestCreate(order_id=order.id, reason="Customer asked to cancel."),
        staff_request(),
        session,
        staff,
    )
    assert request.status == "REQUESTED"

    approved = await update_refund_request(
        request.id,
        RefundRequestUpdate(status="APPROVED", internal_note="Order not delivered."),
        staff_request(),
        session,
        owner,
    )
    assert approved.status == "APPROVED"
    assert approved.reviewed_by_admin_id == owner.id

    async def fake_refund(db, payment, reason):
        payment.status = "REFUNDED"
        payment.refund_reason = reason
        payment.refunded_at = datetime.now(UTC)
        refund_order = await db.get(Order, payment.order_id)
        refund_order.payment_status = "REFUNDED"
        return payment

    monkeypatch.setattr("app.api.routes.refund_requests.refund_payment", fake_refund)
    refunded = await execute_refund_request(request.id, staff_request(), session, owner)

    assert refunded.status == "REFUNDED"
    assert refunded.refunded_at is not None


async def test_paid_pending_order_can_have_a_refund_request(session):
    staff, _, order = await setup_paid_order(session, order_status="PENDING")

    request = await create_refund_request(
        RefundRequestCreate(order_id=order.id, reason="Customer changed their mind."),
        staff_request(),
        session,
        staff,
    )

    assert request.status == "REQUESTED"


async def test_paid_processing_cancellation_prepares_an_approved_refund(session, monkeypatch):
    _, owner, order = await setup_paid_order(session)

    result = await cancel_order(
        session,
        order.id,
        cancellation_admin_id=owner.id,
    )

    assert result["success"] is True
    assert result["refund_request_auto_approved"] is True
    assert result["order"]["status"] == "CANCELLED"

    refund_request = await session.get(RefundRequest, result["refund_request_id"])
    assert refund_request is not None
    assert refund_request.status == "APPROVED"
    assert refund_request.requested_by_admin_id == owner.id

    async def fake_refund(db, payment, reason):
        payment.status = "REFUNDED"
        payment.refund_reason = reason
        payment.refunded_at = datetime.now(UTC)
        refund_order = await db.get(Order, payment.order_id)
        refund_order.payment_status = "REFUNDED"
        return payment

    monkeypatch.setattr("app.api.routes.refund_requests.refund_payment", fake_refund)
    refunded = await execute_refund_request(refund_request.id, staff_request(), session, owner)

    assert refunded.status == "REFUNDED"
