from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.models.admin import Admin
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerPrivate, CustomerUpdate
from app.services.activity_services import record_activity
from app.services.contact_normalization import ContactNormalizationError, normalize_email, normalize_phone_number

router = APIRouter()


@router.get("/", response_model=list[CustomerPrivate])
async def get_customers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
    customer_status: Literal["active", "archived"] = Query(default="active", alias="status"),
):
    result = await db.execute(
        select(Customer)
        .where(Customer.is_archived.is_(customer_status == "archived"))
        .order_by(Customer.full_name)
    )
    customers = result.scalars().all()

    return customers


@router.get("/{customer_id}", response_model=CustomerPrivate)
async def get_customer(
    customer_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))

    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


@router.post("/", response_model=CustomerPrivate, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    try:
        canonical_phone = normalize_phone_number(customer_data.phone_number)
    except ContactNormalizationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"field": error.field, "message": error.message}) from error
    canonical_email = normalize_email(customer_data.email)

    existing_phone = await db.scalar(select(Customer).where(Customer.canonical_phone_number == canonical_phone))
    if existing_phone is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"field": "phone_number", "message": "A customer with this phone number already exists, including archived customers."})

    if canonical_email is not None:
        existing_email = await db.scalar(select(Customer).where(Customer.canonical_email == canonical_email))
        if existing_email is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"field": "email", "message": "A customer with this email already exists, including archived customers."})

    customer_values = customer_data.model_dump()
    customer_values.update(phone_number=canonical_phone, email=canonical_email,
                           canonical_phone_number=canonical_phone, canonical_email=canonical_email)
    customer = Customer(**customer_values)

    db.add(customer)
    await db.flush()
    await record_activity(db, admin=current_admin, action="created", entity_type="customer", entity_id=customer.id, description=f"Created customer {customer.full_name}.")
    await db.commit()
    await db.refresh(customer)

    return customer


@router.patch("/{customer_id}", response_model=CustomerPrivate)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    result = await db.execute(select(Customer).where(Customer.id == customer_id))

    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    if customer.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Restore this customer before editing their current details.")

    update_data = customer_data.model_dump(exclude_unset=True)
    if "phone_number" in update_data:
        try:
            canonical_phone = normalize_phone_number(update_data["phone_number"])
        except ContactNormalizationError as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"field": error.field, "message": error.message}) from error
        if canonical_phone != customer.canonical_phone_number:
            existing_customer = await db.scalar(select(Customer).where(Customer.canonical_phone_number == canonical_phone, Customer.id != customer.id))
            if existing_customer is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"field": "phone_number", "message": "A customer with this phone number already exists, including archived customers."})
        update_data["phone_number"] = canonical_phone
        update_data["canonical_phone_number"] = canonical_phone

    if "email" in update_data:
        canonical_email = normalize_email(update_data["email"])
        if canonical_email != customer.canonical_email and canonical_email is not None:
            existing_customer = await db.scalar(select(Customer).where(Customer.canonical_email == canonical_email, Customer.id != customer.id))
            if existing_customer is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"field": "email", "message": "A customer with this email already exists, including archived customers."})
        update_data["email"] = canonical_email
        update_data["canonical_email"] = canonical_email

    for field, value in update_data.items():
        setattr(customer, field, value)

    await record_activity(db, admin=current_admin, action="updated", entity_type="customer", entity_id=customer.id, description=f"Updated customer {customer.full_name}.", metadata={"fields": sorted(update_data.keys())})
    await db.commit()
    await db.refresh(customer)

    return customer


@router.post("/{customer_id}/archive", response_model=CustomerPrivate)
async def archive_customer(
    customer_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
    ],
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))

    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    if customer.is_archived:
        return customer

    customer.is_archived = True
    customer.archived_at = datetime.now(UTC)
    await record_activity(db, admin=current_admin, action="archived", entity_type="customer", entity_id=customer.id, description=f"Archived customer {customer.full_name}.")
    await db.commit()
    await db.refresh(customer)
    return customer


@router.post("/{customer_id}/restore", response_model=CustomerPrivate)
async def restore_customer(
    customer_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    customer = await db.scalar(select(Customer).where(Customer.id == customer_id))
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    if not customer.is_archived:
        return customer

    customer.is_archived = False
    customer.archived_at = None
    await record_activity(db, admin=current_admin, action="restored", entity_type="customer", entity_id=customer.id, description=f"Restored customer {customer.full_name}.")
    await db.commit()
    await db.refresh(customer)
    return customer
