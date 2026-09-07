import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelOrder,
  createOrder,
  getOrders,
  getFulfillmentQueue,
  dispatchOrder,
  updateOrder,
} from "../api/orders";

import type { CreateOrderData, Order, UpdateOrderData } from "../types/order";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
}

export function useFulfillmentQueue() {
  return useQuery({
    queryKey: ["fulfillment-queue"],
    queryFn: getFulfillmentQueue,
    refetchOnWindowFocus: true,
  });
}

export function useDispatchOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, courier, tracking_number }: { orderId: number; courier?: string | null; tracking_number?: string | null }) => dispatchOrder(orderId, { courier, tracking_number }),
    onSuccess: async () => {
      await Promise.all([
        ...["fulfillment-queue", "operation-alerts", "activity", "reports", "report-summary", "order", "delivery", "deliveries"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
        queryClient.invalidateQueries({ queryKey: ["fulfillment-queue"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderData) => createOrder(data),

    onSuccess: async () => {
      await Promise.all([
        ...["fulfillment-queue", "operation-alerts", "activity", "reports", "report-summary", "order", "delivery", "deliveries"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["products"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["inventories"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
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
      queryClient.setQueryData<Order[]>(["orders"], (currentOrders) => {
        if (!currentOrders) {
          return currentOrders;
        }

        return currentOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order,
        );
      });

      await Promise.all([
        ...["fulfillment-queue", "operation-alerts", "activity", "reports", "report-summary", "order", "delivery", "deliveries"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
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
        ...["fulfillment-queue", "operation-alerts", "activity", "reports", "report-summary", "order", "delivery", "deliveries"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
        queryClient.invalidateQueries({
          queryKey: ["orders"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["products"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["inventories"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);
    },
  });
}
