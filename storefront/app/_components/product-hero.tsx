"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useState, type PointerEvent } from "react";

import type { StorefrontProduct } from "../_lib/types";
import { productMediaUrl } from "../_lib/product-media";
import { homeCopy } from "../_lib/content";
import { useLocale } from "./locale-provider";

const spring = { stiffness: 140, damping: 16, mass: 0.6 };

export function ProductHero({ product }: { product: StorefrontProduct | null }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const [imageFailed, setImageFailed] = useState(false);
  const src = productMediaUrl(product?.image_path ?? null);
  const name = product ? (locale === "ms" ? product.name_ms : product.name_en) : null;
  const useFallbackArtwork = imageFailed || !src;

  // Pointer position in the stage, -1..1 on each axis, smoothed by springs.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-18, 18]), spring);
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [14, -14]), spring);
  const shiftX = useSpring(useTransform(pointerX, [-1, 1], [-14, 14]), spring);
  const shadowX = useSpring(useTransform(pointerX, [-1, 1], [22, -22]), spring);

  function track(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)));
    pointerY.set(Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)));
  }
  function reset() { pointerX.set(0); pointerY.set(0); }

  const heroImage = useFallbackArtwork ? (
    <Image src="/concept/bahulu-bag.webp" alt={text.imageAlt} width={900} height={1350} sizes="(max-width: 760px) 70vw, 420px" loading="eager" className="hero-product-image hero-fallback-image" />
  ) : (
    <Image src={src} alt={name ?? ""} width={900} height={1350} unoptimized sizes="(max-width: 760px) 85vw, 520px" loading="eager" className="hero-product-image" onError={() => setImageFailed(true)} />
  );

  return (
    <figure className="product-stage" onPointerMove={track} onPointerLeave={reset}>
      <motion.div className="product-3d" style={{ rotateX, rotateY, x: shiftX, transformPerspective: 1100 }}
        initial={{ opacity: 0, scale: 0.86, y: 60 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.25 }}>
        <motion.div className="product-float" animate={{ y: [0, -18, 0], rotateZ: [-2.5, 2, -2.5], rotateY: [-9, 9, -9] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
          {product ? <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">{heroImage}</Link> : heroImage}
        </motion.div>
      </motion.div>
      <motion.div className="product-shadow" aria-hidden="true" style={{ x: shadowX }} animate={{ scaleX: [1, 0.82, 1], opacity: [0.55, 0.32, 0.55] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      {product && name ? <figcaption className="stage-caption"><Link href={`/products/${product.id}`}>{name}</Link></figcaption> : null}
    </figure>
  );
}
