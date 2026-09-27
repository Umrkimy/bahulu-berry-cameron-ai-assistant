"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { homeCopy } from "../_lib/content";
import type { BilingualText, HomepageContent } from "../_lib/types";
import { GoogleSections } from "./google-sections";
import { useLocale } from "./locale-provider";

export function HomeContent({ children, hero, content }: { children: ReactNode; hero: ReactNode; content: HomepageContent }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const pick = (value: BilingualText) => value[locale];

  return (
    <div className="home-concept">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker"><span aria-hidden="true" />{pick(content.hero.eyebrow)}</p>
            <h1 id="home-title">{pick(content.hero.title_primary)}<br /><em>{pick(content.hero.title_accent)}</em><br />{pick(content.hero.title_suffix)}</h1>
            <p className="home-intro">{pick(content.hero.body)}</p>
            <Link href="/products" className="home-button">{pick(content.hero.cta_label)}<span aria-hidden="true">↗</span></Link>
            <a className="hero-scroll" href="#collection"><span aria-hidden="true">↓</span>{text.explore}</a>
          </div>
          {hero}
        </div>
        <div className="hero-bottom shell"><span>BAHULU BERRY CAMERON</span><span>{text.previewShort} <span aria-hidden="true">✳</span></span></div>
      </section>

      {content.benefits.enabled ? <section className="shell home-benefits" aria-labelledby="benefits-title">
        <div className="home-section-heading"><div><p className="home-kicker">{pick(content.benefits.eyebrow)}</p><h2 id="benefits-title">{pick(content.benefits.title)}</h2></div></div>
        <div className="benefit-grid">{content.benefits.items.map((item, index) => <article className="benefit-card" key={index}><span aria-hidden="true">0{index + 1}</span><h3>{pick(item.title)}</h3><p>{pick(item.body)}</p></article>)}</div>
      </section> : null}

      <section id="collection" className="shell home-collection" aria-labelledby="collection-title">
        <div className="home-section-heading">
          <div><p className="home-kicker">{pick(content.collection.eyebrow)}</p><h2 id="collection-title">{pick(content.collection.title)}<span aria-hidden="true"> ✳</span></h2></div>
          <Link href="/products" className="home-text-link">{pick(content.collection.view_all_label)}<span aria-hidden="true">↗</span></Link>
        </div>
        {children}
      </section>

      <section className="shell home-story" aria-labelledby="story-title">
        <div className="story-art" aria-hidden="true">
          <span className="story-orbit" />
          <Image src="/concept/brand-preview.webp" alt="" width={400} height={400} className="story-mascot" />
          <span className="story-spark">✳</span>
          <span className="story-sticker">HELLO,<br />CAMERON!</span>
        </div>
        <div className="story-copy">
          <p className="home-kicker">{pick(content.story.eyebrow)}</p>
          <h2 id="story-title">{pick(content.story.title)}</h2>
          <p>{pick(content.story.body)}</p>
          <Link href="/about" className="home-text-link">{pick(content.story.cta_label)}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <GoogleSections content={content} />

      <section className="home-closing" aria-labelledby="closing-title"><div className="shell home-closing-inner"><div><p className="home-kicker">{pick(content.closing.eyebrow)}</p><h2 id="closing-title">{pick(content.closing.title)}</h2><p>{pick(content.closing.body)}</p></div><Link href="/products" className="home-button">{pick(content.closing.cta_label)}<span aria-hidden="true">↗</span></Link></div></section>
      <p className="shell home-concept-note">{text.conceptNote}</p>
    </div>
  );
}
