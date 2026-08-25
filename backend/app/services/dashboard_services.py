from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")

def _get_date_range(
    date: str,
) -> tuple[datetime, datetime] | None:
    """
    Get UTC datetime range for a Malaysia calendar date.

    Supported:
    - today
    - yesterday
    """

    now = datetime.now(MALAYSIA_TZ)

    today_start = datetime(
        year=now.year,
        month=now.month,
        day=now.day,
        tzinfo=MALAYSIA_TZ,
    )

    if date == "today":
        start = today_start
        end = start + timedelta(days=1)

    elif date == "yesterday":
        end = today_start
        start = end - timedelta(days=1)

    else:
        return None

    # Database timestamps are stored in UTC.
    return (
        start.astimezone(UTC),
        end.astimezone(UTC),
    )



async def get_order_count(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get number of orders for a specific date.
    """

    date_range = _get_date_range(date)

    if date_range is None:
        return {
            "success": False,
            "error": (
                f"Unsupported date '{date}'. "
                "Use 'today' or 'yesterday'."
            ),
        }

    start, end = date_range

    result = await db.execute(
        select(
            func.count(Order.id)
        ).where(
            Order.created_at >= start,
            Order.created_at < end,
        )
    )

    count = result.scalar_one()

    return {
        "success": True,
        "date": date,
        "order_count": count,
    }



async def get_sales_summary(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get order value, paid sales, and unpaid value
    for a specific date.

    Cancelled orders are excluded.
    """

    date_range = _get_date_range(date)

    if date_range is None:
        return {
            "success": False,
            "error": (
                f"Unsupported date '{date}'. "
                "Use 'today' or 'yesterday'."
            ),
        }

    start, end = date_range


    total_result = await db.execute(
        select(
            func.coalesce(
                func.sum(Order.total_amount),
                0,
            )
        ).where(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status != "CANCELLED",
        )
    )

    total_order_value = (
        total_result.scalar_one()
        or Decimal("0.00")
    )


    paid_result = await db.execute(
        select(
            func.coalesce(
                func.sum(Order.total_amount),
                0,
            )
        ).where(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status != "CANCELLED",
            Order.payment_status == "PAID",
        )
    )

    paid_sales = (
        paid_result.scalar_one()
        or Decimal("0.00")
    )

    unpaid_result = await db.execute(
        select(
            func.coalesce(
                func.sum(Order.total_amount),
                0,
            )
        ).where(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status != "CANCELLED",
            Order.payment_status == "UNPAID",
        )
    )

    unpaid_value = (
        unpaid_result.scalar_one()
        or Decimal("0.00")
    )

    return {
        "success": True,
        "date": date,
        "total_order_value": float(
            total_order_value
        ),
        "paid_sales": float(
            paid_sales
        ),
        "unpaid_value": float(
            unpaid_value
        ),
    }



async def get_customer_count(
    db: AsyncSession,
) -> dict:
    """
    Get total number of customers.
    """

    result = await db.execute(
        select(
            func.count(Customer.id)
        )
    )

    count = result.scalar_one()

    return {
        "success": True,
        "customer_count": count,
    }



async def get_unique_customers_for_date(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get number of unique customers who placed
    orders on a specific date.
    """

    date_range = _get_date_range(date)

    if date_range is None:
        return {
            "success": False,
            "error": (
                f"Unsupported date '{date}'. "
                "Use 'today' or 'yesterday'."
            ),
        }

    start, end = date_range

    result = await db.execute(
        select(
            func.count(
                func.distinct(
                    Order.customer_id
                )
            )
        ).where(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status != "CANCELLED",
        )
    )

    count = result.scalar_one()

    return {
        "success": True,
        "date": date,
        "unique_customer_count": count,
    }



async def get_best_selling_products(
    db: AsyncSession,
    limit: int = 5,
) -> dict:
    """
    Get products ranked by total quantity sold.

    Cancelled orders are excluded.
    """

    if limit <= 0:
        return {
            "success": False,
            "error": (
                "Limit must be greater than zero."
            ),
        }

    # Prevent excessively large AI requests.
    limit = min(limit, 20)

    result = await db.execute(
        select(
            Product.id,
            Product.name,
            func.sum(
                OrderItem.quantity
            ).label(
                "quantity_sold"
            ),
            func.sum(
                OrderItem.subtotal
            ).label(
                "sales_amount"
            ),
        )
        .join(
            OrderItem,
            OrderItem.product_id
            == Product.id,
        )
        .join(
            Order,
            Order.id
            == OrderItem.order_id,
        )
        .where(
            Order.status != "CANCELLED",
        )
        .group_by(
            Product.id,
            Product.name,
        )
        .order_by(
            func.sum(
                OrderItem.quantity
            ).desc()
        )
        .limit(limit)
    )

    rows = result.all()

    products = []

    for row in rows:
        products.append(
            {
                "product_id": row.id,
                "product_name": row.name,
                "quantity_sold": int(
                    row.quantity_sold or 0
                ),
                "sales_amount": float(
                    row.sales_amount or 0
                ),
            }
        )

    return {
        "success": True,
        "products": products,
    }




async def get_dashboard_summary(
    db: AsyncSession,
    date: str = "today",
) -> dict:
    """
    Get a complete business summary for a date.
    """

    order_count = await get_order_count(
        db=db,
        date=date,
    )

    sales = await get_sales_summary(
        db=db,
        date=date,
    )

    customers = await get_unique_customers_for_date(
        db=db,
        date=date,
    )

    if not order_count.get("success"):
        return order_count

    if not sales.get("success"):
        return sales

    if not customers.get("success"):
        return customers

    return {
        "success": True,
        "date": date,
        "orders": order_count.get(
            "order_count",
            0,
        ),
        "unique_customers": customers.get(
            "unique_customer_count",
            0,
        ),
        "total_order_value": sales.get(
            "total_order_value",
            0,
        ),
        "paid_sales": sales.get(
            "paid_sales",
            0,
        ),
        "unpaid_value": sales.get(
            "unpaid_value",
            0,
        ),
    }