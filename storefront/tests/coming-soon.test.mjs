import assert from "node:assert/strict";
import test from "node:test";

import { decideGate, isComingSoonEnabled, previewKey, previewToken } from "../app/_lib/coming-soon.ts";

const key = "a-long-private-preview-key-for-tests";

test("coming soon is off unless the server flag is exactly true", () => {
  assert.equal(isComingSoonEnabled({}), false);
  assert.equal(isComingSoonEnabled({ STOREFRONT_COMING_SOON: "TRUE" }), false);
  assert.equal(isComingSoonEnabled({ STOREFRONT_COMING_SOON: "true" }), true);
});

test("a missing or short preview key lets nobody in", async () => {
  assert.equal(previewKey({}), null);
  assert.equal(previewKey({ STOREFRONT_PREVIEW_KEY: "short" }), null);
  assert.equal(await decideGate("/preview", "short", undefined, null), "coming-soon");
  assert.equal(await decideGate("/", null, "anything", null), "coming-soon");
});

test("the right preview link grants access and a wrong one shows coming soon", async () => {
  assert.equal(await decideGate("/preview", key, undefined, key), "grant");
  assert.equal(await decideGate("/preview", `${key}x`, undefined, key), "coming-soon");
  assert.equal(await decideGate("/preview", null, undefined, key), "coming-soon");
});

test("visitors see coming soon and data routes stay hidden", async () => {
  assert.equal(await decideGate("/", null, undefined, key), "coming-soon");
  assert.equal(await decideGate("/products/1", null, "wrong", key), "coming-soon");
  assert.equal(await decideGate("/storefront-data/quote", null, undefined, key), "not-found");
  assert.equal(await decideGate("/sitemap.xml", null, undefined, key), "not-found");
});

test("the preview cookie opens every page, and a new key signs it out", async () => {
  const cookie = await previewToken(key);
  assert.notEqual(cookie, key);
  assert.equal(await decideGate("/products", null, cookie, key), "allow");
  assert.equal(await decideGate("/storefront-data/quote", null, cookie, key), "allow");
  assert.equal(await decideGate("/products", null, cookie, `${key}-rotated`), "coming-soon");
});
