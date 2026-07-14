import { useQuery } from "@tanstack/react-query";

import { getDashboardInventory } from "../api/dashboard";

export function useDashboardInventory() {
  return useQuery({
    queryKey: ["dashboard-inventory"],
    queryFn: getDashboardInventory,
  });
}
