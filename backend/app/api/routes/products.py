from typing import Annotated


from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.schemas.pagination import PaginatedResponse
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.models.admin import Admin
from app.models.product import Product
from app.models.inventory import Inventory
from app.services.activity_services import record_activity
from app.schemas.product import (
    ProductCreate,
    ProductPrivate,
    ProductPublic,
    ProductUpdate,
)
from app.schemas.product_import import ProductImportPreview, ProductImportResult
from app.services.product_import_services import CSV_HEADERS, read_product_import

router = APIRouter()


@router.get("/import/template")
async def download_product_import_template(_: Annotated[Admin, Depends(get_current_superuser)]):
    template = ",".join(CSV_HEADERS) + "\nExample product,Bahulu,Optional internal description,12.50,0,10\n"
    return Response(
        content=template,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="bahulu-product-import-template.csv"'},
    )


@router.post("/import/preview", response_model=ProductImportPreview)
async def preview_product_import(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
):
    return await read_product_import(file, db)


@router.post("/import", response_model=ProductImportResult, status_code=status.HTTP_201_CREATED)
async def import_products(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    preview = await read_product_import(file, db)
    if not preview.can_import:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Correct every CSV error before importing.", "errors": [error.model_dump() for error in preview.errors]},
        )

    for row in preview.rows:
        product = Product(
            name=row.name,
            category=row.category,
            description=row.description,
            price=row.price_myr,
            is_active=True,
            storefront_published=False,
        )
        db.add(product)
        await db.flush()
        db.add(Inventory(
            product_id=product.id,
            quantity=row.opening_stock,
            low_stock_threshold=row.low_stock_threshold,
        ))
    await record_activity(
        db,
        admin=current_admin,
        action="imported",
        entity_type="product",
        entity_id=None,
        description=f"Imported {len(preview.rows)} products from CSV.",
        metadata={"count": len(preview.rows)},
    )
    await db.commit()
    return ProductImportResult(imported_count=len(preview.rows), message=f"Imported {len(preview.rows)} products.")


@router.get(
    "/",
    response_model=PaginatedResponse[ProductPublic],
)
async def get_products(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
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

    query = select(Product).options(
        selectinload(Product.inventory),
        selectinload(Product.discounts),
    ).where(*filters)

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
            selectinload(Product.inventory),
            selectinload(Product.discounts),
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
async def get_product(product_id: int, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]):
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.inventory),
            selectinload(Product.discounts),
        )
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
        Depends(get_current_superuser),
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
    await record_activity(db, admin=current_admin, action="created", entity_type="product", entity_id=product.id, description=f"Created product {product.name}.")
    await db.commit()
    await db.refresh(product, ["inventory", "discounts"])
    return product


# UPDATE PRODUCT
@router.patch("/{product_id}", response_model=ProductPrivate)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
    ],
):
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if (
        product_data.name is not None
        and product_data.name.lower() != product.name.lower()
    ):
        result = await db.execute(
            select(Product).where(
                func.lower(Product.name) == product_data.name.lower(),
                Product.id != product_id,
            )
        )

        existing_product = result.scalar_one_or_none()

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product already exists",
            )

    update_data = product_data.model_dump(exclude_unset=True)

    publishing = update_data.get("storefront_published", product.storefront_published)
    name_en = update_data.get("storefront_name_en", product.storefront_name_en)
    name_ms = update_data.get("storefront_name_ms", product.storefront_name_ms)
    if publishing and (not name_en or not name_en.strip() or not name_ms or not name_ms.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add approved English and Bahasa Melayu storefront names before publishing this product.",
        )

    for field, value in update_data.items():
        setattr(product, field, value)

    await record_activity(db, admin=current_admin, action="updated", entity_type="product", entity_id=product.id, description=f"Updated product {product.name}.")
    await db.commit()
    await db.refresh(product, ["inventory", "discounts"])

    return product


# DELETE PRODUCT
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
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

    await record_activity(db, admin=current_admin, action="deleted", entity_type="product", entity_id=product.id, description=f"Deleted product {product.name}.")
    await db.delete(product)
    await db.commit()
