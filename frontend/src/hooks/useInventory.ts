import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  adjustInventory,
  createOpeningBalance,
  createStockMovement,
  getStockMovements,
  getInventories,
  updateInventory,
} from "../api/inventory";

import type { InventoryUpdateData, StockMovementInput } from "../types/inventory";

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

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      quantityChange,
    }: {
      inventoryId: number;
      quantityChange: number;
    }) =>
      adjustInventory(
        inventoryId,
        quantityChange,
      ),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["inventories"],
      });
    },
  });
}

export function useStockMovements(params: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["stock-movements", params], queryFn: () => getStockMovements(params) });
}
export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ inventoryId, data }: { inventoryId: number; data: StockMovementInput }) => createStockMovement(inventoryId, data), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["inventories"] }); void queryClient.invalidateQueries({ queryKey: ["stock-movements"] }); } });
}
export function useOpeningBalance() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ inventoryId, reason }: { inventoryId: number; reason: string }) => createOpeningBalance(inventoryId, reason), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["stock-movements"] }); } });
}
