import api from "./axios";
import type { ReportFilters, ReportSummary } from "../types/reports";

function paramsFor(filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.preset) params.set("preset", filters.preset);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  return params;
}

export async function getReportSummary(filters: ReportFilters) {
  const response = await api.get<ReportSummary>("/reports/summary", { params: paramsFor(filters) });
  return response.data;
}

export async function downloadReportCsv(filters: ReportFilters) {
  const response = await api.get("/reports/summary.csv", { params: paramsFor(filters), responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bahulu-owner-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
