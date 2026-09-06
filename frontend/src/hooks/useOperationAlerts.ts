import { useQuery } from "@tanstack/react-query";

import { getOperationAlerts } from "../api/operations";
import type { OperationAlertFilters } from "../types/operations";

export function useOperationAlerts(filters: OperationAlertFilters = {}) {
  return useQuery({
    queryKey: ["operation-alerts", filters],
    queryFn: () => getOperationAlerts(filters),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
