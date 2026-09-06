export type ReportPreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "LAST_12_MONTHS" | "MONTH_TO_DATE";

export interface ReportFilters {
  preset?: ReportPreset;
  start_date?: string;
  end_date?: string;
}

export interface ReportStatusCount { status: string; count: number; }
export interface DailySalesPoint { date: string; paid_revenue: string | number; paid_order_count: number; }
export interface TopProduct { product_id: number; product_name: string; units_sold: number; final_line_total: string | number; }
export interface PromotionImpact { promotion_name: string; promotion_type: string | null; affected_units: number; discount_amount: string | number; }

export interface ReportSummary {
  report_range: { start_date: string; end_date: string; label: string; };
  kpis: { paid_revenue: string | number; paid_order_count: number; total_orders_created: number; average_paid_order_value: string | number; total_discount_granted: string | number; };
  daily_sales: DailySalesPoint[];
  order_status_counts: ReportStatusCount[];
  top_products: TopProduct[];
  promotion_impact: PromotionImpact[];
  inventory_health: { active_product_count: number; inventory_record_count: number; healthy_count: number; low_stock_count: number; out_of_stock_count: number; };
  support_workload: { tickets_created: number; status_counts: ReportStatusCount[]; priority_counts: ReportStatusCount[]; current_open_high_priority_count: number; };
}
