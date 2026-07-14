import { useQuery } from "@tanstack/react-query";

import { getDashboard, getDashboardInventory } from "../api/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-stats"],

    queryFn: getDashboard,
  });
}

export function useDashboardInventory() {
  return useQuery({
    queryKey: ["dashboard"],

    queryFn: getDashboardInventory,
  });
}
