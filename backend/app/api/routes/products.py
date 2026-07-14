from typing import Annotated


from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.schemas.pagination import PaginatedResponse
from app.auth.dependencies import get_current_admin
from app.models.admin import Admin
from app.models.product import Product
from app.models.inventory import Inventory
from app.schemas.product import (
    ProductCreate,
    ProductPrivate,
    ProductPublic,
    ProductUpdate,
)

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[ProductPublic],
)
async def get_products(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    search: str | None = Query(
        default=None,
        description="Search by product name",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by category",
    ),
    is_active: bool | None = Query(
        default=True,
        description="Filter active products",
    ),
    sort: str = Query(
        default="newest",
        description="newest | oldest | price_asc | price_desc | name_asc | name_desc",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
):

    filters = []

    if search:
        filters.append(func.lower(Product.name).contains(search.lower()))

    if category:
        filters.append(Product.category == category)

    if is_active is not None:
        filters.append(Product.is_active == is_active)

    count_query = select(func.count()).select_from(Product).where(*filters)

    total = await db.scalar(count_query)

    query = select(Product).options(selectinload(Product.inventory)).where(*filters)

    # Sorting
    if sort == "newest":
        query = query.order_by(Product.created_at.desc())

    elif sort == "oldest":
        query = query.order_by(Product.created_at.asc())

    elif sort == "price_asc":
        query = query.order_by(Product.price.asc())

    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())

    elif sort == "name_asc":
        query = query.order_by(Product.name.asc())

    elif sort == "name_desc":
        query = query.order_by(Product.name.desc())

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sort option",
        )

    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)

    products = result.scalars().all()

    return PaginatedResponse.create(
        items=products,
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/admin",
    response_model=PaginatedResponse[ProductPrivate],
)
async def get_admin_products(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
    search: str | None = Query(
        default=None,
        description="Search by product name",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by category",
    ),
    is_active: bool | None = Query(
        default=None,
        description="Filter active/inactive products",
    ),
    sort: str = Query(
        default="newest",
        description="newest | oldest | price_asc | price_desc | name_asc | name_desc",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
):

    filters = []

    # SEARCH
    if search:
        filters.append(
            func.lower(Product.name).contains(search.lower())
        )


    # CATEGORY FILTER
    if category:
        filters.append(
            Product.category == category
        )


    # ADMIN CAN SEE BOTH ACTIVE AND INACTIVE
    if is_active is not None:
        filters.append(
            Product.is_active == is_active
        )


    # COUNT TOTAL PRODUCTS
    count_query = (
        select(func.count())
        .select_from(Product)
        .where(*filters)
    )

    total = await db.scalar(count_query)


    # GET PRODUCTS
    query = (
        select(Product)
        .options(
            selectinload(Product.inventory)
        )
        .where(*filters)
    )


    # SORTING
    if sort == "newest":

        query = query.order_by(
            Product.created_at.desc()
        )


    elif sort == "oldest":

        query = query.order_by(
            Product.created_at.asc()
        )


    elif sort == "price_asc":

        query = query.order_by(
            Product.price.asc()
        )


    elif sort == "price_desc":

        query = query.order_by(
            Product.price.desc()
        )


    elif sort == "name_asc":

        query = query.order_by(
            Product.name.asc()
        )


    elif sort == "name_desc":

        query = query.order_by(
            Product.name.desc()
        )


    else:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sort option",
        )


    # PAGINATION
    query = (
        query
        .offset(
            (page - 1) * page_size
        )
        .limit(page_size)
    )


    result = await db.execute(query)

    products = result.scalars().all()


    return PaginatedResponse.create(
        items=products,
        page=page,
        page_size=page_size,
        total=total,
    )


# GET SINGLE PRODUCT
@router.get("/{product_id}", response_model=ProductPublic)
async def get_product(product_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .where(Product.id == product_id)
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


# CREATE PRODUCT (ADMIN)
@router.post(
    "/",
    response_model=ProductPrivate,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    product_data: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    # Check duplicate product name
    result = await db.execute(
        select(Product).where(func.lower(Product.name) == product_data.name.lower())
    )

    existing_product = result.scalar_one_or_none()

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product already exists",
        )

    product = Product(
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        image_file=product_data.image_file,
        category=product_data.category,
        is_active=product_data.is_active,
    )
    db.add(product)

    # Flush so Product gets an ID
    await db.flush()

    inventory = Inventory(
        product_id=product.id,
        quantity=product_data.initial_quantity,
        low_stock_threshold=10,
    )

    db.add(inventory)
    await db.commit()
    await db.refresh(product, ["inventory"])
    return product


# UPDATE PRODUCT
@router.patch("/{product_id}", response_model=ProductPrivate)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_active)
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check name duplicate
    if (
        product_data.name is not None
        and product_data.name.lower() != product.name.lower()
    ):
        result = await db.execute(
            select(Product).where(func.lower(Product.name) == product_data.name.lower())
        )

        existing_product = result.scalar_one_or_none()

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product already exists",
            )

    update_data = product_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    return product


# DELETE PRODUCT
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    result = await db.execute(select(Product).where(Product.id == product_id))

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    inventory = await db.get(Inventory, product.id)

    if inventory:
        await db.delete(inventory)

    await db.delete(product)
    await db.commit()
