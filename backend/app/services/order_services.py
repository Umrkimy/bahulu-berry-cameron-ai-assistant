from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.order import ORDER_STATUS, PAYMENT_STATUS
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.services.inventory_services import adjust_inventory


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
    delivery_name: str | None = None,
    delivery_phone: str | None = None,
    delivery_address: str | None = None,
    city: str | None = None,
    state: str | None = None,
    postal_code: str | None = None,
    country: str = "Malaysia",
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

    combined_items: dict[int, int] = {}

    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if not isinstance(product_id, int):
            return {
                "success": False,
                "error": "Invalid product ID.",
            }

        if (
            not isinstance(quantity, int)
            or quantity <= 0
        ):
            return {
                "success": False,
                "error": (
                    "Product quantity must be a positive integer."
                ),
            }

        combined_items[product_id] = (
            combined_items.get(product_id, 0)
            + quantity
        )

    validated_items = []

    for product_id, quantity in combined_items.items():
        result = await db.execute(
            select(Product)
            .options(
                selectinload(Product.inventory)
            )
            .where(
                Product.id == product_id,
                Product.is_active.is_(True),
            )
        )

        product = result.scalar_one_or_none()

        if product is None:
            return {
                "success": False,
                "error": (
                    f"Product #{product_id} "
                    "was not found or is inactive."
                ),
            }

        if product.inventory is None:
            return {
                "success": False,
                "error": (
                    "No inventory record exists "
                    f"for product '{product.name}'."
                ),
            }

        available_stock = product.inventory.quantity

        if available_stock < quantity:
            return {
                "success": False,
                "error": (
                    f"Insufficient stock for "
                    f"'{product.name}'. "
                    f"Available: {available_stock}, "
                    f"requested: {quantity}."
                ),
            }

        unit_price = Decimal(
            str(product.price)
        )

        subtotal = unit_price * quantity

        validated_items.append(
            {
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
            }
        )

    total_amount = sum(
        (
            item["subtotal"]
            for item in validated_items
        ),
        Decimal("0.00"),
    )

    order = Order(
        customer_id=customer.id,
        status="PENDING",
        payment_status="UNPAID",
        total_amount=total_amount,
        delivery_name=(
            delivery_name
            or customer.full_name
        ),
        delivery_phone=(
            delivery_phone
            or customer.phone_number
        ),
        delivery_address=(
            delivery_address
            or customer.address
        ),
        city=(
            city
            or customer.city
        ),
        state=(
            state
            or customer.state
        ),
        postal_code=(
            postal_code
            or customer.postal_code
        ),
        country=(
            country
            or customer.country
        ),
    )

    db.add(order)

    for item in validated_items:
        product = item["product"]
        quantity = item["quantity"]

        order_item = OrderItem(
            product_id=product.id,
            quantity=quantity,
            unit_price=item["unit_price"],
            subtotal=item["subtotal"],
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
    delivery_name: str | None = None,
    delivery_phone: str | None = None,
    delivery_address: str | None = None,
    city: str | None = None,
    state: str | None = None,
    postal_code: str | None = None,
    country: str | None = None,
    tracking_number: str | None = None,
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

        # Completed and cancelled orders are final.
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

        # Cancellation restores inventory.
        if normalized_status == "CANCELLED":
            for item in order.items:
                if item.product is None:
                    return {
                        "success": False,
                        "error": (
                            f"Product #{item.product_id} "
                            "was not found."
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

            for item in order.items:
                await adjust_inventory(
                    db=db,
                    product_id=item.product.id,
                    quantity_change=item.quantity,
                )

            order.status = "CANCELLED"

        else:
            order.status = normalized_status

            if normalized_status == "SHIPPED":
                order.shipped_at = datetime.now(UTC)

            elif normalized_status == "COMPLETED":
                order.completed_at = datetime.now(UTC)

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

    if delivery_name is not None:
        order.delivery_name = delivery_name

    if delivery_phone is not None:
        order.delivery_phone = delivery_phone

    if delivery_address is not None:
        order.delivery_address = delivery_address

    if city is not None:
        order.city = city

    if state is not None:
        order.state = state

    if postal_code is not None:
        order.postal_code = postal_code

    if country is not None:
        order.country = country

    if tracking_number is not None:
        order.tracking_number = tracking_number

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
) -> dict:
    return await update_order(
        db=db,
        order_id=order_id,
        status="CANCELLED",
    )


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
        "total_amount": float(order.total_amount),
        "delivery": {
            "name": order.delivery_name,
            "phone": order.delivery_phone,
            "address": order.delivery_address,
            "city": order.city,
            "state": order.state,
            "postal_code": order.postal_code,
            "country": order.country,
        },
        "tracking_number": order.tracking_number,
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
            }
            for item in order.items
        ],
    }