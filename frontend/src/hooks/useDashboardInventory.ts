import { useQuery } from "@tanstack/react-query";

import { getDashboardInventory } from "../api/dashboard";
import { dashboardQueryKeys } from "../queryPolicy";

export function useDashboardInventory() {
  return useQuery({
    queryKey: dashboardQueryKeys.inventory,
    queryFn: getDashboardInventory,
  });
}
