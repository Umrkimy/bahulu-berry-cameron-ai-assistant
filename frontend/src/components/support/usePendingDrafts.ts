import { useQuery } from "@tanstack/react-query";

import { getSupportDrafts } from "../../api/support";

export const pendingDraftsQueryKey = ["support-drafts", "PENDING_REVIEW"] as const;

export function usePendingDrafts() {
  return useQuery({ queryKey: pendingDraftsQueryKey, queryFn: () => getSupportDrafts({ status_filter: "PENDING_REVIEW", page_size: 50 }) });
}
