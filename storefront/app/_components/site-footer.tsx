"use client";

import Image from "next/image";
import Link from "next/link";

import { business, copy, social } from "../_lib/content";
import { policies } from "../_lib/policies";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";
import { SocialIcon } from "./social-icons";

// Legal links always show; until the client approves the policies, each page
// says it is being prepared (see app/policies/[slug]/page.tsx).
export function SiteFooter({ showTracking }: { showTracking: boolean }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const number = whatsAppNumber();
  const ms = locale === "ms";
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div className="footer-brand">
        <Link href="/" className="footer-logo"><Image src="/concept/brand-preview.webp" alt="" width={56} height={56} /><span>Bahulu Berry Cameron</span></Link>
        <p>{text.aboutText}</p>
        <ul className="footer-social" aria-label={ms ? "Media sosial" : "Social media"}>
          <li><a href={social.tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok"><SocialIcon name="tiktok" /></a></li>
          <li><a href={social.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><SocialIcon name="facebook" /></a></li>
          {number ? <li><a href={whatsAppUrl(number, "")} target="_blank" rel="noreferrer" aria-label="WhatsApp"><SocialIcon name="whatsapp" /></a></li> : null}
        </ul>
      </div>
      <div className="footer-col">
        <h2>{text.visitTitle}</h2>
        <address>{business.addressLines.map((line) => <span key={line}>{line}</span>)}</address>
        <p>{business.hours[locale]}</p>
      </div>
      <nav className="footer-col" aria-labelledby="footer-links-title">
        <h2 id="footer-links-title">{ms ? "Pautan pantas" : "Quick links"}</h2>
        <ul>
          <li><Link href="/">{text.home}</Link></li>
          <li><Link href="/products">{text.navProducts}</Link></li>
          <li><Link href="/about">{text.navAbout}</Link></li>
          <li><Link href="/#faq">{ms ? "Soalan lazim" : "FAQ"}</Link></li>
          <li><Link href="/cart">{ms ? "Troli" : "Cart"}</Link></li>
          {showTracking ? <li><Link href="/orders/find">{ms ? "Jejak pesanan" : "Track my order"}</Link></li> : null}
        </ul>
      </nav>
      <nav className="footer-col" aria-labelledby="footer-legal-title">
        <h2 id="footer-legal-title">{ms ? "Undang-undang" : "Legal"}</h2>
        <ul>{policies.map((policy) => <li key={policy.slug}><Link href={`/policies/${policy.slug}`}>{policy.title[locale]}</Link></li>)}</ul>
      </nav>
    </div>
    <div className="footer-bottom"><div className="shell"><p>© {new Date().getFullYear()} Bahulu Berry Cameron. {ms ? "Hak cipta terpelihara." : "All rights reserved."}</p></div></div>
  </footer>;
}
