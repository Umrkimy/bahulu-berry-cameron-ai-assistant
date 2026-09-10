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
  low_stock_threshold?: number;
}

export type StockMovementType = "OPENING_BALANCE" | "SUPPLIER_RECEIPT" | "MANUAL_INCREASE" | "MANUAL_DECREASE" | "ORDER_DEDUCTION" | "CANCELLATION_RESTORATION";
export interface StockMovement { id: number; inventory_id: number; product_id: number; product_name: string; supplier_id: number | null; supplier_name: string | null; admin_name: string | null; movement_type: StockMovementType; quantity_change: number; quantity_before: number; quantity_after: number; reason: string | null; reference: string | null; source_type: string | null; source_id: number | null; created_at: string; }
export interface StockMovementInput { low_stock_threshold?: number; movement_type: "SUPPLIER_RECEIPT" | "MANUAL_INCREASE" | "MANUAL_DECREASE"; quantity_change: number; reason?: string | null; supplier_id?: number | null; reference?: string | null; }
export interface BatchStockReceiptLine { inventory_id: number; quantity: number; }
export interface BatchStockReceiptInput { supplier_id: number; reference: string; items: BatchStockReceiptLine[]; }
export interface BatchStockReceiptResult { received_count: number; inventories: Inventory[]; }
