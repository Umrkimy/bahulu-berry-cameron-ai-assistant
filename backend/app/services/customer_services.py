from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate


async def find_customer(
    db: AsyncSession,
    customer_identifier: str,
) -> dict | None:
    """
    Find a customer by:

    - Full name
    - Partial name
    - Phone number
    - Email address
    """

    identifier = customer_identifier.strip()

    if not identifier:
        return None


    result = await db.execute(
        select(Customer).where(
            or_(
                func.lower(
                    Customer.full_name
                ) == identifier.lower(),

                Customer.phone_number
                == identifier,

                func.lower(
                    Customer.email
                ) == identifier.lower(),
            )
        )
    )

    customer = result.scalar_one_or_none()

    if customer is not None:

        return {
            "success": True,
            "customer": {
                "id": customer.id,
                "full_name": customer.full_name,
                "phone_number": customer.phone_number,
                "email": customer.email,
                "address": customer.address,
                "city": customer.city,
                "state": customer.state,
                "postal_code": customer.postal_code,
                "country": customer.country,
                "created_at": (
                    customer.created_at.isoformat()
                ),
            },
        }


    result = await db.execute(
        select(Customer).where(
            func.lower(
                Customer.full_name
            ).contains(
                identifier.lower()
            )
        )
    )

    customers = result.scalars().all()


    if not customers:
        return None



    if len(customers) > 1:

        return {
            "success": False,
            "error": (
                "Multiple customers matched."
            ),
            "matches": [
                {
                    "id": customer.id,
                    "full_name": customer.full_name,
                    "phone_number": (
                        customer.phone_number
                    ),
                    "email": customer.email,
                }
                for customer in customers
            ],
        }


    customer = customers[0]

    return {
        "success": True,
        "customer": {
            "id": customer.id,
            "full_name": customer.full_name,
            "phone_number": customer.phone_number,
            "email": customer.email,
            "address": customer.address,
            "city": customer.city,
            "state": customer.state,
            "postal_code": customer.postal_code,
            "country": customer.country,
            "created_at": (
                customer.created_at.isoformat()
            ),
        },
    }


async def create_customer(
    db: AsyncSession,
    customer_data: CustomerCreate,
) -> dict:
    """
    Create a new customer.
    """

    result = await db.execute(
        select(Customer).where(
            Customer.phone_number
            == customer_data.phone_number
        )
    )

    existing_customer = (
        result.scalar_one_or_none()
    )

    if existing_customer:

        return {
            "success": False,
            "error": (
                "A customer with this phone "
                "number already exists."
            ),
        }

    if customer_data.email:

        result = await db.execute(
            select(Customer).where(
                func.lower(
                    Customer.email
                )
                == customer_data.email.lower()
            )
        )

        existing_customer = (
            result.scalar_one_or_none()
        )

        if existing_customer:

            return {
                "success": False,
                "error": (
                    "A customer with this email "
                    "already exists."
                ),
            }


    customer = Customer(
        **customer_data.model_dump()
    )

    db.add(customer)

    await db.commit()
    await db.refresh(customer)

    return {
        "success": True,
        "customer": {
            "id": customer.id,
            "full_name": customer.full_name,
            "phone_number": customer.phone_number,
            "email": customer.email,
            "address": customer.address,
            "city": customer.city,
            "state": customer.state,
            "postal_code": customer.postal_code,
            "country": customer.country,
            "created_at": (
                customer.created_at.isoformat()
            ),
        },
    }