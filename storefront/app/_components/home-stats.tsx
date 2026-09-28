"use client";

import { homeCopy, placeholderStats, stats } from "../_lib/content";
import { useLocale } from "./locale-provider";

export function HomeStats({ showPlaceholders }: { showPlaceholders: boolean }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const items = showPlaceholders ? [...stats, ...placeholderStats] : stats;
  return <section className="home-stats" aria-labelledby="stats-title">
    <div className="shell">
      <h2 id="stats-title" className="sr-only">{text.statsTitle}</h2>
      <dl className="stats-grid">
        {items.map((item) => <div key={item.label.en} className={item.placeholder ? "stat is-placeholder" : "stat"}>
          <dt>{item.label[locale]}{item.placeholder ? <span className="stat-flag">{text.placeholder}</span> : null}</dt>
          <dd>{item.value}</dd>
        </div>)}
      </dl>
      <p className="stats-source">{text.statsSource}</p>
    </div>
  </section>;
}
