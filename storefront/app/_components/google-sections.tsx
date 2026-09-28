"use client";

import { useEffect, useState } from "react";

import type { BilingualText, HomepageContent, StorefrontPlace } from "../_lib/types";
import { useLocale } from "./locale-provider";

const ui = {
  en: { loading: "Loading verified Google information…", error: "Google information is temporarily unavailable.", retry: "Try again", google: "Google", reviews: "Read all reviews on Google", report: "Report review", translated: "Translated by Google", rating: "out of 5 stars", sorting: "Google selects and orders the reviews shown here.", mapTitle: "Google map for", mapError: "The map could not be loaded. Use directions instead." },
  ms: { loading: "Memuatkan maklumat Google yang disahkan…", error: "Maklumat Google tidak tersedia buat masa ini.", retry: "Cuba lagi", google: "Google", reviews: "Baca semua ulasan di Google", report: "Laporkan ulasan", translated: "Diterjemahkan oleh Google", rating: "daripada 5 bintang", sorting: "Google memilih dan menyusun ulasan yang dipaparkan di sini.", mapTitle: "Peta Google untuk", mapError: "Peta tidak dapat dimuatkan. Gunakan pautan arah sebagai gantinya." },
} as const;

export function GoogleSections({ content }: { content: HomepageContent }) {
  const { locale } = useLocale();
  const [place, setPlace] = useState<StorefrontPlace | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [resolvedLocale, setResolvedLocale] = useState<"en" | "ms" | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const enabled = content.reviews.enabled || content.location.enabled;
  const pick = (value: BilingualText) => value[locale];
  const labels = ui[locale];

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/storefront-data/place?locale=${locale}`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<StorefrontPlace>;
      })
      .then((data) => {
        setPlace(data);
        setResolvedLocale(locale);
        setState("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPlace(null);
        setResolvedLocale(locale);
        setState("error");
      });
    return () => controller.abort();
  }, [attempt, enabled, locale]);
  if (!enabled) return null;
  if (resolvedLocale !== locale || state === "loading" || state === "idle") return <section className="shell google-state" aria-live="polite">{labels.loading}</section>;
  if (state === "error" || !place) return <section className="shell google-state" aria-live="polite"><p>{labels.error}</p><button className="home-text-link" onClick={() => { setResolvedLocale(null); setState("loading"); setAttempt((value) => value + 1); }}>{labels.retry}</button></section>;

  return <>
    {content.reviews.enabled ? <section className="shell home-reviews" aria-labelledby="reviews-title">
      <div className="home-section-heading"><div><h2 id="reviews-title">{pick(content.reviews.title)}</h2></div><div className="google-rating"><strong>{place.rating?.toFixed(1) ?? "—"}</strong><span aria-label={`${place.rating ?? 0} ${labels.rating}`}>★</span><small>{place.review_count} · {labels.google}</small></div></div>
      <div className="review-grid">{place.reviews.map((review, index) => <article className="review-card" key={`${review.author_name}-${index}`}><div className="review-head"><div><strong>{review.author_uri ? <a href={review.author_uri} target="_blank" rel="noreferrer">{review.author_name}</a> : review.author_name}</strong><small>{review.relative_time}</small></div><span aria-label={`${review.rating} ${labels.rating}`}>{"★".repeat(Math.round(review.rating))}</span></div><p>{review.text}</p>{review.translated ? <small>{labels.translated}{review.original_language ? ` · ${review.original_language}` : ""}</small> : null}<div className="review-links">{review.review_uri ? <a href={review.review_uri} target="_blank" rel="noreferrer">{labels.google}</a> : null}{review.report_uri ? <a href={review.report_uri} target="_blank" rel="noreferrer">{labels.report}</a> : null}</div></article>)}</div>
      <div className="google-attribution"><span aria-label="Content provided by Google Maps">Google Maps</span><small>{labels.sorting}</small><a href={place.reviews_uri} target="_blank" rel="noreferrer">{labels.reviews} ↗</a></div>
    </section> : null}
    {content.location.enabled ? <section className="shell home-location" aria-labelledby="location-title"><div className="location-copy"><h2 id="location-title">{pick(content.location.title)}</h2><p>{place.display_name}<br />{place.formatted_address}</p><a className="home-text-link" href={place.directions_uri} target="_blank" rel="noreferrer">{pick(content.location.directions_label)} <span aria-hidden="true">↗</span></a></div><div className="map-panel">{!mapLoaded ? <button className="home-button" onClick={() => { setMapError(false); setMapLoaded(true); }}>{pick(content.location.load_map_label)}</button> : mapError ? <p>{labels.mapError} <button className="home-text-link" onClick={() => { setMapError(false); setMapLoaded(false); }}>{labels.retry}</button> <a href={place.directions_uri} target="_blank" rel="noreferrer">{pick(content.location.directions_label)}</a></p> : <iframe title={`${labels.mapTitle} ${place.display_name}`} src={`/storefront-data/map?locale=${locale}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onError={() => setMapError(true)} />}</div></section> : null}
  </>;
}
