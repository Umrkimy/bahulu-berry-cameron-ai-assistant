from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate
from app.services.contact_normalization import ContactNormalizationError, normalize_email, normalize_phone_number


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


    normalized_phone = None
    try:
        normalized_phone = normalize_phone_number(identifier)
    except ContactNormalizationError:
        pass
    normalized_email = normalize_email(identifier) if "@" in identifier else None

    result = await db.execute(
        select(Customer).where(
            Customer.is_archived.is_(False),
            or_(
                func.lower(
                    Customer.full_name
                ) == identifier.lower(),

                Customer.canonical_phone_number == normalized_phone,
                Customer.phone_number == identifier,

                Customer.canonical_email == normalized_email,
                func.lower(Customer.email) == (normalized_email or identifier.lower()),
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
            Customer.is_archived.is_(False),
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

    try:
        phone_number = normalize_phone_number(customer_data.phone_number)
    except ContactNormalizationError as error:
        return {"success": False, "error": error.message, "field": error.field}
    email = normalize_email(customer_data.email)

    result = await db.execute(
        select(Customer).where(
            Customer.canonical_phone_number == phone_number
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

    if email:

        result = await db.execute(
            select(Customer).where(
                Customer.canonical_email == email
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


    customer_values = customer_data.model_dump()
    customer_values.update(phone_number=phone_number, email=email,
                           canonical_phone_number=phone_number, canonical_email=email)
    customer = Customer(**customer_values)

    db.add(customer)

    await db.flush()
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
