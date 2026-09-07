export type DashboardAction = "CREATE_CUSTOMER" | "CREATE_PRODUCT" | "CREATE_ORDER" | "CREATE_DISCOUNT" | "CREATE_REFUND_REQUEST";

export interface DashboardRouteState {
  dashboardAction?: DashboardAction;
  orderId?: string;
}
