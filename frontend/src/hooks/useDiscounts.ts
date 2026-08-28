import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDiscount,
  deleteDiscount,
  getDiscounts,
  updateDiscount,
} from "../api/discounts";

import type { DiscountInput } from "../types/discount";

export function useDiscounts() {
  return useQuery({
    queryKey: ["discounts"],
    queryFn: getDiscounts,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDiscount,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["discounts"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]),
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ discountId, data }: { discountId: number; data: Partial<DiscountInput> }) =>
      updateDiscount(discountId, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["discounts"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]),
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["discounts"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]),
  });
}
