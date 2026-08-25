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
