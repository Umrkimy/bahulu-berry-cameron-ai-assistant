import assert from "node:assert/strict";
import test from "node:test";

import { isCheckoutPreviewEnabled } from "../app/_lib/checkout-preview.ts";

test("checkout preview is disabled unless the server flag is exactly true", () => {
  assert.equal(isCheckoutPreviewEnabled({}), false);
  assert.equal(isCheckoutPreviewEnabled({ STOREFRONT_CHECKOUT_PREVIEW_ENABLED: "false" }), false);
  assert.equal(isCheckoutPreviewEnabled({ STOREFRONT_CHECKOUT_PREVIEW_ENABLED: "TRUE" }), false);
});

test("checkout preview is enabled only for explicit private review", () => {
  assert.equal(isCheckoutPreviewEnabled({ STOREFRONT_CHECKOUT_PREVIEW_ENABLED: "true" }), true);
});
