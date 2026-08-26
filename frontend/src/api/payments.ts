import api from "./axios";
import type { Payment } from "../types/payment";

export const createOrderPayment = async (orderId: number): Promise<Payment> => {
  const response = await api.post<Payment>(`/payments/orders/${orderId}`);

  return response.data;
};

export const getOrderPayment = async (orderId: number): Promise<Payment> => {
  const response = await api.get<Payment>(`/payments/orders/${orderId}`);

  return response.data;
};
