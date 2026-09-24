import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import { getCatalogueProducts, getProduct } from "../app/_lib/api.ts";

afterEach(() => mock.restoreAll());

test("catalogue includes products beyond the first API page", async () => {
  const calls = [];
  mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    const page = Number(new URL(url).searchParams.get("page"));
    return Response.json({ items: [{ id: page }], pages: 3 });
  });
  assert.deepEqual((await getCatalogueProducts()).map((item) => item.id), [1, 2, 3]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.includes("page_size=48")));
});

test("catalogue does not silently return a partial result when a later page fails", async () => {
  mock.method(globalThis, "fetch", async (url) => new URL(url).searchParams.get("page") === "1"
    ? Response.json({ items: [{ id: 1 }], pages: 2 })
    : new Response(null, { status: 503 }));
  await assert.rejects(getCatalogueProducts, /Unable to load/);
});

test("empty catalogue requires only one request", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ items: [], pages: 0 }));
  assert.deepEqual(await getCatalogueProducts(), []);
  assert.equal(fetch.mock.callCount(), 1);
});

test("invalid product URLs return not-found without calling the API", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected fetch"); });
  for (const id of ["abc", "-1", "0", "1.5", "2147483648", "1/2"]) {
    assert.equal(await getProduct(id), null);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("missing products return null but an API outage remains an error", async () => {
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  assert.equal(await getProduct("1"), null);
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(() => getProduct("1"), /Unable to load this product/);
});
