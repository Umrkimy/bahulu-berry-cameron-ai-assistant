"use client";

import Image from "next/image";
import { useState } from "react";

import { business, copy } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";
import { WhatsAppLink } from "./whatsapp-link";

export function AboutPage() {
  const { locale } = useLocale();
  const text = copy[locale];
  const number = whatsAppNumber();
  const [showMap, setShowMap] = useState(false);
  return <div className="info-concept">
    <section className="info-hero"><div className="shell info-hero-grid">
      <div><h1>{text.aboutTitle}</h1><p className="info-intro">{text.aboutText}</p></div>
      <Image src="/concept/brand-preview.webp" alt="" width={320} height={320} className="info-mascot" />
    </div></section>
    <section className="shell info-visit" aria-labelledby="visit-title">
      <div className="info-panel">
        <h2 id="visit-title">{text.visitTitle}</h2>
        <address>{business.addressLines.map((line) => <span key={line}>{line}</span>)}</address>
        <div className="info-hours"><h3>{text.hoursLabel}</h3><p>{business.hours[locale]}</p></div>
        <a className="home-text-link" href={business.mapsUrl} target="_blank" rel="noreferrer">{text.openMaps}<span aria-hidden="true">↗</span></a>
      </div>
      <div className="info-map">
        {showMap
          ? <iframe title={text.mapTitle} src={business.mapEmbedUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          : <div className="info-map-placeholder">
            <Image src="/concept/brand-preview.webp" alt="" width={120} height={120} />
            <button type="button" className="home-button" onClick={() => setShowMap(true)}>{text.showMap}</button>
            <p>{text.mapNote}</p>
          </div>}
      </div>
    </section>
    {number ? <section className="shell info-body">
      <div className="info-panel">
        <h2>{text.contactTitle}</h2>
        <p>{text.contactText}</p>
        <p className="info-phone">{text.whatsApp}: <a href={whatsAppUrl(number, "")} target="_blank" rel="noreferrer">{business.phoneDisplay}</a></p>
        <WhatsAppLink />
      </div>
    </section> : null}
  </div>;
}
