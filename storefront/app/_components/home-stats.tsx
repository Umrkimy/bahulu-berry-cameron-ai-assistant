"use client";

import { draftStats, homeCopy, stats } from "../_lib/content";
import { useLocale } from "./locale-provider";
import { CountUp, Stagger, StaggerItem } from "./motion";

export function HomeStats({ showDraft }: { showDraft: boolean }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const items = showDraft ? [...stats, ...draftStats] : stats;
  return <section className="home-stats" aria-labelledby="stats-title">
    <div className="shell">
      <h2 id="stats-title" className="sr-only">{text.statsTitle}</h2>
      <Stagger as="dl" className="stats-grid">
        {items.map((item) => <StaggerItem key={item.label.en} className="stat">
          <dt>{item.label[locale]}</dt>
          <dd><CountUp value={item.value} /></dd>
        </StaggerItem>)}
      </Stagger>
    </div>
  </section>;
}
