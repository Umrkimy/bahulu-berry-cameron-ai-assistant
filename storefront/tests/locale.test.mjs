import assert from "node:assert/strict";
import test from "node:test";

import { cookieLocale, localeCookie, parseLocale } from "../app/_lib/locale.ts";

test("only en and ms are accepted from the language cookie", () => {
  assert.equal(parseLocale("ms"), "ms");
  for (const value of ["en", undefined, null, "", "fr", "ms;"]) assert.equal(parseLocale(value), "en");
  assert.equal(cookieLocale("a=1; bbc_locale=ms; b=2"), "ms");
  assert.equal(cookieLocale("bbc_locale=en"), "en");
  assert.equal(cookieLocale("bbc_locale=xx; other=ms"), null);
  assert.equal(cookieLocale("not_bbc_locale=ms"), null);
});

test("the language cookie is long-lived, site-wide and Secure on https", () => {
  assert.equal(localeCookie("ms", true), "bbc_locale=ms; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
  assert.ok(!localeCookie("en", false).includes("Secure"));
});
