import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createRefundRequest,
  executeRefundRequest,
  getOrderRefundRequest,
  getRefundRequests,
  updateRefundRequest,
} from "../api/refundRequests";
import type { RefundRequestStatus } from "../types/refundRequest";

function useRefundInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["refund-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["payment"] }),
      queryClient.invalidateQueries({ queryKey: ["activity"] }),
    ]);
  };
}

export function useRefundRequests() {
  return useQuery({ queryKey: ["refund-requests"], queryFn: getRefundRequests });
}

export function useOrderRefundRequest(orderId: number) {
  return useQuery({
    queryKey: ["refund-requests", "order", orderId],
    queryFn: () => getOrderRefundRequest(orderId),
    enabled: orderId > 0,
    retry: false,
  });
}

export function useCreateRefundRequest() {
  const invalidate = useRefundInvalidation();
  return useMutation({ mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) => createRefundRequest(orderId, reason), onSuccess: invalidate });
}

export function useUpdateRefundRequest() {
  const invalidate = useRefundInvalidation();
  return useMutation({ mutationFn: ({ requestId, status, internalNote }: { requestId: number; status: RefundRequestStatus; internalNote: string | null }) => updateRefundRequest(requestId, status, internalNote), onSuccess: invalidate });
}

export function useExecuteRefundRequest() {
  const invalidate = useRefundInvalidation();
  return useMutation({ mutationFn: executeRefundRequest, onSuccess: invalidate });
}
