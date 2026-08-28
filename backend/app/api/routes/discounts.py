from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.discount import Discount
from app.schemas.discount import DiscountCreate, DiscountPublic, DiscountUpdate
from app.services.discount_services import create_discount, update_discount
from app.services.activity_services import record_activity


router = APIRouter()


@router.get("", response_model=list[DiscountPublic])
async def get_discounts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    result = await db.execute(select(Discount).order_by(Discount.start_at.desc()))
    return result.scalars().all()


@router.get("/{discount_id}", response_model=DiscountPublic)
async def get_discount(
    discount_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    discount = await db.get(Discount, discount_id)

    if discount is None:
        raise HTTPException(status_code=404, detail="Discount not found.")

    return discount


@router.post("", response_model=DiscountPublic, status_code=status.HTTP_201_CREATED)
async def create_discount_route(
    discount_data: DiscountCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    try:
        discount = await create_discount(db, discount_data)
        await record_activity(db, admin=current_admin, action="created", entity_type="discount", entity_id=discount.id, description=f"Created promotion {discount.name}.")
        await db.commit()
        await db.refresh(discount)
        return discount
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/{discount_id}", response_model=DiscountPublic)
async def update_discount_route(
    discount_id: int,
    discount_data: DiscountUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    discount = await db.get(Discount, discount_id)

    if discount is None:
        raise HTTPException(status_code=404, detail="Discount not found.")

    try:
        discount = await update_discount(db, discount, discount_data)
        await record_activity(db, admin=current_admin, action="updated", entity_type="discount", entity_id=discount.id, description=f"Updated promotion {discount.name}.")
        await db.commit()
        await db.refresh(discount)
        return discount
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount(
    discount_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    discount = await db.get(Discount, discount_id)

    if discount is None:
        raise HTTPException(status_code=404, detail="Discount not found.")

    await record_activity(db, admin=current_admin, action="deleted", entity_type="discount", entity_id=discount.id, description=f"Deleted promotion {discount.name}.")
    await db.delete(discount)
    await db.commit()
