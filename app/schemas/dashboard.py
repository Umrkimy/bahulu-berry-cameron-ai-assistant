from decimal import Decimal

from pydantic import BaseModel

from app.schemas.order import OrderPrivate
from app.schemas.product import ProductPublic


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

class DashboardInventory(BaseModel):
    total_items: int
    low_stock: int
    out_of_stock: int

class DashboardResponse(BaseModel):
    customers: DashboardCustomers
    products: DashboardProducts
    orders: DashboardOrders
    sales: DashboardSales
    inventory: DashboardInventory
    recent_orders: list[OrderPrivate]
    recent_products: list[ProductPublic]