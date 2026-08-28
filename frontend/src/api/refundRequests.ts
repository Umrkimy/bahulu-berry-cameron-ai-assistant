import api from "./axios";
import type { RefundRequest, RefundRequestStatus } from "../types/refundRequest";

export async function getRefundRequests(): Promise<RefundRequest[]> {
  return (await api.get<RefundRequest[]>("/refund-requests")).data;
}

export async function getOrderRefundRequest(orderId: number): Promise<RefundRequest> {
  return (await api.get<RefundRequest>(`/refund-requests/orders/${orderId}`)).data;
}

export async function createRefundRequest(orderId: number, reason: string): Promise<RefundRequest> {
  return (await api.post<RefundRequest>("/refund-requests", { order_id: orderId, reason })).data;
}

export async function updateRefundRequest(
  requestId: number,
  status: RefundRequestStatus,
  internalNote: string | null,
): Promise<RefundRequest> {
  return (await api.patch<RefundRequest>(`/refund-requests/${requestId}`, { status, internal_note: internalNote })).data;
}

export async function executeRefundRequest(requestId: number): Promise<RefundRequest> {
  return (await api.post<RefundRequest>(`/refund-requests/${requestId}/refund`)).data;
}
