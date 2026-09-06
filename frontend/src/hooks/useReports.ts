import { useQuery } from "@tanstack/react-query";

import { getReportSummary } from "../api/reports";
import type { ReportFilters } from "../types/reports";

export function useReportSummary(filters: ReportFilters) {
  return useQuery({ queryKey: ["owner-report", filters], queryFn: () => getReportSummary(filters) });
}
