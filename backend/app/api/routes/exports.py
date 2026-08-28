import csv
import io
from datetime import UTC
from zoneinfo import ZoneInfo
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.discount import Discount
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.product import Product
from app.services.activity_services import record_activity


router = APIRouter()
MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")


def _malaysia_time(value):
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M")


@router.get("/{resource}.csv")
async def export_csv(
    resource: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
    ids: list[int] | None = Query(default=None),
):
    rows = [["No data"]]
    if resource == "customers":
        query = select(Customer).order_by(Customer.id)
        if ids: query = query.where(Customer.id.in_(ids))
        data = (await db.execute(query)).scalars().all()
        rows = [["ID", "Name", "Phone", "Email", "City", "State", "Created"]] + [[x.id, x.full_name, x.phone_number, x.email or "", x.city or "", x.state or "", _malaysia_time(x.created_at)] for x in data]
    elif resource == "orders":
        query = select(Order).order_by(Order.created_at.desc())
        if ids: query = query.where(Order.id.in_(ids))
        data = (await db.execute(query)).scalars().all()
        rows = [["ID", "Customer ID", "Status", "Payment", "Subtotal", "Discount", "Total", "Created"]] + [[x.id, x.customer_id, x.status, x.payment_status, x.subtotal, x.discount_amount, x.total_amount, _malaysia_time(x.created_at)] for x in data]
    elif resource == "products":
        query = select(Product).order_by(Product.id)
        if ids: query = query.where(Product.id.in_(ids))
        data = (await db.execute(query)).scalars().all()
        rows = [["ID", "Name", "Category", "Price", "Active", "Created"]] + [[x.id, x.name, x.category or "", x.price, x.is_active, _malaysia_time(x.created_at)] for x in data]
    elif resource == "inventory":
        query = select(Inventory).order_by(Inventory.id)
        if ids: query = query.where(Inventory.id.in_(ids))
        data = (await db.execute(query)).scalars().all()
        rows = [["ID", "Product ID", "Quantity", "Low Stock Threshold", "Updated"]] + [[x.id, x.product_id, x.quantity, x.low_stock_threshold, _malaysia_time(x.updated_at)] for x in data]
    elif resource == "discounts":
        query = select(Discount).order_by(Discount.id)
        if ids: query = query.where(Discount.id.in_(ids))
        data = (await db.execute(query)).scalars().all()
        rows = [["ID", "Product ID", "Name", "Type", "Value", "Active", "Starts", "Ends"]] + [[x.id, x.product_id, x.name, x.discount_type, x.discount_value, x.is_active, _malaysia_time(x.start_at), _malaysia_time(x.end_at)] for x in data]
    else:
        raise HTTPException(status_code=404, detail="Export type not found.")

    output = io.StringIO()
    csv.writer(output).writerows(rows)
    output.seek(0)
    await record_activity(db, admin=current_admin, action="exported", entity_type=resource, entity_id=None, description=f"Exported {resource} CSV.")
    await db.commit()
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="bahulu-{resource}.csv"'})
