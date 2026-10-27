from fastapi import APIRouter

from app.api.routes import (
    activity,
    ai_assistant,
    ai_usage,
    auth,
    customer_account,
    customers,
    dashboard,
    deliveries,
    discounts,
    enquiries,
    exports,
    inventories,
    media,
    notifications,
    operations,
    order_items,
    orders,
    payments,
    product_images,
    products,
    refund_requests,
    reports,
    settings,
    storefront,
    suppliers,
    support,
    support_ratings,
    tasks,
    team,
    whatsapp_menu,
)

api_router = APIRouter()
api_router.include_router(product_images.router, prefix="/products", tags=["product images"])
api_router.include_router(media.router, prefix="/media", tags=["media"])

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

api_router.include_router(storefront.router, prefix="/storefront", tags=["storefront"])
api_router.include_router(customer_account.router, prefix="/storefront/account", tags=["customer accounts"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(enquiries.router, prefix="/enquiries", tags=["enquiries"])

api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

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
    support_ratings.router,
    prefix="/support/ratings",
    tags=["support"],
)

api_router.include_router(
    whatsapp_menu.router,
    prefix="/support/whatsapp-menu",
    tags=["support"],
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
    tags=["Operations Copilot"],
)

api_router.include_router(
    ai_usage.router,
    prefix="/ai-usage",
    tags=["AI usage"],
)

api_router.include_router(
    operations.router,
    prefix="/operations",
    tags=["operations"],
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"],
)

