import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { dashboardQueryKeys, invalidateDashboardQueries, routineQueryDefaults } from "./queryPolicy";

describe("query policy", () => {
  it("keeps routine data briefly and avoids refetching it only because the window regains focus", () => {
    expect(routineQueryDefaults).toMatchObject({ staleTime: 30_000, gcTime: 600_000, refetchOnWindowFocus: false });
  });

  it("invalidates both dashboard data sets after a relevant operational change", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    await invalidateDashboardQueries(client);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.stats });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.inventory });
  });
});
