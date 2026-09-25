import assert from "node:assert/strict";
import { test, mock, afterEach } from "node:test";
import { productMediaUrl } from "../app/_lib/product-media.ts";
import { GET } from "../app/product-media/[productId]/[imageId]/route.ts";
import { getFeaturedProduct, getCatalogueProducts, getProduct } from "../app/_lib/api.ts";

afterEach(() => mock.restoreAll());
test("media URLs only address product image records", () => {
  assert.equal(productMediaUrl("/api/storefront/products/1/images/2/content"), "/product-media/1/2");
  for (const path of [null, "https://example.test/private", "/api/auth", "/static/product_images/x.jpg", "/api/storefront/products/../images/2/content"]) assert.equal(productMediaUrl(path), null);
});
test("media proxy rejects invalid IDs without contacting another host", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected fetch"); });
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ productId: "../auth", imageId: "1" }) });
  assert.equal(response.status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});
test("media proxy rejects non-image content and does not cache failures", async () => {
  mock.method(globalThis, "fetch", async () => new Response("private", { headers: { "Content-Type": "text/html" } }));
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ productId: "1", imageId: "2" }) });
  assert.equal(response.status, 502);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("all product data reads are fresh, including featured and detail", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ items: [], pages: 0 }));
  await getFeaturedProduct(); await getCatalogueProducts(); await getProduct("1");
  assert.ok(fetch.mock.calls.every(call => call.arguments[1].cache === "no-store"));
});
