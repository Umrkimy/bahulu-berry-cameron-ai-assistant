from fastapi import APIRouter

from app.api.routes import customers, orders, products, order_items, inventories, auth, dashboard


api_router = APIRouter()

api_router.include_router(
    customers.router,
    prefix="/customers",
    tags=["customers"],
)

api_router.include_router(
    products.router,
    prefix="/products",
    tags=["products"],
)

api_router.include_router(
    inventories.router,
    prefix="/inventories",
    tags=["inventories"],
)

api_router.include_router(
    orders.router,
    prefix="/orders",
    tags=["orders"],
)

api_router.include_router(
    order_items.router,
    prefix="/order_items",
    tags=["order_items"],
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"],
)

api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"],
)