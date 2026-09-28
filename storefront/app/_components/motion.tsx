"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const easeOut = [0.16, 1, 0.3, 1] as const;
const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

// Honours the visitor's "reduce motion" setting for every animation below.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Fades and lifts content in once it scrolls into view.
export function Reveal({ children, className, delay = 0, y = 32 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={viewport} transition={{ duration: 0.8, ease: easeOut, delay }}>{children}</motion.div>;
}

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.09 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

// A list whose children pop in one after another.
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "dl" }) {
  const Component = as === "ul" ? motion.ul : as === "dl" ? motion.dl : motion.div;
  return <Component className={className} variants={group} initial="hidden" whileInView="shown" viewport={viewport}>{children}</Component>;
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const Component = as === "li" ? motion.li : as === "article" ? motion.article : motion.div;
  return <Component className={className} variants={item}>{children}</Component>;
}

// Headline lines that spring up from behind a mask, one after another.
export function PopLines({ lines, delay = 0 }: { lines: ReactNode[]; delay?: number }) {
  return <>{lines.map((line, index) => <span key={index} className="pop-line">
    <motion.span className="pop-line-inner" initial={{ y: "105%", rotate: 4 }} animate={{ y: "0%", rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16, delay: delay + index * 0.12 }}>{line}</motion.span>
  </span>)}</>;
}

// "27.5K" -> counts 0 → 27.5 and keeps the suffix. Renders the real value first,
// so the number is correct without JavaScript or with reduced motion.
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  useEffect(() => {
    const match = /^([\d.]+)(.*)$/.exec(value);
    if (!match || reduce || !ref.current) return;
    ref.current.textContent = `0${match[2]}`;
  }, [value, reduce]);

  useEffect(() => {
    const match = /^([\d.]+)(.*)$/.exec(value);
    if (!match || reduce || !inView) return;
    const target = Number(match[1]);
    const decimals = match[1].includes(".") ? match[1].split(".")[1].length : 0;
    const controls = animate(0, target, {
      duration: 1.6, ease: easeOut,
      onUpdate: (latest) => { if (ref.current) ref.current.textContent = `${latest.toFixed(decimals)}${match[2]}`; },
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref}>{value}</span>;
}
