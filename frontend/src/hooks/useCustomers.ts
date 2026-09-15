import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archiveCustomer, createCustomer, getCustomersByStatus, restoreCustomer, updateCustomer } from "../api/customers";
import type { CustomerStatus, UpdateCustomerData } from "../api/customers";

export function useCustomers(customerStatus: CustomerStatus = "active") {
  return useQuery({
    queryKey: ["customers", customerStatus],
    queryFn: () => getCustomersByStatus(customerStatus),
  });
}

function useCustomerArchiveMutation(action: "archive" | "restore") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action === "archive" ? archiveCustomer : restoreCustomer,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useArchiveCustomer() {
  return useCustomerArchiveMutation("archive");
}

export function useRestoreCustomer() {
  return useCustomerArchiveMutation("restore");
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
