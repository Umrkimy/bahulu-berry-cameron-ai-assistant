"use client";
import { useState } from "react";
import type { StorefrontProduct } from "../_lib/types";
import { ProductArtwork } from "./product-artwork";
import { useLocale } from "./locale-provider";

export function ProductGallery({ product }: { product: StorefrontProduct }) {
  const { locale } = useLocale();
  const [selected, setSelected] = useState<number | null>(null);
  const images = product.images ?? [];
  const active = images.find(image => image.id === selected) ?? images[0];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  return <div className="shop-detail-visual">
    <div className="shop-detail-image"><span className="detail-image-kicker" aria-hidden="true">BAHULU BERRY CAMERON</span><ProductArtwork key={active?.id ?? "empty"} imagePath={active?.image_path ?? product.image_path} name={name} detail /><span className="detail-image-spark" aria-hidden="true">✳</span></div>
    {images.length > 1 ? <div className="product-thumbnails" role="group" aria-label={locale === "ms" ? "Foto produk" : "Product photos"}>{images.map((image, index) => <button type="button" key={image.id} aria-label={`${locale === "ms" ? "Lihat foto" : "View photo"} ${index + 1}`} aria-pressed={image.id === active?.id} onClick={() => setSelected(image.id)}><ProductArtwork imagePath={image.image_path} name={`${name}, ${index + 1}`} /></button>)}</div> : null}
  </div>;
}
