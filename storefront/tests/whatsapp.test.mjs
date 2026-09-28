import assert from "node:assert/strict";
import test from "node:test";

import { orderMessage, whatsAppNumber, whatsAppUrl } from "../app/_lib/whatsapp.ts";

test("WhatsApp actions stay hidden until a number is configured", () => {
  const previous = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  assert.equal(whatsAppNumber(), "");
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "+60 00-000 0000";
  assert.equal(whatsAppNumber(), "60000000000");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = previous;
});

test("the cart order is a readable draft the customer sends themselves", () => {
  const message = orderMessage("Hello, I'd like to order:", [
    { name: "Fictional Bahulu", quantity: 2, total: "RM 20.00" },
    { name: "Test Tart", quantity: 1, total: "RM 8.50" },
  ], "Total", "RM 28.50");
  assert.equal(message, "Hello, I'd like to order:\n\n- 2 × Fictional Bahulu (RM 20.00)\n- 1 × Test Tart (RM 8.50)\n\nTotal: RM 28.50");
  const url = new URL(whatsAppUrl("60000000000", message));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/60000000000");
  assert.equal(url.searchParams.get("text"), message);
});
