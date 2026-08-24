from sqlalchemy.ext.asyncio import AsyncSession

from app.services.inventory_services import (
    get_inventory_by_product,
    adjust_inventory,
)

from app.services.product_services import get_product_by_name
from app.services.inventory_services import get_inventory_by_product


async def check_product_stock(
    db: AsyncSession,
    product_name: str,
) -> dict:
    """
    Check the current stock quantity for a product.
    """

    product = await get_product_by_name(
        db=db,
        product_name=product_name,
    )

    if product is None:
        return {
            "success": False,
            "message": f"Product '{product_name}' was not found.",
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
            inventory.quantity <= inventory.low_stock_threshold
        ),
    }

async def adjust_product_stock(
    db: AsyncSession,
    product_name: str,
    quantity_change: int,
) -> dict:
    """
    Add or remove stock for a product.
    Positive quantity_change adds stock.
    Negative quantity_change removes stock.
    """

    product = await get_product_by_name(
        db=db,
        product_name=product_name,
    )

    if product is None:
        return {
            "success": False,
            "message": f"Product '{product_name}' was not found.",
        }

    try:
        inventory = await adjust_inventory(
            db=db,
            product_id=product.id,
            quantity_change=quantity_change,
        )

    except Exception as exc:
        return {
            "success": False,
            "message": str(exc),
        }

    return {
        "success": True,
        "product_id": product.id,
        "product_name": product.name,
        "quantity_change": quantity_change,
        "new_quantity": inventory.quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "is_low_stock": (
            inventory.quantity <= inventory.low_stock_threshold
        ),
    }