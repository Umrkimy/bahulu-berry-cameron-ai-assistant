import { useQuery } from "@tanstack/react-query";

import { getDashboard, getDashboardInventory } from "../api/dashboard";
import { dashboardQueryKeys } from "../queryPolicy";

export function useDashboard() {
  return useQuery({
    queryKey: dashboardQueryKeys.stats,

    queryFn: getDashboard,
  });
}

export function useDashboardInventory() {
  return useQuery({
    queryKey: dashboardQueryKeys.inventory,

    queryFn: getDashboardInventory,
  });
}
