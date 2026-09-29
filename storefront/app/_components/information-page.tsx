"use client";

import Image from "next/image";

import { business, copy } from "../_lib/content";
import { whatsAppNumber } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";
import { WhatsAppLink } from "./whatsapp-link";
import { motion, useReducedMotion } from "motion/react";
import { PopLines, Reveal } from "./motion";

export function AboutPage() {
  const { locale } = useLocale();
  const text = copy[locale];
  const number = whatsAppNumber();
  const reduce = useReducedMotion();
  return <div className="info-concept">
    <section className="info-hero"><div className="shell info-hero-grid">
      <div><h1 aria-label={text.aboutTitle}><span aria-hidden="true"><PopLines lines={[text.aboutTitle]} /></span></h1><div className="arrive arrive-soon"><p className="info-intro">{text.aboutText}</p></div></div>
      <div className="arrive-mascot"><motion.div animate={reduce ? undefined : { y: [0, -10, 0], rotate: [6, 2, 6] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Image src="/concept/brand-preview.webp" alt="" width={320} height={320} className="info-mascot" priority /></motion.div></div>
    </div></section>
    <section className="shell info-visit" aria-labelledby="visit-title">
      <Reveal className="info-panel">
        <h2 id="visit-title">{text.visitTitle}</h2>
        <address>{business.addressLines.map((line) => <span key={line}>{line}</span>)}</address>
        <div className="info-hours"><h3>{text.hoursLabel}</h3><p>{business.hours[locale]}</p></div>
      </Reveal>
      <Reveal className="info-map" delay={0.1}>
        <iframe title={text.mapTitle} src={business.mapEmbedUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </Reveal>
    </section>
    {number ? <section className="shell info-body">
      <Reveal className="info-panel">
        <h2>{text.contactTitle}</h2>
        <p>{text.contactText}</p>
        <p className="info-phone">{text.whatsApp}: <strong>{business.phoneDisplay}</strong></p>
        <WhatsAppLink />
      </Reveal>
    </section> : null}
  </div>;
}
