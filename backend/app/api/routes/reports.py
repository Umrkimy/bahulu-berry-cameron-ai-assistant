import csv
import io
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.reports import ReportSummary
from app.services.activity_services import record_activity
from app.services.report_services import get_report_summary


router = APIRouter()


def _csv_rows(summary: dict) -> list[list[object]]:
    report_range = summary["report_range"]
    rows: list[list[object]] = [["Bahulu Berry Cameron Owner Report"], ["Period", f"{report_range['start_date']} to {report_range['end_date']}"], []]
    rows += [["Key performance indicators"], ["Metric", "Value"], *[[label, value] for label, value in {
        "Paid revenue (RM)": summary["kpis"]["paid_revenue"],
        "Paid orders": summary["kpis"]["paid_order_count"],
        "Orders created": summary["kpis"]["total_orders_created"],
        "Average paid order value (RM)": summary["kpis"]["average_paid_order_value"],
        "Discount granted (RM)": summary["kpis"]["total_discount_granted"],
    }.items()], []]
    rows += [["Daily paid sales"], ["Date", "Paid revenue (RM)", "Paid orders"], *[[item["date"], item["paid_revenue"], item["paid_order_count"]] for item in summary["daily_sales"]], []]
    rows += [["Order outcomes"], ["Status", "Orders"], *[[item["status"], item["count"]] for item in summary["order_status_counts"]], []]
    rows += [["Top products (non-cancelled orders)"], ["Product", "Units", "Final line total (RM)"], *[[item["product_name"], item["units_sold"], item["final_line_total"]] for item in summary["top_products"]], []]
    rows += [["Promotion impact (non-cancelled orders)"], ["Promotion", "Type", "Affected units", "Discount amount (RM)"], *[[item["promotion_name"], item["promotion_type"] or "", item["affected_units"], item["discount_amount"]] for item in summary["promotion_impact"]], []]
    inventory = summary["inventory_health"]
    rows += [["Current inventory health"], ["Metric", "Value"], ["Active products", inventory["active_product_count"]], ["Inventory records", inventory["inventory_record_count"]], ["Healthy", inventory["healthy_count"]], ["Low stock", inventory["low_stock_count"]], ["Out of stock", inventory["out_of_stock_count"]], []]
    support = summary["support_workload"]
    rows += [["Support workload"], ["Tickets created", support["tickets_created"]], ["Current open high priority", support["current_open_high_priority_count"]], [], ["Support status", "Tickets"], *[[item["status"], item["count"]] for item in support["status_counts"]], [], ["Support priority", "Tickets"], *[[item["status"], item["count"]] for item in support["priority_counts"]]]
    return rows


@router.get("/summary", response_model=ReportSummary)
async def summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
    preset: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    return await get_report_summary(db, preset=preset, start_date=start_date, end_date=end_date)


@router.get("/summary.csv")
async def summary_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
    preset: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    report = await get_report_summary(db, preset=preset, start_date=start_date, end_date=end_date)
    output = io.StringIO()
    csv.writer(output).writerows(_csv_rows(report))
    output.seek(0)
    await record_activity(db, admin=current_admin, action="exported", entity_type="report", entity_id=None, description="Exported owner reporting summary CSV.")
    await db.commit()
    dates = report["report_range"]
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="bahulu-report-{dates["start_date"]}-to-{dates["end_date"]}.csv"'})
