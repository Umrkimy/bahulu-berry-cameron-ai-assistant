import api from "./axios";

import type {
  CreateOrderData,
  Order,
  OrderItem,
  UpdateOrderData,
  OrderQuote,
  FulfillmentQueue,
} from "../types/order";

interface CancelOrderResponse {
  success: boolean;
  message: string;
  order: Order;
}

export async function quoteOrder(items: CreateOrderData["items"]) {
  const response = await api.post<OrderQuote>("/orders/quote", { items });

  return response.data;
}

export async function getOrders() {
  const response = await api.get<Order[]>("/orders");

  return response.data;
}

export async function getFulfillmentQueue() {
  const response = await api.get<FulfillmentQueue>("/orders/fulfilment");
  return response.data;
}

export async function dispatchOrder(orderId: number, data: { packing_confirmed: true; courier?: string | null; tracking_number?: string | null }) {
  const response = await api.post<Order>(`/orders/${orderId}/dispatch`, data);
  return response.data;
}

export async function getOrderItems(orderId: number) {
  const response = await api.get<OrderItem[]>(
    `/order_items/orders/${orderId}/items`,
  );

  return response.data;
}

export async function createOrder(data: CreateOrderData) {
  const response = await api.post<Order>("/orders", data);

  return response.data;
}

export async function updateOrder(orderId: number, data: UpdateOrderData) {
  const response = await api.patch<Order>(`/orders/${orderId}`, data);

  return response.data;
}

export async function cancelOrder(orderId: number): Promise<Order> {
  const response = await api.post<CancelOrderResponse>(
    `/orders/${orderId}/cancel`,
  );

  return response.data.order;
}
