from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.customer import CustomerCreate

from app.services.customer_services import (
    create_customer as service_create_customer,
    find_customer as service_find_customer,
)

from app.services.inventory_services import (
    adjust_inventory,
    get_inventory_by_product,
)

from app.services.order_services import (
    find_orders as service_find_orders,
    get_order as service_get_order,
    create_order as service_create_order,
    update_order_status as service_update_order_status,
    cancel_order as service_cancel_order,
)

from app.services.dashboard_services import (
    get_order_count as service_get_order_count,
    get_sales_summary as service_get_sales_summary,
    get_customer_count as service_get_customer_count,
    get_unique_customers_for_date as service_get_unique_customers_for_date,
    get_best_selling_products as service_get_best_selling_products,
    get_dashboard_summary as service_get_dashboard_summary,
)

from app.services.product_services import (
    get_product_by_name,
)
from app.models.delivery import Delivery
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.support import SupportRequest


# =========================================================
# PRODUCT / INVENTORY
# =========================================================


async def check_product_stock(
    db: AsyncSession,
    product_name: str,
) -> dict:
    """
    Check current stock quantity for a product.
    """

    product = await get_product_by_name(
        db=db,
        product_name=product_name,
    )

    if product is None:
        return {
            "success": False,
            "error": (
                f"Product '{product_name}' "
                "was not found."
            ),
        }

    inventory = await get_inventory_by_product(
        db=db,
        product_id=product.id,
    )

    return {
        "success": True,
        "product_id": product.id,
        "product_name": product.name,
        "quantity": inventory.quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "is_low_stock": (
            inventory.quantity
            <= inventory.low_stock_threshold
        ),
    }


async def adjust_product_stock(
    db: AsyncSession,
    product_name: str,
    quantity_change: int,
) -> dict:
    """
    Add or remove stock.

    Positive = add stock.
    Negative = remove stock.
    """

    if quantity_change == 0:
        return {
            "success": False,
            "error": "Stock adjustment cannot be zero.",
        }

    product = await get_product_by_name(
        db=db,
        product_name=product_name,
    )

    if product is None:
        return {
            "success": False,
            "error": (
                f"Product '{product_name}' "
                "was not found."
            ),
        }

    inventory = await adjust_inventory(
        db=db,
        product_id=product.id,
        quantity_change=quantity_change,
    )

    return {
        "success": True,
        "product_id": product.id,
        "product_name": product.name,
        "quantity_change": quantity_change,
        "new_quantity": inventory.quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "is_low_stock": (
            inventory.quantity
            <= inventory.low_stock_threshold
        ),
    }


async def find_product(
    db: AsyncSession,
    product_name: str,
) -> dict:
    """
    Find an active product by name.
    """

    product = await get_product_by_name(
        db=db,
        product_name=product_name,
    )

    if product is None:
        return {
            "success": False,
            "error": (
                f"Product '{product_name}' "
                "was not found."
            ),
        }

    inventory = product.inventory

    return {
        "success": True,
        "product": {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": float(product.price),
            "category": product.category,
            "is_active": product.is_active,
            "stock": (
                inventory.quantity
                if inventory
                else None
            ),
            "low_stock_threshold": (
                inventory.low_stock_threshold
                if inventory
                else None
            ),
        },
    }


# =========================================================
# CUSTOMER
# =========================================================


async def find_customer(
    db: AsyncSession,
    customer_identifier: str,
) -> dict:
    """
    Find a customer.
    """

    result = await service_find_customer(
        db=db,
        customer_identifier=customer_identifier,
    )

    if result is None:
        return {
            "success": False,
            "error": "Customer not found.",
        }

    return result


async def create_customer_tool(
    db: AsyncSession,
    full_name: str,
    phone_number: str,
    email: str | None = None,
    address: str | None = None,
    city: str | None = None,
    state: str | None = None,
    postal_code: str | None = None,
    country: str = "Malaysia",
) -> dict:
    """
    Create a customer.
    """

    customer_data = CustomerCreate(
        full_name=full_name,
        phone_number=phone_number,
        email=email,
        address=address,
        city=city,
        state=state,
        postal_code=postal_code,
        country=country,
    )

    return await service_create_customer(
        db=db,
        customer_data=customer_data,
    )


# =========================================================
# ORDERS
# =========================================================


async def find_orders(
    db: AsyncSession,
    customer_identifier: str | None = None,
    order_id: int | None = None,
    order_date: str | None = None,
) -> dict:
    """
    Find orders by customer, order ID, or date.
    """

    return await service_find_orders(
        db=db,
        customer_identifier=customer_identifier,
        order_id=order_id,
        order_date=order_date,
    )


async def get_order(
    db: AsyncSession,
    order_id: int,
) -> dict:
    """
    Get a specific order.
    """

    return await service_get_order(
        db=db,
        order_id=order_id,
    )


async def create_order_tool(
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
    """
    Create an order.
    """

    return await service_create_order(
        db=db,
        customer_id=customer_id,
        items=items,
    )


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    new_status: str,
) -> dict:
    """
    Update order status.
    """

    return await service_update_order_status(
        db=db,
        order_id=order_id,
        new_status=new_status,
    )


async def cancel_order(
    db: AsyncSession,
    order_id: int,
    cancellation_admin_id: int | None = None,
) -> dict:
    """
    Cancel an order and restore inventory.
    """

    return await service_cancel_order(
        db=db,
        order_id=order_id,
        cancellation_admin_id=cancellation_admin_id,
    )


# =========================================================
# DASHBOARD / BUSINESS ANALYTICS
# =========================================================


async def get_order_count_tool(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get the number of orders for a specific date.

    Supported:
    - today
    - yesterday
    """

    return await service_get_order_count(
        db=db,
        date=date,
    )


async def get_sales_summary_tool(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get sales information for a specific date.

    Returns:
    - total order value
    - paid sales
    - unpaid value
    """

    return await service_get_sales_summary(
        db=db,
        date=date,
    )


async def get_customer_count_tool(
    db: AsyncSession,
) -> dict:
    """
    Get the total number of customers.
    """

    return await service_get_customer_count(
        db=db,
    )


async def get_unique_customers_for_date_tool(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get the number of unique customers
    who placed orders on a specific date.
    """

    return await service_get_unique_customers_for_date(
        db=db,
        date=date,
    )


async def get_best_selling_products_tool(
    db: AsyncSession,
    limit: int = 5,
) -> dict:
    """
    Get the best-selling products.

    Products are ranked by quantity sold.
    Cancelled orders are excluded.
    """

    return await service_get_best_selling_products(
        db=db,
        limit=limit,
    )


async def get_dashboard_summary_tool(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get a complete business summary for a date.
    """

    return await service_get_dashboard_summary(
        db=db,
        date=date,
    )


# =========================================================
# STAFF OPERATIONS COPILOT
# =========================================================


async def get_low_stock_summary(db: AsyncSession) -> dict:
    low_stock_filter = (
        Product.is_active.is_(True),
        Inventory.quantity <= Inventory.low_stock_threshold,
    )
    total = await db.scalar(
        select(func.count(Product.id))
        .join(Inventory, Inventory.product_id == Product.id)
        .where(*low_stock_filter)
    )
    rows = await db.execute(
        select(Product.id, Product.name, Inventory.quantity, Inventory.low_stock_threshold)
        .join(Inventory, Inventory.product_id == Product.id)
        .where(*low_stock_filter)
        .order_by(Inventory.quantity.asc(), Product.name.asc())
        .limit(20)
    )
    products = [
        {"product_id": row.id, "product_name": row.name, "quantity": row.quantity, "low_stock_threshold": row.low_stock_threshold}
        for row in rows
    ]
    return {"success": True, "low_stock_count": int(total or 0), "products": products}


async def get_delivery_workload(db: AsyncSession) -> dict:
    rows = await db.execute(select(Delivery.status, func.count(Delivery.id)).group_by(Delivery.status))
    statuses = {str(status): int(count) for status, count in rows.all()}
    return {"success": True, "total": sum(statuses.values()), "by_status": statuses}


async def get_support_queue_summary(db: AsyncSession, admin_id: int) -> dict:
    async def count(where_clause) -> int:
        value = await db.scalar(select(func.count(SupportRequest.id)).where(where_clause))
        return int(value or 0)

    return {
        "success": True,
        "new": await count(SupportRequest.status == "NEW"),
        "waiting_for_customer": await count(SupportRequest.status == "WAITING_FOR_CUSTOMER"),
        "high_priority": await count(SupportRequest.priority.in_(("HIGH", "URGENT"))),
        "assigned_to_you": await count(SupportRequest.assigned_admin_id == admin_id),
    }


async def get_order_workflow(db: AsyncSession, order_id: int) -> dict:
    result = await service_get_order(db=db, order_id=order_id)
    if not result.get("success"):
        return result
    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    result["delivery"] = {
        "status": delivery.status if delivery else "NOT_CREATED",
        "courier": delivery.courier if delivery else None,
        "tracking_number": delivery.tracking_number if delivery else None,
    }
    return result


async def get_shift_summary(db: AsyncSession, admin_id: int) -> dict:
    dashboard = await service_get_dashboard_summary(db=db, date="today")
    inventory = await get_low_stock_summary(db)
    deliveries = await get_delivery_workload(db)
    support = await get_support_queue_summary(db, admin_id)
    return {"success": True, "today": dashboard, "inventory": inventory, "deliveries": deliveries, "support": support}
