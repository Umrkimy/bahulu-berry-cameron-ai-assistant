"use client";

import Link from "next/link";
import { productCopy } from "../_lib/product-view";
import { useLocale } from "./locale-provider";

export function StorefrontState({ kind, retry }: { kind: "loading" | "error" | "missing"; retry?: () => void }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  const body = text[`${kind}Body`];
  return <div className="shell shop-state" role={kind === "loading" ? "status" : undefined} aria-busy={kind === "loading"}>
    <h1>{text[kind]}</h1>{body ? <p>{body}</p> : null}
    {kind === "error" ? <button type="button" className="home-button" onClick={retry}>{text.retry}</button> : kind === "missing" ? <Link href="/products" className="home-button">{text.back}</Link> : null}
  </div>;
}
