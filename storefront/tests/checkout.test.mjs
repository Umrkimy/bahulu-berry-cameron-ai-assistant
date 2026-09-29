import assert from "node:assert/strict";
import test from "node:test";

import {
  CHECKOUT_STEP_FIELDS, checkoutFailure, checkoutPayload, emptyContact, errorsForStep, firstStepWithErrors, idempotencyKeyFor, isValidPhone, safePaymentUrl, serverFieldErrors, validateCheckout,
} from "../app/_lib/checkout.ts";

const contact = {
  full_name: " Fictional Buyer ", phone_number: "012-345 6789", email: "", address: "1 Jalan Rekaan",
  city: "Tanah Rata", state: "Pahang", postal_code: "39000",
};

test("phone numbers follow the backend's Malaysian and international rules", () => {
  assert.equal(isValidPhone("012-345 6789"), true);
  assert.equal(isValidPhone("+44 20 7946 0000"), true);
  assert.equal(isValidPhone("12345"), false);
  assert.equal(isValidPhone("123456789012"), false);
});

test("checkout validation requires contact details and the privacy notice", () => {
  const errors = validateCheckout(emptyContact, false);
  assert.deepEqual(Object.keys(errors), ["full_name", "phone_number", "address", "city", "postal_code", "state", "privacy"]);
  assert.deepEqual(validateCheckout(contact, true), {});
  assert.equal(validateCheckout({ ...contact, postal_code: "3900" }, true).postal_code, "invalid");
  assert.equal(validateCheckout({ ...contact, email: "not-an-email" }, true).email, "invalid");
});

test("checkout payload trims input, sends blank email as null and never sends prices", () => {
  const payload = checkoutPayload([{ productId: 4, quantity: 2, displayPrice: "99.00" }], contact, "ms");
  assert.deepEqual(payload.items, [{ product_id: 4, quantity: 2 }]);
  assert.equal(payload.contact.full_name, "Fictional Buyer");
  assert.equal(payload.contact.email, null);
  assert.equal(payload.privacy_notice_accepted, true);
  assert.equal(JSON.stringify(payload).includes("99.00"), false);
});

test("a retried identical submission reuses its idempotency key", () => {
  let counter = 0;
  const makeKey = () => `key-${++counter}`;
  const first = idempotencyKeyFor("body-a", null, makeKey);
  assert.equal(idempotencyKeyFor("body-a", first, makeKey).key, "key-1");
  assert.equal(idempotencyKeyFor("body-b", first, makeKey).key, "key-2");
});

test("API errors map to customer-safe messages", () => {
  assert.equal(checkoutFailure(409, "UNAVAILABLE"), "unavailable");
  assert.equal(checkoutFailure(503, undefined), "payment");
  assert.equal(checkoutFailure(429, undefined), "busy");
  assert.equal(checkoutFailure(500, undefined), "network");
});

test("only https payment pages are followed", () => {
  assert.equal(safePaymentUrl("https://checkout.stripe.com/c/pay/cs_test_x"), "https://checkout.stripe.com/c/pay/cs_test_x");
  assert.equal(safePaymentUrl("javascript:alert(1)"), null);
  assert.equal(safePaymentUrl("http://example.com"), null);
  assert.equal(safePaymentUrl(undefined), null);
});

test("every checkout string ships in English and Bahasa Melayu", async () => {
  const { cartCopy } = await import("../app/_lib/cart-copy.ts");
  assert.deepEqual(Object.keys(cartCopy.ms).sort(), Object.keys(cartCopy.en).sort());
  for (const [key, value] of Object.entries(cartCopy.ms)) assert.ok(value.trim(), `ms.${key} is empty`);
});

test("maps API field rejections onto the checkout fields", () => {
  const detail = [
    { type: "value_error", loc: ["body", "contact", "email"], msg: "value is not a valid email address" },
    { type: "value_error", loc: ["body", "contact", "not_a_field"], msg: "ignored" },
    { type: "missing", loc: ["body", "items"], msg: "ignored" },
  ];
  assert.deepEqual(serverFieldErrors(detail), { email: "invalid" });
  assert.deepEqual(serverFieldErrors({ code: "UNAVAILABLE" }), {});
  assert.deepEqual(serverFieldErrors("Invalid checkout request."), {});
});

test("checkout steps cover every field once and route errors to the earliest step", () => {
  const fields = Object.values(CHECKOUT_STEP_FIELDS).flat();
  assert.deepEqual([...fields].sort(), ["address", "city", "email", "full_name", "phone_number", "postal_code", "privacy", "state"]);
  assert.equal(new Set(fields).size, fields.length);
  const all = validateCheckout(emptyContact, false);
  assert.deepEqual(Object.keys(errorsForStep(all, 1)), ["full_name", "phone_number"]);
  assert.deepEqual(Object.keys(errorsForStep(all, 2)), ["address", "city", "postal_code", "state"]);
  assert.equal(firstStepWithErrors(all), 1);
  assert.equal(firstStepWithErrors(validateCheckout({ ...contact, postal_code: "12" }, true)), 2);
  assert.equal(firstStepWithErrors(validateCheckout(contact, false)), 3);
  assert.equal(firstStepWithErrors(validateCheckout(contact, true)), null);
});
