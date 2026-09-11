import type { QueryClient } from "@tanstack/react-query";

export const routineQueryDefaults = {
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
} as const;

export const dashboardQueryKeys = {
  stats: ["dashboard-stats"],
  inventory: ["dashboard-inventory"],
} as const;

export function invalidateDashboardQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.inventory }),
  ]);
}
