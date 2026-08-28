import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrderPayment,
  getOrderPayment,
} from "../api/payments";

export function useOrderPayment(orderId: number, enabled = true) {
  return useQuery({
    queryKey: ["payment", orderId],
    queryFn: () => getOrderPayment(orderId),
    enabled: enabled && orderId > 0,
  });
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
      ]);
    },
  });
}
