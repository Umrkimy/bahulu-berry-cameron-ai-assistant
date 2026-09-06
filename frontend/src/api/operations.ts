import api from "./axios";
import type { OperationAlertFilters, OperationAlertPage } from "../types/operations";

export async function getOperationAlerts(filters: OperationAlertFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  const response = await api.get<OperationAlertPage>("/operations/alerts", { params });
  return response.data;
}
