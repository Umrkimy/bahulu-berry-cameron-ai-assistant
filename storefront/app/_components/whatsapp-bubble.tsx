"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import { homeCopy } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";

export function WhatsAppBubble() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const number = whatsAppNumber();
  // The cart has its own WhatsApp order button.
  if (!number || pathname === "/cart" || pathname === "/checkout") return null;
  const label = homeCopy[locale].chat;
  const message = locale === "ms" ? "Hai Bahulu Berry Cameron, saya ada soalan." : "Hello Bahulu Berry Cameron, I have a question.";
  return <a className="chat-bubble" href={whatsAppUrl(number, message)} target="_blank" rel="noreferrer" aria-label={label}>
    <span className="chat-bubble-label" aria-hidden="true">{label}</span>
    <span className="chat-bubble-mascot"><Image src="/concept/brand-preview.webp" alt="" width={120} height={120} /></span>
  </a>;
}
