"use client";

import Link from "next/link";

import { copy } from "../_lib/content";
import { findPolicy, policyPending, policyUpdated, type PolicySlug } from "../_lib/policies";
import { useLocale } from "./locale-provider";

export function PolicyPage({ slug, showDraft }: { slug: PolicySlug; showDraft: boolean }) {
  const { locale } = useLocale();
  const policy = findPolicy(slug);
  if (!policy) return null;
  return <div className="info-concept">
    <section className="info-hero"><div className="shell">
      <nav className="shop-breadcrumb" aria-label={locale === "ms" ? "Jejak navigasi" : "Breadcrumb"}><Link href="/">{copy[locale].home}</Link><span aria-hidden="true">/</span><span aria-current="page">{policy.title[locale]}</span></nav>
      <div className="policy-hero"><h1>{policy.title[locale]}</h1>{showDraft ? <p className="policy-updated">{policyUpdated[locale]}</p> : null}</div>
    </div></section>
    {!showDraft ? <article className="shell policy-body">
      <p className="policy-intro">{policyPending[locale]}</p>
    </article> : <article className="shell policy-body">
      <p className="policy-intro">{policy.intro[locale]}</p>
      {policy.sections.map((section) => <section key={section.heading.en}>
        <h2>{section.heading[locale]}</h2>
        {section.paragraphs?.map((paragraph) => <p key={paragraph.en}>{paragraph[locale]}</p>)}
        {section.list ? <ul>{section.list.map((item) => <li key={item.en}>{item[locale]}</li>)}</ul> : null}
      </section>)}
    </article>}
  </div>;
}
