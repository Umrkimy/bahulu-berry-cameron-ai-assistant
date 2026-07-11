from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.admin import Admin
from app.services.inventory_services import get_inventory_by_product
from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.schemas.order_item import (
    OrderItemCreate,
    OrderItemPublic,
    OrderItemUpdate,
)

router = APIRouter()


# GET ALL ITEMS FROM ORDER
@router.get(
    "/orders/{order_id}/items",
    response_model=list[OrderItemPublic],
)
async def get_order_items(
    order_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    # Check order exists
    order = await db.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))

    return result.scalars().all()


# GET SINGLE ITEM
@router.get(
    "/orders/{order_id}/items/{item_id}",
    response_model=OrderItemPublic,
)
async def get_order_item(
    order_id: int,
    item_id: int,
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
        select(OrderItem).where(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id,
        )
    )

    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Order item not found",
        )

    return item


# CREATE ORDER ITEM
@router.post(
    "/orders/{order_id}/items",
    response_model=OrderItemPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_order_item(
    order_id: int,
    item_data: OrderItemCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    # Check order
    order = await db.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    # Check product
    product = await db.get(Product, item_data.product_id)

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    # Check stock
    inventory = await get_inventory_by_product(
        db,
        product.id,
    )

    if inventory.quantity < item_data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock",
        )

    unit_price = Decimal(product.price)

    subtotal = unit_price * item_data.quantity

    order_item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        quantity=item_data.quantity,
        unit_price=unit_price,
        subtotal=subtotal,
    )
    db.add(order_item)

    # Update order total
    order.total_amount += subtotal

    # Reduce stock
    inventory.quantity -= item_data.quantity

    await db.commit()
    await db.refresh(order_item)

    return order_item


# UPDATE ORDER ITEM
@router.patch(
    "/orders/{order_id}/items/{item_id}",
    response_model=OrderItemPublic,
)
async def update_order_item(
    order_id: int,
    item_id: int,
    item_data: OrderItemUpdate,
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
        select(OrderItem).where(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id,
        )
    )

    order_item = result.scalar_one_or_none()
    if not order_item:
        raise HTTPException(
            status_code=404,
            detail="Order item not found",
        )

    order = await db.get(Order, order_id)

    if item_data.quantity is not None:
        inventory = await get_inventory_by_product(
            db,
            order_item.product_id,
        )

        old_quantity = order_item.quantity
        difference = item_data.quantity - old_quantity

        # Adding quantity
        if difference > 0:
            if inventory.quantity < difference:
                raise HTTPException(
                    status_code=400,
                    detail="Not enough stock",
                )
            inventory.quantity -= difference

        # Removing quantity
        elif difference < 0:
            inventory.quantity += abs(difference)

        # Recalculate total
        order.total_amount -= order_item.subtotal
        order_item.quantity = item_data.quantity
        order_item.subtotal = Decimal(order_item.unit_price) * order_item.quantity

        order.total_amount += order_item.subtotal

    await db.commit()
    await db.refresh(order_item)

    return order_item


# DELETE ORDER ITEM
@router.delete(
    "/orders/{order_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_order_item(
    order_id: int,
    item_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
    ],
):

    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id,
        )
    )

    order_item = result.scalar_one_or_none()

    if not order_item:
        raise HTTPException(
            status_code=404,
            detail="Order item not found",
        )

    order = await db.get(Order, order_id)

    inventory = await get_inventory_by_product(
        db,
        order_item.product_id,
    )

    # Return stock
    inventory.quantity += order_item.quantity

    # Remove amount
    order.total_amount -= order_item.subtotal

    await db.delete(order_item)

    await db.commit()
