export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "EXPIRED";

export interface Payment {
  id: number;
  order_id: number;
  provider: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
