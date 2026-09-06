from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ReportRange(BaseModel):
    start_date: date
    end_date: date
    label: str


class ReportKPIs(BaseModel):
    paid_revenue: Decimal
    paid_order_count: int
    total_orders_created: int
    average_paid_order_value: Decimal
    total_discount_granted: Decimal


class DailySalesPoint(BaseModel):
    date: date
    paid_revenue: Decimal
    paid_order_count: int


class StatusCount(BaseModel):
    status: str
    count: int


class TopProductReportItem(BaseModel):
    product_id: int
    product_name: str
    units_sold: int
    final_line_total: Decimal


class PromotionImpactItem(BaseModel):
    promotion_name: str
    promotion_type: str | None
    affected_units: int
    discount_amount: Decimal


class InventoryHealth(BaseModel):
    active_product_count: int
    inventory_record_count: int
    healthy_count: int
    low_stock_count: int
    out_of_stock_count: int


class SupportWorkload(BaseModel):
    tickets_created: int
    status_counts: list[StatusCount]
    priority_counts: list[StatusCount]
    current_open_high_priority_count: int


class ReportSummary(BaseModel):
    report_range: ReportRange
    kpis: ReportKPIs
    daily_sales: list[DailySalesPoint]
    order_status_counts: list[StatusCount]
    top_products: list[TopProductReportItem]
    promotion_impact: list[PromotionImpactItem]
    inventory_health: InventoryHealth
    support_workload: SupportWorkload
