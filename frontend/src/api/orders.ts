import api from "./axios";

export interface Order {
  id: number;
  customer: string;
  product: string;
  amount: number;
  payment_status: string;
  status: string;
}

export async function getRecentOrders() {
  const response = await api.get<Order[]>("/orders/recent");

  return response.data;
}
