from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.order import OrderPrivate


class DashboardCustomers(BaseModel):
    total: int


class DashboardProducts(BaseModel):
    total: int


class DashboardOrders(BaseModel):
    total: int
    pending: int
    paid: int
    completed: int


class DashboardSales(BaseModel):
    revenue: Decimal
    monthly_target: Decimal
    monthly_revenue: Decimal
    today_revenue: Decimal
    progress: float


class DashboardInventory(BaseModel):
    total_items: int
    low_stock: int
    out_of_stock: int

class DashboardInventoryItem(BaseModel):
    product_name: str
    quantity: int
    low_stock_threshold: int
    status: str

class DashboardOrderItem(BaseModel):
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

class DashboardRecentOrder(OrderPrivate):
    customer_name: str
    items: list[DashboardOrderItem]

class DashboardProductInventory(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    quantity: int
    low_stock_threshold: int


class DashboardRecentProduct(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    name: str
    price: Decimal
    image_path: str
    category: str | None
    inventory: DashboardProductInventory | None


class DashboardResponse(BaseModel):
    customers: DashboardCustomers
    products: DashboardProducts
    orders: DashboardOrders
    sales: DashboardSales
    inventory: DashboardInventory
    recent_orders: list[DashboardRecentOrder]
    recent_products: list[DashboardRecentProduct]

class SalesChartItem(BaseModel):
    month: str
    revenue: Decimal
