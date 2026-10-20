import type { RefundRequestStatus } from "../../types/refundRequest";

export const refundStatusColor: Record<RefundRequestStatus, string> = { REQUESTED: "yellow", UNDER_REVIEW: "blue", APPROVED: "violet", REJECTED: "red", REFUNDED: "green" };
