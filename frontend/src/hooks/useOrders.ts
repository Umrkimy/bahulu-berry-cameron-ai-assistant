import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, getOrders, updateOrder  } from "../api/orders";
import type { CreateOrderData, UpdateOrderData  } from "../types/order";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderData) => createOrder(data),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: number;
      data: UpdateOrderData;
    }) => updateOrder(orderId, data),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },
  });
}
