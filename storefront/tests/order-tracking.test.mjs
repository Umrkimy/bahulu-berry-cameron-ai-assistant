import assert from "node:assert/strict";
import test from "node:test";

import { isTrackingToken, lookupPayload, trackingDate, trackingStage, trackingSteps, validateLookup } from "../app/_lib/order-tracking.ts";
import { trackingCopy } from "../app/_lib/tracking-copy.ts";

const base = {
  order_number: 7, created_at: "2026-09-29T02:00:00Z", closed_at: null, status: "PENDING", payment_status: "UNPAID",
  items: [{ name_en: "Fictional bahulu", name_ms: "Bahulu rekaan", quantity: 2, total_amount: "40.00" }],
  subtotal: "40.00", discount_amount: "0.00", total_amount: "40.00",
  delivery: { status: "PENDING", courier: null, tracking_number: null, shipped_at: null, out_for_delivery_at: null, delivered_at: null, failed_at: null },
  recipient_first_name: "Fictional", phone_last_digits: "6789",
};
const order = (changes = {}, delivery = {}) => ({ ...base, ...changes, delivery: { ...base.delivery, ...delivery } });

test("each order state maps to one customer-facing stage", () => {
  assert.equal(trackingStage(order()), "awaitingPayment");
  assert.equal(trackingStage(order({ payment_status: "PAID" })), "received");
  assert.equal(trackingStage(order({ status: "PROCESSING", payment_status: "PAID" })), "preparing");
  assert.equal(trackingStage(order({ status: "SHIPPED", payment_status: "PAID" }, { status: "IN_TRANSIT" })), "onTheWay");
  assert.equal(trackingStage(order({ status: "SHIPPED", payment_status: "PAID" }, { status: "OUT_FOR_DELIVERY" })), "outForDelivery");
  assert.equal(trackingStage(order({ status: "COMPLETED", payment_status: "PAID" }, { status: "DELIVERED" })), "delivered");
  assert.equal(trackingStage(order({ status: "COMPLETED", payment_status: "PAID", delivery: null })), "completed");
  assert.equal(trackingStage(order({ status: "SHIPPED", payment_status: "PAID" }, { status: "FAILED" })), "deliveryFailed");
  assert.equal(trackingStage(order({ status: "CANCELLED" })), "cancelled");
  assert.equal(trackingStage(order({ status: "CANCELLED", payment_status: "REFUNDED" })), "refunded");
});

test("every stage and step has English and Malay wording", () => {
  for (const locale of ["en", "ms"]) {
    for (const key of Object.keys(trackingCopy.en.stage)) assert.ok(trackingCopy[locale].stage[key], `${locale} stage ${key}`);
    for (const key of Object.keys(trackingCopy.en.step)) assert.ok(trackingCopy[locale].step[key], `${locale} step ${key}`);
  }
  assert.deepEqual(Object.keys(trackingCopy.ms).sort(), Object.keys(trackingCopy.en).sort());
});

test("the timeline marks reached steps and keeps the rest pending", () => {
  const steps = trackingSteps(order({ status: "SHIPPED", payment_status: "PAID" }, { status: "SHIPPED", shipped_at: "2026-09-30T01:00:00Z" }));
  assert.deepEqual(steps.map((step) => [step.key, step.done]), [
    ["placed", true], ["paid", true], ["preparing", true], ["shipped", true], ["outForDelivery", false], ["delivered", false],
  ]);
  assert.equal(steps[3].at, "2026-09-30T01:00:00Z");
});

test("cancelled and failed orders end the timeline with that outcome", () => {
  assert.deepEqual(trackingSteps(order({ status: "CANCELLED", closed_at: "2026-09-29T03:00:00Z" })).map((step) => step.key), ["placed", "cancelled"]);
  const failed = trackingSteps(order({ status: "SHIPPED", payment_status: "PAID" }, { status: "FAILED", failed_at: "2026-10-01T01:00:00Z" }));
  assert.equal(failed.at(-1).key, "failed");
  assert.equal(failed.at(-1).at, "2026-10-01T01:00:00Z");
});

test("tracking tokens and lookup fields are checked before calling the API", () => {
  assert.equal(isTrackingToken("a".repeat(43)), true);
  assert.equal(isTrackingToken("../secret"), false);
  assert.equal(isTrackingToken("short"), false);
  assert.deepEqual(validateLookup("", ""), { order_number: "required", phone_number: "required" });
  assert.deepEqual(validateLookup("12a", "123"), { order_number: "invalid", phone_number: "invalid" });
  assert.deepEqual(validateLookup("#1024", "012-345 6789"), {});
  assert.deepEqual(lookupPayload(" #1024 ", " 012-345 6789 "), { order_number: 1024, phone_number: "012-345 6789" });
});

test("dates show in Malaysian time", () => {
  assert.match(trackingDate("2026-09-29T16:30:00Z", "en"), /30 Sept? 2026/);
  assert.match(trackingDate("2026-09-29T16:30:00Z", "en"), /12:30/);
});
