from typing import Annotated

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.db.database import get_db
from app.models.admin import Admin
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.stock_movement import StockMovement
from app.schemas.inventory import (
    InventoryAdjustment,
    InventoryPublic,
    InventoryUpdate,
    OpeningBalanceCreate,
    BatchStockReceiptCreate,
    BatchStockReceiptResult,
    StockMovementCreate,
    StockMovementPublic,
)
from app.schemas.pagination import PaginatedResponse
from app.services.inventory_services import (
    adjust_inventory,
    set_inventory_quantity,
)
from app.services.activity_services import record_activity
from app.services.transaction_lock import acquire_transaction_lock
from app.services.notification_services import notify_owners_with_email


router = APIRouter()


def serialize_inventory(
    inventory: Inventory,
) -> InventoryPublic:
    if inventory.product is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inventory product could not be loaded.",
        )

    return InventoryPublic(
        id=inventory.id,
        product_id=inventory.product_id,
        product_name=inventory.product.name,
        product_category=inventory.product.category,
        quantity=inventory.quantity,
        low_stock_threshold=inventory.low_stock_threshold,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
    )


async def get_inventory_with_product(
    db: AsyncSession,
    inventory_id: int,
) -> Inventory | None:
    result = await db.execute(
        select(Inventory)
        .options(
            selectinload(Inventory.product)
        )
        .where(
            Inventory.id == inventory_id
        )
    )

    return result.scalar_one_or_none()



@router.get(
    "",
    response_model=list[InventoryPublic],
)
async def get_inventories(
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
        .order_by(
            Inventory.id.asc()
        )
    )

    inventories = result.scalars().all()

    return [
        serialize_inventory(inventory)
        for inventory in inventories
    ]


def serialize_movement(row: tuple[StockMovement, str, str | None, str | None]) -> StockMovementPublic:
    movement, product_name, supplier_name, admin_name = row
    return StockMovementPublic(
        id=movement.id, inventory_id=movement.inventory_id, product_id=movement.product_id,
        product_name=product_name, supplier_id=movement.supplier_id, supplier_name=supplier_name,
        admin_name=admin_name, movement_type=movement.movement_type, quantity_change=movement.quantity_change,
        quantity_before=movement.quantity_before, quantity_after=movement.quantity_after, reason=movement.reason,
        reference=movement.reference, source_type=movement.source_type, source_id=movement.source_id,
        created_at=movement.created_at,
    )


@router.get("/movements", response_model=PaginatedResponse[StockMovementPublic])
async def get_stock_movements(
    db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)],
    product_id: int | None = None, movement_type: str | None = None, supplier_id: int | None = None,
    search: str | None = None, start_at: datetime | None = None, end_at: datetime | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
):
    filters = []
    if product_id is not None: filters.append(StockMovement.product_id == product_id)
    if movement_type: filters.append(StockMovement.movement_type == movement_type)
    if supplier_id is not None: filters.append(StockMovement.supplier_id == supplier_id)
    if start_at: filters.append(StockMovement.created_at >= start_at)
    if end_at: filters.append(StockMovement.created_at <= end_at)
    if search:
        normalized_search = search.strip().lower()
        if normalized_search:
            filters.append(or_(
                func.lower(Product.name).contains(normalized_search),
                func.lower(Supplier.name).contains(normalized_search),
                func.lower(StockMovement.reference).contains(normalized_search),
            ))
    total = await db.scalar(select(func.count()).select_from(StockMovement).join(Product).outerjoin(Supplier).where(*filters)) or 0
    query = select(StockMovement, Product.name, Supplier.name, Admin.username).join(Product).outerjoin(Supplier).outerjoin(Admin).where(*filters).order_by(StockMovement.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(query)).all()
    return PaginatedResponse.create(items=[serialize_movement(row) for row in rows], page=page, page_size=page_size, total=total)


@router.get("/supplier-options")
async def supplier_options(db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]):
    rows = await db.execute(select(Supplier.id, Supplier.name).where(Supplier.is_active.is_(True)).order_by(Supplier.name))
    return [{"id": row.id, "name": row.name} for row in rows]


@router.post("/receipts", response_model=BatchStockReceiptResult)
async def receive_stock_receipt(
    data: BatchStockReceiptCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
):
    reference = data.reference.strip()
    if len(reference) < 2:
        raise HTTPException(status_code=400, detail={"field": "reference", "message": "Enter a delivery-note or invoice reference."})
    inventory_ids = [item.inventory_id for item in data.items]
    if len(inventory_ids) != len(set(inventory_ids)):
        raise HTTPException(status_code=400, detail="Each product can appear only once in a receipt.")
    supplier = await db.get(Supplier, data.supplier_id)
    if supplier is None or not supplier.is_active:
        raise HTTPException(status_code=400, detail="Choose an active supplier.")

    try:
        result = await db.execute(
            select(Inventory)
            .options(selectinload(Inventory.product))
            .where(Inventory.id.in_(inventory_ids))
            .order_by(Inventory.product_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        inventories = result.scalars().all()
        if len(inventories) != len(inventory_ids):
            raise HTTPException(status_code=400, detail="One or more selected inventory records no longer exist.")
        quantities = {item.inventory_id: item.quantity for item in data.items}
        for inventory in inventories:
            quantity_before = inventory.quantity
            quantity_change = quantities[inventory.id]
            inventory.quantity += quantity_change
            db.add(StockMovement(
                inventory_id=inventory.id,
                product_id=inventory.product_id,
                supplier_id=supplier.id,
                admin_id=admin.id,
                movement_type="SUPPLIER_RECEIPT",
                quantity_change=quantity_change,
                quantity_before=quantity_before,
                quantity_after=inventory.quantity,
                reference=reference,
            ))
        await record_activity(
            db,
            admin=admin,
            action="stock_received",
            entity_type="inventory",
            entity_id=None,
            description=f"Received stock for {len(inventories)} product{'s' if len(inventories) != 1 else ''} from {supplier.name}. Reference: {reference}.",
            metadata={"supplier_id": supplier.id, "reference": reference, "received_count": len(inventories)},
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Unable to receive stock. No quantities were changed.")

    for inventory in inventories:
        await db.refresh(inventory, attribute_names=["product"])
    return BatchStockReceiptResult(received_count=len(inventories), inventories=[serialize_inventory(inventory) for inventory in inventories])


@router.post("/{inventory_id}/movements", response_model=InventoryPublic)
async def create_stock_movement(
    inventory_id: int, data: StockMovementCreate, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)],
):
    inventory = await get_inventory_with_product(db, inventory_id)
    if inventory is None: raise HTTPException(status_code=404, detail="Inventory not found.")
    if data.quantity_change == 0: raise HTTPException(status_code=400, detail="Stock movement cannot be zero.")
    if data.movement_type == "SUPPLIER_RECEIPT" and data.quantity_change < 0: raise HTTPException(status_code=400, detail="A supplier receipt must increase stock.")
    if data.movement_type == "MANUAL_INCREASE" and data.quantity_change < 0: raise HTTPException(status_code=400, detail="A manual increase must increase stock.")
    if data.movement_type == "MANUAL_DECREASE" and data.quantity_change > 0: raise HTTPException(status_code=400, detail="A manual decrease must reduce stock.")
    if data.movement_type == "MANUAL_DECREASE" and not (data.reason or "").strip(): raise HTTPException(status_code=400, detail={"field": "reason", "message": "Provide a reason for reducing stock."})
    if data.supplier_id is not None:
        supplier = await db.get(Supplier, data.supplier_id)
        if supplier is None or not supplier.is_active: raise HTTPException(status_code=400, detail="Choose an active supplier.")
    try:
        quantity_before = inventory.quantity
        await adjust_inventory(db, inventory.product_id, data.quantity_change, movement_type=data.movement_type, reason=(data.reason or "").strip() or None, supplier_id=data.supplier_id, reference=(data.reference or "").strip() or None, admin=admin)
        if data.low_stock_threshold is not None:
            inventory.low_stock_threshold = data.low_stock_threshold
        if inventory.quantity == 0 and quantity_before != 0:
            await notify_owners_with_email(db, notification_type="INVENTORY", title="Product is out of stock", description=f"{inventory.product.name} has reached zero stock.", entity_type="inventory", entity_id=inventory.id, email_type="STOCK_OUT", idempotency_key_prefix=f"stock-out:{inventory.id}:{inventory.quantity}")
        elif inventory.quantity <= inventory.low_stock_threshold and quantity_before > inventory.low_stock_threshold:
            await notify_owners_with_email(db, notification_type="INVENTORY", title="Product is low in stock", description=f"{inventory.product.name} is at or below its stock threshold.", entity_type="inventory", entity_id=inventory.id, email_type="STOCK_LOW", idempotency_key_prefix=f"stock-low:{inventory.id}:{inventory.quantity}")
        await record_activity(db, admin=admin, action="stock_moved", entity_type="inventory", entity_id=inventory.id, description=f"Recorded {data.movement_type.lower().replace('_', ' ')} for {inventory.product.name}.", metadata={"quantity_change": data.quantity_change, "movement_type": data.movement_type})
        await db.commit()
    except HTTPException:
        await db.rollback(); raise
    except Exception:
        await db.rollback(); raise HTTPException(status_code=500, detail="Unable to record the stock movement.")
    updated = await get_inventory_with_product(db, inventory_id)
    return serialize_inventory(updated)


@router.post("/{inventory_id}/opening-balance", response_model=InventoryPublic)
async def create_opening_balance(
    inventory_id: int, data: OpeningBalanceCreate, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await acquire_transaction_lock(db, f"opening-balance:{inventory_id}")
    await db.execute(select(Inventory.id).where(Inventory.id == inventory_id).with_for_update())
    inventory = await get_inventory_with_product(db, inventory_id)
    if inventory is None: raise HTTPException(status_code=404, detail="Inventory not found.")
    exists = await db.scalar(select(StockMovement.id).where(StockMovement.inventory_id == inventory_id))
    if exists: raise HTTPException(status_code=400, detail="An opening balance can only be recorded before other stock movements.")
    db.add(StockMovement(inventory_id=inventory.id, product_id=inventory.product_id, admin_id=admin.id, movement_type="OPENING_BALANCE", quantity_change=0, quantity_before=inventory.quantity, quantity_after=inventory.quantity, reason=data.reason.strip(), created_at=datetime.now(UTC)))
    await record_activity(db, admin=admin, action="opening_balance_recorded", entity_type="inventory", entity_id=inventory.id, description=f"Recorded opening balance for {inventory.product.name}.")
    await db.commit()
    return serialize_inventory(inventory)


@router.get(
    "/{inventory_id}",
    response_model=InventoryPublic,
)
async def get_inventory(
    inventory_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return serialize_inventory(inventory)



@router.get(
    "/product/{product_id}",
    response_model=InventoryPublic,
)
async def get_product_inventory(
    product_id: int,
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
        .where(
            Inventory.product_id == product_id
        )
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return serialize_inventory(inventory)


@router.patch(
    "/{inventory_id}/adjust",
    response_model=InventoryPublic,
)
async def adjust_inventory_route(
    inventory_id: int,
    inventory_data: InventoryAdjustment,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    if inventory_data.quantity_change < 0 and not (inventory_data.reason or "").strip():
        raise HTTPException(400, detail={"field_errors": {"reason": "Provide a reason for reducing stock."}})
    if inventory_data.quantity_change == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock adjustment cannot be zero.",
        )

    try:
        await adjust_inventory(
            db=db,
            product_id=inventory.product_id,
            quantity_change=inventory_data.quantity_change,
            reason=inventory_data.reason,
            admin=current_admin,
        )
        await record_activity(db, admin=current_admin, action="adjusted", entity_type="inventory", entity_id=inventory.id, description=f"Adjusted stock for {inventory.product.name} by {inventory_data.quantity_change}.", metadata={"quantity_change": inventory_data.quantity_change})

        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust inventory.",
        )

    # Re-query instead of relying on refresh + relationship state.
    updated_inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if updated_inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found after update.",
        )

    return serialize_inventory(updated_inventory)


@router.patch(
    "/{inventory_id}",
    response_model=InventoryPublic,
)
async def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    try:
        # Update quantity through the service.
        if inventory_data.quantity is not None:
            raise HTTPException(400, "Use the receive or adjust stock action to change quantity.")

        # Update threshold directly.
        if inventory_data.low_stock_threshold is not None:
            inventory.low_stock_threshold = (
                inventory_data.low_stock_threshold
            )

        await record_activity(db, admin=current_admin, action="updated", entity_type="inventory", entity_id=inventory.id, description=f"Updated inventory for {inventory.product.name}.")
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update inventory.",
        )

    updated_inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if updated_inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found after update.",
        )

    return serialize_inventory(updated_inventory)


@router.delete(
    "/{inventory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_inventory(
    inventory_id: int,
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
        select(Inventory)
        .where(
            Inventory.id == inventory_id
        )
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    await record_activity(db, admin=current_admin, action="deleted", entity_type="inventory", entity_id=inventory.id, description=f"Deleted inventory for product #{inventory.product_id}.")
    await db.delete(inventory)
    await db.commit()

    return None
