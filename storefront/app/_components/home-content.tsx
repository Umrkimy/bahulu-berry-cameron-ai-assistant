"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { BilingualText, HomepageContent } from "../_lib/types";
import { GoogleSections } from "./google-sections";
import { useLocale } from "./locale-provider";

export function HomeContent({ children, hero, stats, videos, content }: { children: ReactNode; hero: ReactNode; stats: ReactNode; videos: ReactNode; content: HomepageContent }) {
  const { locale } = useLocale();
  const pick = (value: BilingualText) => value[locale];

  return (
    <div className="home-concept">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <h1 id="home-title">{pick(content.hero.title_primary)}<br /><em>{pick(content.hero.title_accent)}</em><br />{pick(content.hero.title_suffix)}</h1>
            <p className="home-intro">{pick(content.hero.body)}</p>
            <Link href="/products" className="home-button">{pick(content.hero.cta_label)}</Link>
          </div>
          {hero}
        </div>
      </section>

      {stats}

      {content.benefits.enabled ? <section className="shell home-benefits" aria-labelledby="benefits-title">
        <div className="home-section-heading"><h2 id="benefits-title">{pick(content.benefits.title)}</h2></div>
        <div className="benefit-grid">{content.benefits.items.map((item, index) => <article className="benefit-card" key={index}><h3>{pick(item.title)}</h3><p>{pick(item.body)}</p></article>)}</div>
      </section> : null}

      <section id="collection" className="shell home-collection" aria-labelledby="collection-title">
        <div className="home-section-heading">
          <h2 id="collection-title">{pick(content.collection.title)}</h2>
          <Link href="/products" className="home-text-link">{pick(content.collection.view_all_label)}</Link>
        </div>
        {children}
      </section>

      <section className="shell home-story" aria-labelledby="story-title">
        <div className="story-art" aria-hidden="true">
          <Image src="/concept/brand-preview.webp" alt="" width={400} height={400} className="story-mascot" />
          <span className="story-sticker">{locale === "ms" ? "Hai, Cameron!" : "Hello, Cameron!"}</span>
        </div>
        <div className="story-copy">
          <h2 id="story-title">{pick(content.story.title)}</h2>
          <p>{pick(content.story.body)}</p>
          <Link href="/about" className="home-text-link">{pick(content.story.cta_label)}</Link>
        </div>
      </section>

      {videos}

      <GoogleSections content={content} />

      <section className="home-closing" aria-labelledby="closing-title"><div className="shell home-closing-inner"><div><h2 id="closing-title">{pick(content.closing.title)}</h2><p>{pick(content.closing.body)}</p></div><Link href="/products" className="home-button">{pick(content.closing.cta_label)}</Link></div></section>
    </div>
  );
}
