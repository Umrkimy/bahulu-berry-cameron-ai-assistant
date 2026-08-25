import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelOrder,
  createOrder,
  getOrders,
  updateOrder,
} from "../api/orders";

import type { CreateOrderData, Order, UpdateOrderData } from "../types/order";

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

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["products"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["inventories"],
        }),
      ]);
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

    onSuccess: async (updatedOrder: Order) => {
      /*
       * Immediately update the order in the table.
       */
      queryClient.setQueryData<Order[]>(["orders"], (currentOrders) => {
        if (!currentOrders) {
          return currentOrders;
        }

        return currentOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order,
        );
      });
      await queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => cancelOrder(orderId),

    onSuccess: async (cancelledOrder: Order) => {
      queryClient.setQueryData<Order[]>(["orders"], (currentOrders) => {
        if (!currentOrders) {
          return currentOrders;
        }

        return currentOrders.map((order) =>
          order.id === cancelledOrder.id ? cancelledOrder : order,
        );
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["products"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["inventories"],
        }),
      ]);
    },
  });
}
