import api from "./axios";

import type { Delivery, UpdateDeliveryData } from "../types/delivery";

export async function getDeliveries() {
  const response = await api.get<Delivery[]>("/deliveries");

  return response.data;
}

export async function getOrderDelivery(orderId: number) {
  const response = await api.get<Delivery>(`/deliveries/orders/${orderId}`);

  return response.data;
}

export async function updateOrderDelivery(
  orderId: number,
  data: UpdateDeliveryData,
) {
  const response = await api.patch<Delivery>(
    `/deliveries/orders/${orderId}`,
    data,
  );

  return response.data;
}
