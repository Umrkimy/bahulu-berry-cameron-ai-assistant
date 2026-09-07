import api from "./axios";

import type { Inventory, InventoryUpdateData, StockMovement, StockMovementInput } from "../types/inventory";

export async function getInventories() {
  const response = await api.get<Inventory[]>("/inventories");

  return response.data;
}

export async function updateInventory(
  inventoryId: number,
  data: InventoryUpdateData,
) {
  const response = await api.patch<Inventory>(
    `/inventories/${inventoryId}`,
    data,
  );

  return response.data;
}

export async function adjustInventory(
  inventoryId: number,
  quantityChange: number,
) {
  const response = await api.patch<Inventory>(
    `/inventories/${inventoryId}/adjust`,
    {
      quantity_change: quantityChange,
    },
  );

  return response.data;
}

export async function createStockMovement(inventoryId: number, data: StockMovementInput) {
  return (await api.post<Inventory>(`/inventories/${inventoryId}/movements`, data)).data;
}
export async function createOpeningBalance(inventoryId: number, reason: string) {
  return (await api.post<Inventory>(`/inventories/${inventoryId}/opening-balance`, { reason })).data;
}
export async function getStockMovements(params: Record<string, string | number | undefined>) {
  return (await api.get<{ items: StockMovement[]; total: number }>("/inventories/movements", { params })).data;
}
