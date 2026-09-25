"use client";

import Image from "next/image";
import Link from "next/link";
import type { StorefrontProduct } from "../_lib/types";
import { productMediaUrl } from "../_lib/product-media";
import { useRef, useState, type PointerEvent } from "react";

import { useLocale } from "./locale-provider";

export function ProductHero({ product }: { product: StorefrontProduct | null }) {
  const { locale } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);
  const artwork = useRef<HTMLDivElement>(null);
  const src = productMediaUrl(product?.image_path ?? null);
  const name = product ? (locale === "ms" ? product.name_ms : product.name_en) : "Bahulu Berry Cameron";

  function resetTilt() {
    artwork.current?.style.setProperty("--tilt-x", "0deg");
    artwork.current?.style.setProperty("--tilt-y", "0deg");
  }

  function tilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
      resetTilt();
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    artwork.current?.style.setProperty("--tilt-x", `${-y * 6}deg`);
    artwork.current?.style.setProperty("--tilt-y", `${x * 6}deg`);
  }

  return (
    <figure className="product-stage" onPointerMove={tilt} onPointerLeave={resetTilt} onPointerCancel={resetTilt}>
      <div className="stage-orbit orbit-one" aria-hidden="true" />
      <div className="stage-orbit orbit-two" aria-hidden="true" />
      <span className="stage-spark spark-one" aria-hidden="true">✳</span>
      <span className="stage-spark spark-two" aria-hidden="true">✦</span>
      <span className="stage-sticker" aria-hidden="true">BAHULU<br /><em>& berry</em></span>
      <div className="product-settle">
        <div className="product-tilt" ref={artwork}>
          {imageFailed || !src ? <div className="hero-image-fallback" role="img" aria-label="Bahulu Berry Cameron"><span aria-hidden="true">BB</span><p>Bahulu Berry Cameron</p></div> :
            <Link href={`/products/${product!.id}`}><Image src={src} alt={name} width={900} height={1350} unoptimized sizes="(max-width: 760px) 85vw, 520px" loading="eager" className="hero-product-image" onError={() => setImageFailed(true)} /></Link>}
        </div>
      </div>
      <figcaption className="stage-caption"><span aria-hidden="true">↳</span>{name}</figcaption>
    </figure>
  );
}
