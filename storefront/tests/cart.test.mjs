import assert from "node:assert/strict";
import { test } from "node:test";

import { addCartItem, cartCount, MAX_CART_QUANTITY, parseStoredCart, sanitizeCart, updateCartItem } from "../app/_lib/cart.ts";
import { cartCopy } from "../app/_lib/cart-copy.ts";
import { quoteCart } from "../app/_lib/cart-api.ts";
import { afterEach, mock } from "node:test";

afterEach(() => mock.restoreAll());

test("cart storage drops malformed values, merges duplicates and caps quantities", () => {
  assert.deepEqual(parseStoredCart("not-json"), []);
  assert.deepEqual(sanitizeCart([
    { productId: 4, quantity: 2 },
    { productId: 4, quantity: 98 },
    { productId: -1, quantity: 2 },
    { productId: 5, quantity: 0 },
    null,
  ]), [{ productId: 4, quantity: MAX_CART_QUANTITY }]);
});

test("cart updates remain immutable and enforce the quantity boundary", () => {
  const original = [{ productId: 2, quantity: 1 }];
  const added = addCartItem(original, 2);
  assert.deepEqual(original, [{ productId: 2, quantity: 1 }]);
  assert.deepEqual(added, [{ productId: 2, quantity: 2 }]);
  assert.deepEqual(updateCartItem(added, 2, 200), [{ productId: 2, quantity: 99 }]);
  assert.deepEqual(updateCartItem(added, 2, 0), []);
  assert.equal(cartCount([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 3 }]), 5);
});

test("cart and checkout controls have English and Bahasa Melayu copy", () => {
  assert.equal(cartCopy.en.add, "Add to cart");
  assert.equal(cartCopy.ms.add, "Tambah ke troli");
  assert.match(cartCopy.en.paymentBody, /unavailable/i);
  assert.match(cartCopy.ms.paymentBody, /tidak tersedia/i);
});

test("cart quotes through the storefront same-origin boundary", async () => {
  const fetch = mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/storefront-data/quote");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { items: [{ product_id: 7, quantity: 2 }] });
    return Response.json({ ready: true, items: [], subtotal: "10.00", discount_amount: "0.00", total_amount: "10.00" });
  });
  assert.equal((await quoteCart([{ productId: 7, quantity: 2 }])).total_amount, "10.00");
  assert.equal(fetch.mock.callCount(), 1);
});
