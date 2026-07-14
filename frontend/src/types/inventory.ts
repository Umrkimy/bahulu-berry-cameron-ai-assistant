export interface Inventory {
  id: number;
  product_id: number;

  product_name: string;
  product_category: string | null;

  quantity: number;
  low_stock_threshold: number;

  created_at: string;
  updated_at: string;
}

export interface InventoryUpdateData {
  quantity?: number;
  low_stock_threshold?: number;
}
