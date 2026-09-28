"use client";

import { faqItems } from "../_lib/faq";
import { useLocale } from "./locale-provider";
import { Reveal, Stagger, StaggerItem } from "./motion";

export function FaqSection({ showDraft }: { showDraft: boolean }) {
  const { locale } = useLocale();
  const items = faqItems.filter((item) => showDraft || !item.draft);
  return <section id="faq" className="shell home-faq" aria-labelledby="faq-title">
    <Reveal><h2 id="faq-title">{locale === "ms" ? "Soalan lazim" : "Frequently asked questions"}</h2></Reveal>
    <Stagger className="faq-list">
      {items.map((item) => <StaggerItem key={item.question.en}><details className="faq-item">
        <summary>{item.question[locale]}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></summary>
        <p>{item.answer[locale]}</p>
      </details></StaggerItem>)}
    </Stagger>
  </section>;
}
