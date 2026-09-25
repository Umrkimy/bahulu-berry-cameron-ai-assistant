"use client";

import Link from "next/link";
import { productCopy } from "../_lib/product-view";
import { useLocale } from "./locale-provider";

export function StorefrontState({ kind, retry }: { kind: "loading" | "error" | "missing"; retry?: () => void }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  return <div className="shell shop-state" role={kind === "loading" ? "status" : undefined} aria-busy={kind === "loading"}>
    <span aria-hidden="true">✳</span><h1>{text[kind]}</h1><p>{text[`${kind}Body`]}</p>
    {kind === "error" ? <button type="button" className="home-button" onClick={retry}>{text.retry}<span aria-hidden="true">↻</span></button> : kind === "missing" ? <Link href="/products" className="home-button">{text.back}<span aria-hidden="true">↗</span></Link> : null}
  </div>;
}
