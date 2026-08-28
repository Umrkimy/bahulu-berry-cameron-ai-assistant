from fastapi import APIRouter

from app.api.routes import (
    customers,
    orders,
    products,
    order_items,
    inventories,
    auth,
    dashboard,
    ai_assistant,
    payments,
    deliveries,
    discounts,
    activity,
    exports,
    team,
    refund_requests,
    support,
)

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
    payments.router,
    prefix="/payments",
    tags=["payments"],
)

api_router.include_router(
    support.router,
    prefix="/support",
    tags=["support"],
)

api_router.include_router(
    team.router,
    prefix="/team",
    tags=["team"],
)

api_router.include_router(
    refund_requests.router,
    prefix="/refund-requests",
    tags=["refund requests"],
)

api_router.include_router(
    deliveries.router,
    prefix="/deliveries",
    tags=["deliveries"],
)

api_router.include_router(
    discounts.router,
    prefix="/discounts",
    tags=["discounts"],
)

api_router.include_router(
    activity.router,
    prefix="/activity",
    tags=["activity"],
)

api_router.include_router(
    exports.router,
    prefix="/exports",
    tags=["exports"],
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

api_router.include_router(
    ai_assistant.router,
    prefix="/ai-assistant",
    tags=["AI Assistant"],
)

