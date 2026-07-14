from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date
from decimal import Decimal

from app.db.database import get_db

from app.auth.dependencies import get_current_admin

from app.schemas.dashboard import (
    DashboardResponse,
    DashboardRecentOrder,
    DashboardInventoryItem,
)

from app.models.order_item import OrderItem
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.inventory import Inventory


router = APIRouter()


def group_order_items(items):
    grouped = {}

    for item in items:
        product_name = item.product.name

        if product_name in grouped:
            grouped[product_name]["quantity"] += item.quantity
            grouped[product_name]["subtotal"] += item.subtotal

        else:
            grouped[product_name] = {
                "product_name": product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": item.subtotal,
            }

    return list(grouped.values())



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

    total_customers = await db.scalar(
        select(func.count(Customer.id))
    )


    total_products = await db.scalar(
        select(func.count(Product.id))
        .where(Product.is_active)
    )


    total_orders = await db.scalar(
        select(func.count(Order.id))
    )


    # ORDER STATUS

    pending_orders = await db.scalar(
        select(func.count(Order.id))
        .where(Order.status == "PENDING")
    )


    completed_orders = await db.scalar(
        select(func.count(Order.id))
        .where(Order.status == "COMPLETED")
    )


    paid_orders = await db.scalar(
        select(func.count(Order.id))
        .where(Order.payment_status == "PAID")
    )


    # REVENUE

    total_revenue = await db.scalar(
        select(func.sum(Order.total_amount))
        .where(Order.payment_status == "PAID")
    )


    if total_revenue is None:
        total_revenue = 0



    # MONTHLY REVENUE

    today = date.today()

    month_start = today.replace(
        day=1
    )


    monthly_revenue = await db.scalar(
        select(func.sum(Order.total_amount))
        .where(
            Order.payment_status == "PAID",
            Order.created_at >= month_start,
        )
    )


    if monthly_revenue is None:
        monthly_revenue = 0



    # TODAY REVENUE

    today_revenue = await db.scalar(
        select(func.sum(Order.total_amount))
        .where(
            Order.payment_status == "PAID",
            func.date(Order.created_at) == today,
        )
    )


    if today_revenue is None:
        today_revenue = 0



    # MONTHLY TARGET

    monthly_target = Decimal("5000")


    progress = (
        float(monthly_revenue)
        /
        float(monthly_target)
    ) * 100


    if progress > 100:
        progress = 100



    # INVENTORY SUMMARY

    total_inventory_items = await db.scalar(
        select(func.count(Inventory.id))
    )


    low_stock_products = await db.scalar(
        select(func.count(Inventory.id))
        .where(
            Inventory.quantity <= Inventory.low_stock_threshold
        )
    )


    out_of_stock_products = await db.scalar(
        select(func.count(Inventory.id))
        .where(
            Inventory.quantity == 0
        )
    )



    # RECENT ORDERS

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items)
            .selectinload(OrderItem.product),
        )
        .order_by(desc(Order.created_at))
        .limit(5)
    )


    orders = result.scalars().all()



    recent_orders = [

        DashboardRecentOrder(

            id=order.id,

            customer_id=order.customer_id,

            status=order.status,

            payment_status=order.payment_status,

            total_amount=order.total_amount,


            delivery_name=order.delivery_name,

            delivery_phone=order.delivery_phone,

            delivery_address=order.delivery_address,

            city=order.city,

            state=order.state,

            postal_code=order.postal_code,

            country=order.country,

            tracking_number=order.tracking_number,

            shipped_at=order.shipped_at,

            completed_at=order.completed_at,


            created_at=order.created_at,

            updated_at=order.updated_at,


            customer_name=order.customer.full_name,


            # GROUP DUPLICATE PRODUCTS HERE
            items=group_order_items(order.items)

        )

        for order in orders

    ]



    # RECENT PRODUCTS

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.inventory)
        )
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
            "monthly_target": monthly_target,
            "monthly_revenue": monthly_revenue,
            "today_revenue": today_revenue,
            "progress": progress,
        },


        "inventory": {
            "total_items": total_inventory_items,
            "low_stock": low_stock_products,
            "out_of_stock": out_of_stock_products,
        },


        "recent_orders": recent_orders,

        "recent_products": recent_products,

    }




@router.get("/sales-chart")
async def sales_chart(
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
        select(
            extract("month", Order.created_at).label("month"),
            func.sum(Order.total_amount).label("revenue"),
        )
        .where(
            Order.payment_status == "PAID"
        )
        .group_by(
            extract("month", Order.created_at)
        )
        .order_by(
            extract("month", Order.created_at)
        )
    )


    rows = result.all()


    monthly_sales = {
        int(row.month): row.revenue or Decimal("0")
        for row in rows
    }


    months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]


    sales = []


    for index, month in enumerate(months, start=1):

        sales.append(
            {
                "month": month,
                "revenue": monthly_sales.get(
                    index,
                    Decimal("0")
                ),
            }
        )


    return sales





@router.get(
    "/inventory",
    response_model=list[DashboardInventoryItem],
)
async def get_dashboard_inventory(
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
        select(Inventory)
        .options(
            selectinload(Inventory.product)
        )
    )


    inventories = result.scalars().all()


    inventory_list = []


    for inventory in inventories:

        if inventory.quantity == 0:
            status = "OUT"

        elif inventory.quantity <= inventory.low_stock_threshold:
            status = "LOW"

        else:
            status = "GOOD"



        inventory_list.append(
            {
                "product_name": inventory.product.name,

                "quantity": inventory.quantity,

                "low_stock_threshold": inventory.low_stock_threshold,

                "status": status,
            }
        )


    return inventory_list