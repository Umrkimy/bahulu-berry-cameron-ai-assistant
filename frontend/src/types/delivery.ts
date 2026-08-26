export type DeliveryStatus =
  | "PENDING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

export interface Delivery {
  id: number;
  order_id: number;

  recipient_name: string | null;
  recipient_phone: string | null;

  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;

  courier: string | null;
  tracking_number: string | null;

  status: DeliveryStatus;

  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface UpdateDeliveryData {
  recipient_name?: string | null;
  recipient_phone?: string | null;

  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;

  courier?: string | null;
  tracking_number?: string | null;

  status?: DeliveryStatus;
}