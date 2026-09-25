"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { homeCopy } from "../_lib/content";
import { useLocale } from "./locale-provider";

export function HomeContent({ children, hero }: { children: ReactNode; hero: ReactNode }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];

  return (
    <div className="home-concept">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker"><span aria-hidden="true" />{text.eyebrow}</p>
            <h1 id="home-title">Bahulu.<br /><em>Berry.</em><br />Cameron<span className="title-dot">.</span></h1>
            <p className="home-intro">{text.intro}</p>
            <Link href="/products" className="home-button">{text.browse}<span aria-hidden="true">↗</span></Link>
            <a className="hero-scroll" href="#collection"><span aria-hidden="true">↓</span>{text.explore}</a>
          </div>
          {hero}
        </div>
        <div className="hero-bottom shell"><span>BAHULU BERRY CAMERON</span><span>{text.previewShort} <span aria-hidden="true">✳</span></span></div>
      </section>

      <section id="collection" className="shell home-collection" aria-labelledby="collection-title">
        <div className="home-section-heading">
          <div><p className="home-kicker">{text.collectionEyebrow}</p><h2 id="collection-title">{text.collectionTitle}<span aria-hidden="true"> ✳</span></h2></div>
          <Link href="/products" className="home-text-link">{text.viewAll}<span aria-hidden="true">↗</span></Link>
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
          <p className="home-kicker">{text.storyEyebrow}</p>
          <h2 id="story-title">{text.storyTitle}</h2>
          <p>{text.storyBody}</p>
          <Link href="/about" className="home-text-link">{text.about}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <p className="shell home-concept-note">{text.conceptNote}</p>
    </div>
  );
}
