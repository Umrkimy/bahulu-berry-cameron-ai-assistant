"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import type { BilingualText, HomepageContent } from "../_lib/types";
import { GoogleSections } from "./google-sections";
import { useLocale } from "./locale-provider";
import { easeOut, PopLines, Reveal } from "./motion";

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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: easeOut, delay: 0.55 }}>
              <p className="home-intro">{pick(content.hero.body)}</p>
              <Link href="/products" className="home-button">{pick(content.hero.cta_label)}</Link>
            </motion.div>
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
        <motion.div className="story-art" aria-hidden="true" initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{ duration: 0.9, ease: easeOut }}>
          <motion.div className="story-mascot-wrap" whileHover={{ rotate: -3, scale: 1.04 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
            <Image src="/concept/brand-preview.webp" alt="" width={400} height={400} className="story-mascot" />
          </motion.div>
          <motion.span className="story-sticker" initial={{ scale: 0, rotate: -40 }} whileInView={{ scale: 1, rotate: -10 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 260, damping: 11, delay: 0.45 }}>{locale === "ms" ? "Hai, Cameron!" : "Hello, Cameron!"}</motion.span>
        </motion.div>
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
