"use client";

import { copy } from "../_lib/content";
import { useLocale } from "./locale-provider";
import { WhatsAppLink } from "./whatsapp-link";

export function InformationPage({ type }: { type: "pickup" | "about" }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const title = type === "pickup" ? text.pickupTitle : text.aboutTitle;
  const description = type === "pickup" ? text.pickupText : text.aboutText;
  return <section className="shell info-page"><p className="eyebrow">Bahulu Berry Cameron</p><h1 className="page-title">{title}</h1><p className="page-intro">{description}</p><div className="information-card"><h2>{text.contactTitle}</h2><p>{text.contactText}</p><WhatsAppLink /></div></section>;
}
