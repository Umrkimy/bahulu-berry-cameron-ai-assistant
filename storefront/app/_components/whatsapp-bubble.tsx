"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { homeCopy } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";

export function WhatsAppBubble() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const number = whatsAppNumber();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 320);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  // The cart and product pages have their own WhatsApp buttons.
  if (!number || pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/products/")) return null;
  const label = homeCopy[locale].chat;
  const message = locale === "ms" ? "Hai Bahulu Berry Cameron, saya ada soalan." : "Hello Bahulu Berry Cameron, I have a question.";
  return <a className="chat-bubble" data-compact={compact || undefined} href={whatsAppUrl(number, message)} target="_blank" rel="noreferrer" aria-label={label}>
    <span className="chat-bubble-label" aria-hidden="true">{label}</span>
    <span className="chat-bubble-mascot"><Image src="/concept/brand-preview.webp" alt="" width={120} height={120} /></span>
  </a>;
}
