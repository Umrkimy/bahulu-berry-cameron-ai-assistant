from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db

from app.auth.dependencies import get_current_admin
from app.schemas.dashboard import DashboardResponse

from app.models.admin import Admin
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.inventory import Inventory

router = APIRouter()


@router.get(
    "/stats",
    response_model=DashboardResponse,
)
async def get_dashboard_stats(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    # BASIC COUNTS
    total_customers = await db.scalar(select(func.count(Customer.id)))

    total_products = await db.scalar(
        select(func.count(Product.id)).where(Product.is_active)
    )

    total_orders = await db.scalar(select(func.count(Order.id)))

    # ORDER STATUS
    pending_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.status == "PENDING")
    )

    completed_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.status == "COMPLETED")
    )

    paid_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.payment_status == "PAID")
    )

    # REVENUE
    total_revenue = await db.scalar(
        select(func.sum(Order.total_amount)).where(Order.payment_status == "paid")
    )

    if total_revenue is None:
        total_revenue = 0

    # INVENTORY
    total_inventory_items = await db.scalar(select(func.count(Inventory.id)))

    low_stock_products = await db.scalar(
        select(func.count(Inventory.id)).where(
            Inventory.quantity <= Inventory.low_stock_threshold
        )
    )

    out_of_stock_products = await db.scalar(
        select(func.count(Inventory.id)).where(Inventory.quantity == 0)
    )

    # RECENT ORDERS
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items),
        )
        .order_by(desc(Order.created_at))
        .limit(5)
    )
    recent_orders = result.scalars().all()

    # RECENT PRODUCTS
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .order_by(desc(Product.created_at))
        .limit(5)
    )

    recent_products = result.scalars().all()

    return {
        "customers": {
            "total": total_customers,
        },
        "products": {
            "total": total_products,
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "paid": paid_orders,
            "completed": completed_orders,
        },
        "sales": {
            "revenue": total_revenue,
        },
        "inventory": {
            "total_items": total_inventory_items,
            "low_stock": low_stock_products,
            "out_of_stock": out_of_stock_products,
        },
        "recent_orders": recent_orders,
        "recent_products": recent_products,
    }
