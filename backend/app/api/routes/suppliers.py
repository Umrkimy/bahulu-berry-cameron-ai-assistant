from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierInput, SupplierPublic
from app.services.activity_services import record_activity


router = APIRouter()


@router.get("", response_model=list[SupplierPublic])
async def list_suppliers(db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_superuser)]):
    return (await db.execute(select(Supplier).order_by(Supplier.is_active.desc(), Supplier.name))).scalars().all()


async def _save(item: Supplier | None, data: SupplierInput, db: AsyncSession, admin: Admin) -> Supplier:
    duplicate = await db.scalar(select(Supplier).where(func.lower(Supplier.name) == data.name.strip().lower(), Supplier.id != (item.id if item else 0)))
    if duplicate:
        raise HTTPException(status_code=400, detail={"field": "name", "message": "A supplier with this name already exists."})
    if item is None:
        item = Supplier(**data.model_dump())
        db.add(item)
        await db.flush()
        action = "created"
    else:
        for field, value in data.model_dump().items():
            setattr(item, field, value)
        action = "updated"
    await record_activity(db, admin=admin, action=action, entity_type="supplier", entity_id=item.id, description=f"{action.title()} supplier {item.name}.")
    await db.commit()
    await db.refresh(item)
    return item


@router.post("", response_model=SupplierPublic)
async def create_supplier(data: SupplierInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    return await _save(None, data, db, admin)


@router.patch("/{supplier_id}", response_model=SupplierPublic)
async def update_supplier(supplier_id: int, data: SupplierInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item = await db.get(Supplier, supplier_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return await _save(item, data, db, admin)
