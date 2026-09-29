"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import type { BilingualText, HomepageContent } from "../_lib/types";
import { GoogleSections } from "./google-sections";
import { useLocale } from "./locale-provider";
import { PopLines, Reveal } from "./motion";

// Follows the story art's reveal: the sticker slaps on just after the mascot fades in.
const sticker: Variants = {
  hidden: { scale: 0, rotate: -40, transition: { duration: 0 } },
  shown: { scale: 1, rotate: -10, transition: { type: "spring", stiffness: 260, damping: 11, delay: 0.45 } },
};

export function HomeContent({ children, hero, stats, videos, faq, content }: { children: ReactNode; hero: ReactNode; stats: ReactNode; videos: ReactNode; faq: ReactNode; content: HomepageContent }) {
  const { locale } = useLocale();
  const pick = (value: BilingualText) => value[locale];

  return (
    <div className="home-concept">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <h1 id="home-title" aria-label={`${pick(content.hero.title_primary)} ${pick(content.hero.title_accent)} ${pick(content.hero.title_suffix)}`}>
              <span aria-hidden="true"><PopLines lines={[pick(content.hero.title_primary), <em key="accent">{pick(content.hero.title_accent)}</em>, pick(content.hero.title_suffix)]} /></span>
            </h1>
            <div className="arrive">
              <p className="home-intro">{pick(content.hero.body)}</p>
              <Link href="/products" className="home-button">{pick(content.hero.cta_label)}</Link>
            </div>
          </div>
          {hero}
        </div>
      </section>

      {stats}

      {content.benefits.enabled ? <section className="shell home-benefits" aria-labelledby="benefits-title">
        <Reveal className="home-section-heading"><h2 id="benefits-title">{pick(content.benefits.title)}</h2></Reveal>
        <div className="benefit-grid">{content.benefits.items.map((item, index) => <article className="benefit-card" key={index}><h3>{pick(item.title)}</h3><p>{pick(item.body)}</p></article>)}</div>
      </section> : null}

      <section id="collection" className="shell home-collection" aria-labelledby="collection-title">
        <Reveal className="home-section-heading">
          <h2 id="collection-title">{pick(content.collection.title)}</h2>
          <Link href="/products" className="home-text-link">{pick(content.collection.view_all_label)}</Link>
        </Reveal>
        {children}
      </section>

      <section className="shell home-story" aria-labelledby="story-title">
        <Reveal className="story-art" y={0} decorative>
          <motion.div className="story-mascot-wrap" whileHover={{ rotate: -3, scale: 1.04 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
            <Image src="/concept/brand-preview.webp" alt="" width={400} height={400} className="story-mascot" />
          </motion.div>
          <motion.span className="story-sticker" variants={sticker}>{locale === "ms" ? "Hai, Cameron!" : "Hello, Cameron!"}</motion.span>
        </Reveal>
        <Reveal className="story-copy" delay={0.1}>
          <h2 id="story-title">{pick(content.story.title)}</h2>
          <p>{pick(content.story.body)}</p>
          <Link href="/about" className="home-text-link">{pick(content.story.cta_label)}</Link>
        </Reveal>
      </section>

      {videos}

      <GoogleSections content={content} />

      {faq}

      <section className="home-closing" aria-labelledby="closing-title"><Reveal className="shell home-closing-inner"><div><h2 id="closing-title">{pick(content.closing.title)}</h2><p>{pick(content.closing.body)}</p></div><Link href="/products" className="home-button">{pick(content.closing.cta_label)}</Link></Reveal></section>
    </div>
  );
}
