import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCustomer, getCustomers, updateCustomer } from "../api/customers";
import type { UpdateCustomerData } from "../api/customers";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["customers"],
      });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: number;
      data: UpdateCustomerData;
    }) => updateCustomer(customerId, data),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["customers"],
      });
    },
  });
}
