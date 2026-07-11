from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.admin import Admin
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerPrivate, CustomerUpdate

router = APIRouter()


@router.get("/", response_model=list[CustomerPrivate])
async def get_customers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await db.execute(select(Customer))
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
    customer = Customer(**customer_data.model_dump())

    db.add(customer)
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

    # Check email uniqueness
    if (
        customer_data.email is not None
        and customer_data.email.lower() != customer.email.lower()
    ):
        result = await db.execute(
            select(Customer).where(
                func.lower(Customer.email) == customer_data.email.lower()
            )
        )

        existing_customer = result.scalar_one_or_none()

        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Email already registered",
            )

    # Update only fields provided
    update_data = customer_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():

        # normalize email
        if field == "email" and value:
            value = value.lower()

        setattr(customer, field, value)

    await db.commit()
    await db.refresh(customer)

    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
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

    await db.delete(customer)
    await db.commit()
