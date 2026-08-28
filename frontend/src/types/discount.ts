export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE";

export interface Discount {
  id: number;
  product_id: number;
  name: string;
  discount_type: DiscountType;
  discount_value: number | string;
  bundle_quantity: number | null;
  stack_with_bundle: boolean;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountInput {
  product_id: number;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  bundle_quantity?: number | null;
  stack_with_bundle?: boolean;
  start_at: string;
  end_at: string;
  is_active: boolean;
}
