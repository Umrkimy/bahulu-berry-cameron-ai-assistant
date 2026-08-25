import api from "./axios";

import type { Inventory, InventoryUpdateData } from "../types/inventory";

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
