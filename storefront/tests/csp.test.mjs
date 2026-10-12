import assert from "node:assert/strict";
import { test } from "node:test";

import { buildContentSecurityPolicy, createNonce } from "../app/_lib/csp.ts";

test("production policy only runs scripts carrying the request nonce", () => {
  const policy = buildContentSecurityPolicy("abc123");
  assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic'(;|$)/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /upgrade-insecure-requests/);
});

test("only the TikTok player and Google map may be framed", () => {
  const frames = buildContentSecurityPolicy("n").split("; ").find((directive) => directive.startsWith("frame-src"));
  assert.equal(frames, "frame-src 'self' https://www.tiktok.com https://www.google.com");
});

test("development keeps React tooling working without upgrading local http", () => {
  const policy = buildContentSecurityPolicy("n", true);
  assert.match(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("nonces are random and unguessable", () => {
  const first = createNonce();
  assert.notEqual(first, createNonce());
  assert.ok(Buffer.from(first, "base64").length >= 16);
});
