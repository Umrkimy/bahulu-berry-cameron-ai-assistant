import assert from "node:assert/strict";
import test from "node:test";

import { draftStats, stats, tiktokVideoIds } from "../app/_lib/content.ts";
import { cleanCaption, isFeaturedVideo, isTikTokImageHost } from "../app/_lib/tiktok.ts";

test("the thumbnail proxy only serves featured videos from TikTok's image CDN", () => {
  assert.equal(isFeaturedVideo(tiktokVideoIds[0]), true);
  assert.equal(isFeaturedVideo("1234567890"), false);
  assert.equal(isFeaturedVideo("../../etc/passwd"), false);
  assert.equal(isTikTokImageHost(new URL("https://p16-common-sign.tiktokcdn.com/a.jpeg")), true);
  assert.equal(isTikTokImageHost(new URL("https://p16-sign.tiktokcdn-us.com/a.jpeg")), true);
  assert.equal(isTikTokImageHost(new URL("http://p16-common-sign.tiktokcdn.com/a.jpeg")), false);
  assert.equal(isTikTokImageHost(new URL("https://tiktokcdn.com.evil.example/a.jpeg")), false);
  assert.equal(isTikTokImageHost(new URL("https://eviltiktokcdn.com/a.jpeg")), false);
});

test("captions drop hashtags and stay short", () => {
  assert.equal(cleanCaption("Penangan hari sabtu 🔥 #bahuluberrycameron #oleole"), "Penangan hari sabtu 🔥");
  assert.ok(cleanCaption("a ".repeat(80)).length <= 89);
});

test("every figure is bilingual", () => {
  assert.ok([...stats, ...draftStats].every((item) => item.value && item.label.en && item.label.ms));
});
