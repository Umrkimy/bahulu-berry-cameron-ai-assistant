from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.order import (
    ORDER_STATUS,
    ORDER_STATUS_TRANSITIONS,
    PAYMENT_STATUS,
)
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.refund_request import RefundRequest
from app.services.inventory_services import adjust_inventory
from app.services.pricing_services import calculate_order_pricing


MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")


def _malaysia_today() -> date:
    return datetime.now(MALAYSIA_TZ).date()


def _malaysia_date_to_utc_range(
    target_date: date,
) -> tuple[datetime, datetime]:
    start_local = datetime.combine(
        target_date,
        time.min,
    ).replace(
        tzinfo=MALAYSIA_TZ,
    )

    end_local = start_local + timedelta(days=1)

    return (
        start_local.astimezone(UTC),
        end_local.astimezone(UTC),
    )


def _order_query():
    """
    Common Order query with all relationships needed by
    _serialize_order() eagerly loaded.

    This is important for async SQLAlchemy because we do not
    want relationships to be lazy-loaded during serialization.
    """
    return (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items)
            .selectinload(OrderItem.product)
            .selectinload(Product.inventory),
        )
    )


async def _reload_order(
    db: AsyncSession,
    order_id: int,
) -> Order | None:
    """
    Reload an order after commit/update with all required
    relationships eagerly loaded.

    This prevents MissingGreenlet errors during serialization.
    """
    result = await db.execute(
        _order_query().where(
            Order.id == order_id
        )
    )

    return (
        result.scalars()
        .unique()
        .first()
    )


async def find_orders(
    db: AsyncSession,
    customer_identifier: str | None = None,
    order_id: int | None = None,
    order_date: str | None = None,
) -> dict:
    query = (
        _order_query()
        .order_by(
            Order.created_at.desc()
        )
    )

    if order_id is not None:
        query = query.where(
            Order.id == order_id
        )

    elif customer_identifier:
        identifier = customer_identifier.strip()

        if not identifier:
            return {
                "success": False,
                "error": "Customer identifier cannot be empty.",
            }

        customer_result = await db.execute(
            select(Customer).where(
                (Customer.phone_number == identifier)
                | (Customer.full_name.ilike(identifier))
                | (Customer.email.ilike(identifier))
            )
        )

        customer = customer_result.scalar_one_or_none()

        if customer is None:
            customer_result = await db.execute(
                select(Customer).where(
                    Customer.full_name.ilike(
                        f"%{identifier}%"
                    )
                )
            )

            customers = customer_result.scalars().all()

            if len(customers) == 1:
                customer = customers[0]

            elif len(customers) > 1:
                return {
                    "success": False,
                    "error": (
                        "Multiple customers matched. "
                        "Please provide a more specific customer name, "
                        "phone number, or email."
                    ),
                }

        if customer is None:
            return {
                "success": False,
                "error": "Customer not found.",
            }

        query = query.where(
            Order.customer_id == customer.id
        )

    if order_date:
        normalized_date = order_date.strip().lower()

        if normalized_date == "today":
            target_date = _malaysia_today()

        elif normalized_date == "yesterday":
            target_date = (
                _malaysia_today()
                - timedelta(days=1)
            )

        else:
            try:
                target_date = date.fromisoformat(
                    normalized_date
                )
            except ValueError:
                return {
                    "success": False,
                    "error": (
                        "Invalid date format. "
                        "Use 'today', 'yesterday', or YYYY-MM-DD."
                    ),
                }

        start_utc, end_utc = _malaysia_date_to_utc_range(
            target_date
        )

        query = query.where(
            Order.created_at >= start_utc,
            Order.created_at < end_utc,
        )

    result = await db.execute(query)

    orders = (
        result.scalars()
        .unique()
        .all()
    )

    if not orders:
        if order_date:
            if normalized_date == "today":
                message = "No orders were placed today."

            elif normalized_date == "yesterday":
                message = "No orders were placed yesterday."

            else:
                message = (
                    f"No orders were placed on "
                    f"{target_date.isoformat()}."
                )
        else:
            message = "No orders found."

        return {
            "success": True,
            "orders": [],
            "message": message,
        }

    return {
        "success": True,
        "orders": [
            _serialize_order(order)
            for order in orders
        ],
    }


async def get_order(
    db: AsyncSession,
    order_id: int,
) -> dict:
    order = await _reload_order(
        db,
        order_id,
    )

    if order is None:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} was not found."
            ),
        }

    return {
        "success": True,
        "order": _serialize_order(order),
    }


async def create_order(
    db: AsyncSession,
    customer_id: int,
    items: list[dict],
) -> dict:
    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id
        )
    )

    customer = customer_result.scalar_one_or_none()

    if customer is None:
        return {
            "success": False,
            "error": "Customer not found.",
        }

    if not items:
        return {
            "success": False,
            "error": (
                "Order must contain at least one product."
            ),
        }

    try:
        pricing = await calculate_order_pricing(db, items)
    except ValueError as error:
        return {
            "success": False,
            "error": str(error),
        }

    # Create the Order.
    order = Order(
        customer_id=customer.id,
        status="PENDING",
        payment_status="UNPAID",
        subtotal=pricing["subtotal"],
        discount_amount=pricing["discount_amount"],
        total_amount=pricing["total_amount"],
    )

    db.add(order)

    # Create exactly one Delivery for this Order.
    #
    # The customer's current information is copied here so
    # the delivery address becomes a snapshot of the address
    # used when the order was created.
    delivery = Delivery(
        order=order,
        recipient_name=customer.full_name,
        recipient_phone=customer.phone_number,
        address=customer.address,
        city=customer.city,
        state=customer.state,
        postal_code=customer.postal_code,
        country=customer.country,
        status="PENDING",
    )

    db.add(delivery)

    # Create OrderItems and reduce inventory.
    for item in pricing["items"]:
        product = item["product"]
        quantity = item["quantity"]

        order_item = OrderItem(
            product_id=product.id,
            quantity=quantity,
            unit_price=item["unit_price"],
            subtotal=item["subtotal"],
            discount_id=item["discount_id"],
            discount_name=item["discount_name"],
            discount_type=item["discount_type"],
            discount_value=item["discount_value"],
            discount_bundle_quantity=item["discount_bundle_quantity"],
            discount_amount=item["discount_amount"],
            total_amount=item["total_amount"],
        )

        order.items.append(order_item)

        await adjust_inventory(
            db=db,
            product_id=product.id,
            quantity_change=-quantity,
        )

    try:
        await db.commit()

    except Exception:
        await db.rollback()

        return {
            "success": False,
            "error": "Failed to create order.",
        }

    # IMPORTANT:
    # Do not use db.refresh(order) and immediately serialize
    # the relationships. Reload the complete object instead.
    reloaded_order = await _reload_order(
        db,
        order.id,
    )

    if reloaded_order is None:
        return {
            "success": False,
            "error": "Order was created but could not be reloaded.",
        }

    return {
        "success": True,
        "message": "Order created successfully.",
        "order": _serialize_order(reloaded_order),
    }


async def update_order(
    db: AsyncSession,
    order_id: int,
    status: str | None = None,
    payment_status: str | None = None,
) -> dict:
    result = await db.execute(
        _order_query().where(
            Order.id == order_id
        )
    )

    order = (
        result.scalars()
        .unique()
        .first()
    )

    if order is None:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} was not found."
            ),
        }

    if status is not None:
        normalized_status = status.strip().upper()

        if normalized_status not in ORDER_STATUS:
            return {
                "success": False,
                "error": (
                    f"Invalid order status '{status}'. "
                    f"Allowed statuses: "
                    f"{', '.join(ORDER_STATUS)}."
                ),
            }

        if normalized_status == "CANCELLED":
            return {
                "success": False,
                "error": (
                    "Use the cancel order action so inventory "
                    "is restored safely."
                ),
            }

        if order.status in {
            "COMPLETED",
            "CANCELLED",
        }:
            return {
                "success": False,
                "error": (
                    f"Order #{order_id} is already "
                    f"{order.status.lower()} and cannot be changed."
                ),
            }

        if normalized_status != order.status and normalized_status not in (
            ORDER_STATUS_TRANSITIONS[order.status]
        ):
            return {
                "success": False,
                "error": (
                    f"Order #{order_id} cannot move from "
                    f"{order.status} to {normalized_status}."
                ),
            }

        if (
            normalized_status == "COMPLETED"
            and order.payment_status != "PAID"
        ):
            return {
                "success": False,
                "error": "Only paid orders can be marked as completed.",
            }

        order.status = normalized_status

    if payment_status is not None:
        normalized_payment_status = (
            payment_status.strip().upper()
        )

        if normalized_payment_status not in PAYMENT_STATUS:
            return {
                "success": False,
                "error": (
                    f"Invalid payment status "
                    f"'{payment_status}'. "
                    f"Allowed statuses: "
                    f"{', '.join(PAYMENT_STATUS)}."
                ),
            }

        order.payment_status = normalized_payment_status

    try:
        await db.commit()

    except Exception:
        await db.rollback()

        return {
            "success": False,
            "error": "Failed to update order.",
        }

    # IMPORTANT FIX:
    # After commit, reload the complete order with all
    # relationships eagerly loaded before serialization.
    updated_order = await _reload_order(
        db,
        order_id,
    )

    if updated_order is None:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} was updated "
                "but could not be reloaded."
            ),
        }

    return {
        "success": True,
        "message": (
            f"Order #{order_id} updated successfully."
        ),
        "order": _serialize_order(updated_order),
    }


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    new_status: str,
) -> dict:
    return await update_order(
        db=db,
        order_id=order_id,
        status=new_status,
    )


async def cancel_order(
    db: AsyncSession,
    order_id: int,
    cancellation_admin_id: int | None = None,
) -> dict:
    result = await db.execute(
        _order_query().where(
            Order.id == order_id
        )
    )

    order = (
        result.scalars()
        .unique()
        .first()
    )

    if order is None:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} was not found."
            ),
        }

    if order.status in {"COMPLETED", "CANCELLED"}:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} is already "
                f"{order.status.lower()} and cannot be cancelled."
            ),
        }

    if order.status not in {"PENDING", "PROCESSING"}:
        return {
            "success": False,
            "error": (
                "Only pending or processing orders can be cancelled. "
                "Shipped orders need a separate return process."
            ),
        }

    if order.payment_status == "PAID" and order.status not in {"PENDING", "PROCESSING"}:
        return {
            "success": False,
            "error": (
                "Only paid orders that are pending or processing can be cancelled and refunded."
            ),
        }

    if order.payment_status == "PAID" and cancellation_admin_id is None:
        return {
            "success": False,
            "error": "A paid order cancellation requires an authenticated owner.",
        }

    # Validate all inventory records before changing anything.
    for item in order.items:
        if item.product is None:
            return {
                "success": False,
                "error": (
                    f"Product #{item.product_id} was not found."
                ),
            }

        if item.product.inventory is None:
            return {
                "success": False,
                "error": (
                    "No inventory record exists "
                    f"for product '{item.product.name}'."
                ),
            }

    # Restore inventory.
    for item in order.items:
        await adjust_inventory(
            db=db,
            product_id=item.product.id,
            quantity_change=item.quantity,
        )

    order.status = "CANCELLED"

    refund_request_id = None
    refund_request_auto_approved = False

    if order.payment_status == "PAID":
        existing_refund_request = await db.scalar(
            select(RefundRequest).where(RefundRequest.order_id == order.id)
        )

        if existing_refund_request is None:
            refund_request = RefundRequest(
                order_id=order.id,
                requested_by_admin_id=cancellation_admin_id,
                reviewed_by_admin_id=cancellation_admin_id,
                status="APPROVED",
                reason="Order cancelled before shipment.",
                internal_note="Automatically approved after cancelling a paid order before shipment.",
                reviewed_at=datetime.now(UTC),
            )
            db.add(refund_request)
            await db.flush()
            refund_request_id = refund_request.id
            refund_request_auto_approved = True
        elif existing_refund_request.status != "REFUNDED":
            existing_refund_request.status = "APPROVED"
            existing_refund_request.reviewed_by_admin_id = cancellation_admin_id
            existing_refund_request.reviewed_at = datetime.now(UTC)
            existing_refund_request.internal_note = "Automatically approved after cancelling a paid order before shipment."
            refund_request_id = existing_refund_request.id
            refund_request_auto_approved = True
        else:
            refund_request_id = existing_refund_request.id

    try:
        await db.commit()

    except Exception:
        await db.rollback()

        return {
            "success": False,
            "error": "Failed to cancel order.",
        }

    cancelled_order = await _reload_order(
        db,
        order_id,
    )

    if cancelled_order is None:
        return {
            "success": False,
            "error": (
                f"Order #{order_id} was cancelled "
                "but could not be reloaded."
            ),
        }

    return {
        "success": True,
        "message": (
            f"Order #{order_id} cancelled successfully."
        ),
        "order": _serialize_order(cancelled_order),
        "refund_request_id": refund_request_id,
        "refund_request_auto_approved": refund_request_auto_approved,
    }


def _serialize_order(
    order: Order,
) -> dict:
    created_at = order.created_at

    if created_at.tzinfo is None:
        created_at = created_at.replace(
            tzinfo=UTC
        )

    created_at_malaysia = created_at.astimezone(
        MALAYSIA_TZ
    )

    updated_at = order.updated_at

    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(
            tzinfo=UTC
        )

    updated_at_malaysia = updated_at.astimezone(
        MALAYSIA_TZ
    )

    return {
        "id": order.id,
        "customer": {
            "id": order.customer.id,
            "full_name": order.customer.full_name,
            "phone_number": order.customer.phone_number,
            "email": order.customer.email,
        },
        "status": order.status,
        "payment_status": order.payment_status,
        "subtotal": float(order.subtotal),
        "discount_amount": float(order.discount_amount),
        "total_amount": float(order.total_amount),
        "created_at": created_at_malaysia.isoformat(),
        "updated_at": updated_at_malaysia.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "product_name": (
                    item.product.name
                    if item.product
                    else None
                ),
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
                "discount_id": item.discount_id,
                "discount_name": item.discount_name,
                "discount_type": item.discount_type,
                "discount_value": (
                    float(item.discount_value)
                    if item.discount_value is not None
                    else None
                ),
                "discount_bundle_quantity": item.discount_bundle_quantity,
                "discount_amount": float(item.discount_amount),
                "total_amount": float(item.total_amount),
            }
            for item in order.items
        ],
    }
