import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  adjustInventory,
  createOpeningBalance,
  createStockMovement,
  receiveStockReceipt,
  getStockMovements,
  getInventories,
  updateInventory,
} from "../api/inventory";

import type { BatchStockReceiptInput, InventoryUpdateData, StockMovementInput } from "../types/inventory";
import { invalidateDashboardQueries } from "../queryPolicy";

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
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventories"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        invalidateDashboardQueries(queryClient),
      ]);
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
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventories"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        invalidateDashboardQueries(queryClient),
      ]);
    },
  });
}

export function useStockMovements(params: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["stock-movements", params], queryFn: () => getStockMovements(params) });
}
export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ inventoryId, data }: { inventoryId: number; data: StockMovementInput }) => createStockMovement(inventoryId, data), onSuccess: () => { void Promise.all([queryClient.invalidateQueries({ queryKey: ["inventories"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["notifications"] }), invalidateDashboardQueries(queryClient)]); } });
}
export function useBatchStockReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchStockReceiptInput) => receiveStockReceipt(data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventories"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
        queryClient.invalidateQueries({ queryKey: ["operation-alerts"] }),
        invalidateDashboardQueries(queryClient),
      ]);
    },
  });
}
export function useOpeningBalance() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ inventoryId, reason }: { inventoryId: number; reason: string }) => createOpeningBalance(inventoryId, reason), onSuccess: () => { void Promise.all([queryClient.invalidateQueries({ queryKey: ["inventories"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), invalidateDashboardQueries(queryClient)]); } });
}
