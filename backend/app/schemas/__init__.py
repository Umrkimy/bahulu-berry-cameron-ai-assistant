# ruff: noqa: F401
from app.schemas.customer import (
    CustomerBase,
    CustomerCreate,
    CustomerPublic,
    CustomerPrivate,
    CustomerUpdate,
)

from app.schemas.product import (
    ProductBase,
    ProductCreate,
    ProductPublic,
    ProductPrivate,
    ProductUpdate,
)

from app.schemas.order import (
    OrderBase,
    OrderCreate,
    OrderPrivate,
    OrderUpdate,
)

from app.schemas.order_item import (
    OrderItemBase,
    OrderItemCreate,
    OrderItemPublic,
    OrderItemUpdate,
)

from app.schemas.inventory import (
    InventoryBase,
    InventoryCreate,
    InventoryPublic,
    InventoryUpdate,
)

from app.schemas.admin import (
    AdminBase,
    AdminCreate,
    AdminLogin,
    AdminUpdate,
    AdminPublic,
    AdminPrivate,
)

from app.schemas.auth import Token

from app.schemas.dashboard import (
    DashboardCustomers,
    DashboardProducts,
    DashboardOrders,
    DashboardSales,
    DashboardInventory,
    DashboardResponse,
)

from app.schemas.pagination import (
    PaginatedResponse,
)
