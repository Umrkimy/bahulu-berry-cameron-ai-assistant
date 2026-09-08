"use client";

import { useMemo, useState } from "react";

import { copy } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductCard } from "./product-card";

export function Catalogue({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))], [products]);
  const visibleProducts = useMemo(() => products.filter((product) => {
    const name = locale === "ms" ? product.name_ms : product.name_en;
    return (category === "ALL" || product.category === category) && name.toLowerCase().includes(query.trim().toLowerCase());
  }), [category, locale, products, query]);

  return <section className="catalogue-section"><div className="catalogue-controls"><label className="search-label"><span className="sr-only">Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ms" ? "Cari produk" : "Search products"} /></label>{categories.length > 1 ? <div className="filter-list" aria-label="Product categories"><button type="button" className={category === "ALL" ? "active" : ""} onClick={() => setCategory("ALL")}>{locale === "ms" ? "Semua" : "All"}</button>{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div> : null}</div>{visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><p>{text.noProducts}</p></div>}</section>;
}
