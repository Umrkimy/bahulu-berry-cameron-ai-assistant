import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { defaultHomepage } from "../app/_lib/content.ts";

test("bundled homepage fallback is bilingual and keeps unapproved sections hidden", () => {
  assert.ok(defaultHomepage.hero.body.en);
  assert.ok(defaultHomepage.hero.body.ms);
  assert.equal(defaultHomepage.benefits.enabled, false);
  assert.equal(defaultHomepage.reviews.enabled, false);
  assert.equal(defaultHomepage.location.enabled, false);
  assert.equal(defaultHomepage.google_place_id, null);
});

test("homepage keeps the agreed landing-page section order and fixed destinations", async () => {
  const source = await readFile(new URL("../app/_components/home-content.tsx", import.meta.url), "utf8");
  const order = ["home-hero", "home-benefits", "home-collection", "home-story", "home-closing"].map((name) => source.indexOf(name));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal((source.match(/href="\/products"/g) ?? []).length, 3);
  assert.equal((source.match(/href="\/about"/g) ?? []).length, 1);
});
