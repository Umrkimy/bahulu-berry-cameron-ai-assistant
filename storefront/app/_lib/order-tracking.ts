// Customer order tracking. The API decides what a customer may see; this
// module only turns its statuses into the words and steps on the page.

import { isValidPhone } from "./checkout.ts";

export type TrackedItem = { name_en: string; name_ms: string; quantity: number; total_amount: string };

export type TrackedDelivery = {
  status: string;
  courier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
};

export type TrackedOrder = {
  order_number: number;
  created_at: string;
  closed_at: string | null;
  status: string;
  payment_status: string;
  items: TrackedItem[];
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  delivery: TrackedDelivery | null;
  recipient_first_name: string | null;
  phone_last_digits: string | null;
};

export type TrackingStage =
  | "awaitingPayment" | "received" | "preparing" | "onTheWay" | "outForDelivery"
  | "delivered" | "completed" | "cancelled" | "deliveryFailed" | "refunded";

// Mirrors the backend's token_urlsafe(32) shape, so junk never reaches the API.
export function isTrackingToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(value);
}

export function trackingStage(order: TrackedOrder): TrackingStage {
  const delivery = order.delivery?.status;
  if (order.payment_status === "REFUNDED") return "refunded";
  if (order.status === "CANCELLED") return "cancelled";
  if (delivery === "FAILED") return "deliveryFailed";
  if (delivery === "DELIVERED") return "delivered";
  if (order.status === "COMPLETED") return "completed";
  if (delivery === "OUT_FOR_DELIVERY") return "outForDelivery";
  if (order.status === "SHIPPED" || delivery === "SHIPPED" || delivery === "IN_TRANSIT") return "onTheWay";
  if (order.status === "PROCESSING") return "preparing";
  if (order.payment_status === "PAID") return "received";
  return "awaitingPayment";
}

export type TrackingStepKey = "placed" | "paid" | "preparing" | "shipped" | "outForDelivery" | "delivered" | "failed" | "cancelled";
export type TrackingStep = { key: TrackingStepKey; at: string | null; done: boolean };

const PROGRESS: TrackingStage[] = ["awaitingPayment", "received", "preparing", "onTheWay", "outForDelivery", "delivered"];

// The timeline a customer sees. Steps not reached yet stay listed but not done,
// so the customer knows what comes next.
export function trackingSteps(order: TrackedOrder): TrackingStep[] {
  const stage = trackingStage(order);
  const delivery = order.delivery;
  const placed: TrackingStep = { key: "placed", at: order.created_at, done: true };
  const paid = order.payment_status === "PAID" || order.payment_status === "REFUNDED";
  if (stage === "cancelled" || stage === "refunded") {
    return [placed, ...(paid ? [{ key: "paid", at: null, done: true } as TrackingStep] : []), { key: "cancelled", at: order.closed_at, done: true }];
  }
  const reached = stage === "completed" || stage === "deliveryFailed" ? PROGRESS.length : PROGRESS.indexOf(stage);
  const steps: TrackingStep[] = [
    placed,
    { key: "paid", at: null, done: paid },
    { key: "preparing", at: null, done: reached >= 2 },
    { key: "shipped", at: delivery?.shipped_at ?? null, done: reached >= 3 || Boolean(delivery?.shipped_at) },
    { key: "outForDelivery", at: delivery?.out_for_delivery_at ?? null, done: reached >= 4 || Boolean(delivery?.out_for_delivery_at) },
  ];
  if (stage === "deliveryFailed") return [...steps, { key: "failed", at: delivery?.failed_at ?? null, done: true }];
  return [...steps, { key: "delivered", at: delivery?.delivered_at ?? order.closed_at, done: stage === "delivered" || stage === "completed" }];
}

export type LookupErrors = Partial<Record<"order_number" | "phone_number", "required" | "invalid">>;

export function validateLookup(orderNumber: string, phone: string): LookupErrors {
  const errors: LookupErrors = {};
  const number = orderNumber.trim().replace(/^#/, "");
  if (!number) errors.order_number = "required";
  else if (!/^\d{1,9}$/.test(number) || Number(number) < 1) errors.order_number = "invalid";
  if (!phone.trim()) errors.phone_number = "required";
  else if (!isValidPhone(phone)) errors.phone_number = "invalid";
  return errors;
}

export function lookupPayload(orderNumber: string, phone: string) {
  return { order_number: Number(orderNumber.trim().replace(/^#/, "")), phone_number: phone.trim() };
}

export function trackingDate(value: string, locale: "en" | "ms"): string {
  return new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}
