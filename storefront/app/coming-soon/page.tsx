import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import "./coming-soon.css";
import { comingSoonHeader } from "../_lib/coming-soon";
import { homeCopy } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";

export const metadata: Metadata = { title: "Coming soon", robots: { index: false, follow: false } };

export default async function ComingSoonPage() {
  if ((await headers()).get(comingSoonHeader) !== "1") notFound();
  const number = whatsAppNumber();
  return <section className="coming-soon">
    <Image src="/concept/brand-preview.webp" alt="" width={220} height={220} priority className="coming-soon-mascot" />
    <h1>Bahulu Berry Cameron</h1>
    <p className="coming-soon-lead">Our new website is coming soon.</p>
    <p className="coming-soon-lead" lang="ms">Laman web baharu kami akan dibuka tidak lama lagi.</p>
    {number ? <div className="coming-soon-actions">
      <a className="coming-soon-whatsapp" href={whatsAppUrl(number, "")} target="_blank" rel="noreferrer">{homeCopy.en.chat}</a>
      <a className="coming-soon-whatsapp secondary" href={whatsAppUrl(number, "")} target="_blank" rel="noreferrer" lang="ms">{homeCopy.ms.chat}</a>
    </div> : null}
  </section>;
}
