"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

import { homeCopy } from "../_lib/content";
import { useLocale } from "./locale-provider";

const spring = { stiffness: 140, damping: 16, mass: 0.6 };

// The hero is fixed brand artwork, not a product photo, so it never changes
// with the catalogue. Replace the file to update it (e.g. a later 3D render).
export function ProductHero() {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  // Reduced motion: no idle float and no pointer tilt, just a still product.
  const reduce = useReducedMotion();

  // Pointer position in the stage, -1..1 on each axis, smoothed by springs.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-18, 18]), spring);
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [14, -14]), spring);
  const shiftX = useSpring(useTransform(pointerX, [-1, 1], [-14, 14]), spring);
  const shadowX = useSpring(useTransform(pointerX, [-1, 1], [22, -22]), spring);

  function track(event: PointerEvent<HTMLElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)));
    pointerY.set(Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)));
  }
  function reset() { pointerX.set(0); pointerY.set(0); }


  return (
    <figure className="product-stage" onPointerMove={track} onPointerLeave={reset}>
      <motion.div className="product-3d" style={{ rotateX, rotateY, x: shiftX, transformPerspective: 1100 }}
        initial={{ opacity: 0, scale: 0.86, y: 60 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.25 }}>
        <motion.div className="product-float" animate={reduce ? undefined : { y: [0, -18, 0], rotateZ: [-2.5, 2, -2.5], rotateY: [-9, 9, -9] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
          <Image src="/concept/bahulu-bag.webp" alt={text.imageAlt} width={900} height={1350} sizes="(max-width: 760px) 70vw, 420px" loading="eager" className="hero-product-image hero-fallback-image" />
        </motion.div>
      </motion.div>
      <motion.div className="product-shadow" aria-hidden="true" style={{ x: shadowX }} animate={reduce ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.55, 0.32, 0.55] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
    </figure>
  );
}
