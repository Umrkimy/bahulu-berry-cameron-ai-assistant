import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrderPayment,
  getOrderPayment,
  renewOrderPayment,
} from "../api/payments";
import { invalidateDashboardQueries } from "../queryPolicy";

export function useOrderPayment(orderId: number, enabled = true) {
  return useQuery({
    queryKey: ["payment", orderId],
    queryFn: () => getOrderPayment(orderId),
    enabled: enabled && orderId > 0,
  });
}

function useRefreshPayment() {
  const queryClient = useQueryClient();
  return async (payment: Awaited<ReturnType<typeof createOrderPayment>>) => {
    queryClient.setQueryData(["payment", payment.order_id], payment);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["payment", payment.order_id] }),
      invalidateDashboardQueries(queryClient),
    ]);
  };
}

export function useRenewOrderPayment() {
  const refresh = useRefreshPayment();
  return useMutation({ mutationFn: (orderId: number) => renewOrderPayment(orderId), onSuccess: refresh });
}

export function useCreateOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => createOrderPayment(orderId),

    onSuccess: async (payment) => {
      queryClient.setQueryData(["payment", payment.order_id], payment);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["payment", payment.order_id],
        }),
        invalidateDashboardQueries(queryClient),
      ]);
    },
  });
}
