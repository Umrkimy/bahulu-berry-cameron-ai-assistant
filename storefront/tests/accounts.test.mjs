import assert from "node:assert/strict";
import { test } from "node:test";

import { accountCopy } from "../app/_lib/account-copy.ts";
import { CUSTOMER_COOKIE, findAccountRoute, isAccountsEnabled, sessionCookie } from "../app/_lib/accounts.ts";

test("accounts stay hidden unless explicitly enabled", () => {
  assert.equal(isAccountsEnabled({}), false);
  assert.equal(isAccountsEnabled({ STOREFRONT_ACCOUNTS_ENABLED: "1" }), false);
  assert.equal(isAccountsEnabled({ STOREFRONT_ACCOUNTS_ENABLED: "true" }), true);
});

test("only allowlisted account calls are forwarded", () => {
  assert.deepEqual(findAccountRoute("post", ["code", "verify"]), { path: "/code/verify", auth: false, session: "set" });
  assert.equal(findAccountRoute("GET", ["orders"]).auth, true);
  assert.equal(findAccountRoute("DELETE", ["me"]), null);
  assert.equal(findAccountRoute("GET", ["..", "admin"]), null);
  assert.equal(findAccountRoute("GET", ["me%2F..%2Fadmin"]), null);
  assert.equal(findAccountRoute("GET", ["code"]), null);
});

test("the session cookie is HttpOnly, Secure and Lax", () => {
  const cookie = sessionCookie("token", "2030-01-01T00:00:00Z");
  assert.equal(cookie.name, CUSTOMER_COOKIE);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.expires.toISOString(), "2030-01-01T00:00:00.000Z");
});

test("English and Malay account copy stay in step", () => {
  assert.deepEqual(Object.keys(accountCopy.ms).sort(), Object.keys(accountCopy.en).sort());
  for (const [key, value] of Object.entries(accountCopy.ms)) assert.ok(value.trim(), `ms.${key} is empty`);
});
