import assert from "node:assert/strict";
import test from "node:test";

import { showDraftContent } from "../app/_lib/draft-content.ts";
import { faqItems } from "../app/_lib/faq.ts";
import { findPolicy, policies } from "../app/_lib/policies.ts";

const bilingual = (text) => Boolean(text?.en?.trim() && text?.ms?.trim());

test("draft content stays hidden unless the flag is exactly true", () => {
  const previous = process.env.STOREFRONT_DRAFT_CONTENT;
  for (const value of [undefined, "", "false", "1", "TRUE"]) {
    if (value === undefined) delete process.env.STOREFRONT_DRAFT_CONTENT;
    else process.env.STOREFRONT_DRAFT_CONTENT = value;
    assert.equal(showDraftContent(), false, `flag=${value}`);
  }
  process.env.STOREFRONT_DRAFT_CONTENT = "true";
  assert.equal(showDraftContent(), true);
  if (previous === undefined) delete process.env.STOREFRONT_DRAFT_CONTENT;
  else process.env.STOREFRONT_DRAFT_CONTENT = previous;
});

test("every FAQ entry is bilingual and some answers are always shown", () => {
  assert.ok(faqItems.every((item) => bilingual(item.question) && bilingual(item.answer)));
  assert.ok(faqItems.some((item) => !item.draft));
});

test("FAQ makes no halal or allergen claims", () => {
  for (const item of faqItems) assert.doesNotMatch(`${item.answer.en} ${item.answer.ms}`, /\b(is|are|adalah) halal\b|allergen[- ]free|bebas alergen/i);
});

test("the four policies exist and every section is bilingual", () => {
  assert.deepEqual(policies.map((policy) => policy.slug), ["terms", "privacy", "shipping", "refunds"]);
  for (const policy of policies) {
    assert.ok(bilingual(policy.title) && bilingual(policy.intro), policy.slug);
    for (const section of policy.sections) {
      assert.ok(bilingual(section.heading), `${policy.slug}: heading`);
      for (const text of [...(section.paragraphs ?? []), ...(section.list ?? [])]) assert.ok(bilingual(text), `${policy.slug}: ${section.heading.en}`);
    }
  }
  assert.equal(findPolicy("../secrets"), undefined);
});
