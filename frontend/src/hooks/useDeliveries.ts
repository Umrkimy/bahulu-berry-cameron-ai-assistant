import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getDeliveries,
  getOrderDelivery,
  updateOrderDelivery,
} from "../api/deliveries";

import type { UpdateDeliveryData } from "../types/delivery";

export function useDeliveries() {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
  });
}

export function useOrderDelivery(orderId: number) {
  return useQuery({
    queryKey: ["delivery", orderId],
    queryFn: () => getOrderDelivery(orderId),
    enabled: orderId > 0,
  });
}

export function useUpdateOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: number;
      data: UpdateDeliveryData;
    }) => updateOrderDelivery(orderId, data),

    onSuccess: async (updatedDelivery) => {
      queryClient.setQueryData(
        ["delivery", updatedDelivery.order_id],
        updatedDelivery,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["deliveries"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["delivery", updatedDelivery.order_id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);
    },
  });
}
