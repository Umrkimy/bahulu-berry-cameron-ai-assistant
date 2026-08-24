import api from "./axios";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
  UpdateOrderData,
  OrderItem,
} from "../types/order";

export async function getOrders() {
  const response = await api.get<Order[]>("/orders");

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

export async function createOrderItem(
  orderId: number,
  data: CreateOrderItemData,
) {
  const response = await api.post(`/order_items/orders/${orderId}/items`, data);

  return response.data;
}

export async function updateOrder(orderId: number, data: UpdateOrderData) {
  const response = await api.patch<Order>(`/orders/${orderId}`, data);

  return response.data;
}
