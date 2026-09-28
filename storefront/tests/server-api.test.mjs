import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import { getProducts } from "../app/_lib/api.ts";
import { clientIpHeaders, requestClientIpHeaders } from "../app/_lib/server-api.ts";

afterEach(() => mock.restoreAll());

test("only well-formed visitor addresses are forwarded to the API", () => {
  assert.deepEqual(clientIpHeaders("203.0.113.10"), { "X-Client-IP": "203.0.113.10" });
  assert.deepEqual(clientIpHeaders(" 2001:db8::1 "), { "X-Client-IP": "2001:db8::1" });
  for (const value of [null, undefined, "", "not-an-ip", "203.0.113.10, 198.51.100.2"]) {
    assert.deepEqual(clientIpHeaders(value), {});
  }
});

test("route handlers forward the Cloudflare visitor address", () => {
  const request = new Request("http://localhost:3000/storefront-data/quote", {
    method: "POST",
    headers: { "CF-Connecting-IP": "203.0.113.10", "X-Client-IP": "198.51.100.99" },
  });

  // A visitor-supplied X-Client-IP is ignored; only Cloudflare's header counts.
  assert.deepEqual(requestClientIpHeaders(request), { "X-Client-IP": "203.0.113.10" });
  assert.deepEqual(requestClientIpHeaders(new Request("http://localhost:3000/")), {});
});

test("catalogue reads outside a visitor request send no client address", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ items: [], pages: 0 }));

  await getProducts();

  assert.deepEqual(fetch.mock.calls[0].arguments[1].headers, {});
});
