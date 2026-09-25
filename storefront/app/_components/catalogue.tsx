"use client";

import { useMemo, useState } from "react";
import { filterProducts, productCopy, type ProductSort } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductCard } from "./product-card";

export function Catalogue({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<ProductSort>("name");
  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter((value): value is string => Boolean(value)))], [products]);
  const visible = useMemo(() => filterProducts(products, locale, query, category, sort), [products, locale, query, category, sort]);
  const filtered = query.trim() !== "" || category !== null;
  const clear = () => { setQuery(""); setCategory(null); };

  return <section className="catalogue-browser" aria-label={text.products}>
    {products.length > 0 ? <>
      <div className="catalogue-toolbar">
        <label className="catalogue-search"><span aria-hidden="true">⌕</span><span className="sr-only">{text.search}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} /></label>
        <label className="catalogue-sort"><span>{text.sort}</span><select value={sort} onChange={event => setSort(event.target.value as ProductSort)}><option value="name">{text.nameSort}</option><option value="price-low">{text.lowSort}</option><option value="price-high">{text.highSort}</option></select></label>
      </div>
      <div className="catalogue-filter-row">
        <div className="catalogue-tabs" role="group" aria-label={text.categories}><button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>{text.all}</button>{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <p className="catalogue-count" role="status" aria-live="polite">{locale === "ms" ? `${visible.length} produk` : `${visible.length} ${visible.length === 1 ? "product" : "products"}`}</p>
      </div>
    </> : null}
    {visible.length ? <div className="catalogue-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="catalogue-empty"><span aria-hidden="true">✳</span><h2>{products.length ? text.noMatches : text.empty}</h2><p>{products.length ? text.noMatchesBody : text.emptyBody}</p>{filtered ? <button type="button" className="home-button" onClick={clear}>{text.clear}<span aria-hidden="true">↗</span></button> : null}</div>}
    {visible.length > 0 && filtered ? <button type="button" className="home-text-link catalogue-clear" onClick={clear}>{text.clear}<span aria-hidden="true">×</span></button> : null}
  </section>;
}
