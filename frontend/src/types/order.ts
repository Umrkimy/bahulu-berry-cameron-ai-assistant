export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";

export interface Order {
  id: number;
  customer_id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  tracking_number: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  discount_id: number | null;
  discount_name: string | null;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE" | null;
  discount_value: number | string | null;
  discount_bundle_quantity: number | null;
  discount_amount: number | string;
  total_amount: number | string;
}

export interface CreateOrderItemData {
  product_id: number;
  quantity: number;
}

export interface CreateOrderData {
  customer_id: number;
  items: CreateOrderItemData[];
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tracking_number?: string | null;
}

export interface OrderQuoteItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  discount_id: number | null;
  discount_name: string | null;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE" | null;
  discount_value: number | string | null;
  discount_bundle_quantity: number | null;
  discount_amount: number | string;
  total_amount: number | string;
}

export interface OrderQuote {
  items: OrderQuoteItem[];
  subtotal: number | string;
  discount_amount: number | string;
  total_amount: number | string;
}
