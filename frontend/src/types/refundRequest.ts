export type RefundRequestStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED";

export interface RefundRequest {
  id: number;
  order_id: number;
  customer_name: string;
  order_total: number;
  status: RefundRequestStatus;
  reason: string;
  internal_note: string | null;
  requested_by_admin_id: number;
  reviewed_by_admin_id: number | null;
  created_at: string;
  reviewed_at: string | null;
  refunded_at: string | null;
  updated_at: string;
}
