import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getInventories, updateInventory } from "../api/inventory";

import type { InventoryUpdateData } from "../types/inventory";

export function useInventories() {
  return useQuery({
    queryKey: ["inventories"],

    queryFn: getInventories,
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
    }: {
      inventoryId: number;
      data: InventoryUpdateData;
    }) => updateInventory(inventoryId, data),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["inventories"],
      });
    },
  });
}
