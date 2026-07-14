import type {
  DashboardInventoryItem,
  DashboardResponse,
  SalesChartItem,
} from "../types/dashboard";

import api from "./axios";

export async function getDashboard() {
  const response = await api.get<DashboardResponse>("/dashboard/stats");

  return response.data;
}

export async function getSalesChart() {
  const response = await api.get<SalesChartItem[]>("/dashboard/sales-chart");

  return response.data;
}

export async function getDashboardInventory() {
  const response = await api.get<DashboardInventoryItem[]>(
    "/dashboard/inventory",
  );

  return response.data;
}


