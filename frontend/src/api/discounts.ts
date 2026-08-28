import api from "./axios";

import type { Discount, DiscountInput } from "../types/discount";

export async function getDiscounts() {
  const response = await api.get<Discount[]>("/discounts");

  return response.data;
}

export async function createDiscount(data: DiscountInput) {
  const response = await api.post<Discount>("/discounts", data);

  return response.data;
}

export async function updateDiscount(
  discountId: number,
  data: Partial<DiscountInput>,
) {
  const response = await api.patch<Discount>(`/discounts/${discountId}`, data);

  return response.data;
}

export async function deleteDiscount(discountId: number) {
  await api.delete(`/discounts/${discountId}`);
}
