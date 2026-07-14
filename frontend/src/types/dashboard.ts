export interface DashboardOrderItem {
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface DashboardInventoryItem {
  product_name: string;
  quantity: number;
  low_stock_threshold: number;
  status: "GOOD" | "LOW" | "OUT";
}

export interface DashboardRecentOrder {
  id: number;
  customer_id: number;
  customer_name: string;
  status: string;
  payment_status: string;
  total_amount: string;
  items: DashboardOrderItem[];
}

export interface DashboardResponse {
  customers: {
    total: number;
  };

  products: {
    total: number;
  };

  orders: {
    total: number;
    pending: number;
    paid: number;
    completed: number;
  };

  sales: {
    revenue: string;
    monthly_target: string;
    monthly_revenue: string;
    today_revenue: string;
    progress: number;
  };

  inventory: {
    total_items: number;
    low_stock: number;
    out_of_stock: number;
  };

  recent_orders: DashboardRecentOrder[];

  recent_products: unknown[];
}

export interface SalesChartItem {
  month: string;
  revenue: string;
}
