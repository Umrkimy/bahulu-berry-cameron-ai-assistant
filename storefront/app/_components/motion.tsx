"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const easeOut = [0.16, 1, 0.3, 1] as const;
const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

// Honours the visitor's "reduce motion" setting for every animation below.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Content is always rendered visible, so the page reads without JavaScript.
// After hydration, only elements that start below the fold are hidden, then
// revealed as they scroll in. Anything already on screen stays put.
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, viewport);
  const [belowFold, setBelowFold] = useState(false);
  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    if (top > window.innerHeight) setBelowFold(true);
  }, []);
  return { ref, state: belowFold && !inView ? "hidden" : "shown" } as const;
}

const instant = { duration: 0 } as const;

// Fades and lifts content in once it scrolls into view.
// `decorative` hides the block from assistive technology (artwork only).
export function Reveal({ children, className, delay = 0, y = 32, decorative = false }: { children: ReactNode; className?: string; delay?: number; y?: number; decorative?: boolean }) {
  const { ref, state } = useScrollReveal();
  const variants: Variants = {
    hidden: { opacity: 0, y, transition: instant },
    shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut, delay } },
  };
  return <motion.div ref={ref} className={className} aria-hidden={decorative || undefined} variants={variants} initial={false} animate={state}>{children}</motion.div>;
}

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.09 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.97, transition: instant },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

// A list whose children pop in one after another.
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "dl" }) {
  const { ref, state } = useScrollReveal();
  const Component = as === "ul" ? motion.ul : as === "dl" ? motion.dl : motion.div;
  // The ref only reads the element's position, so the div type is safe for ul/dl too.
  return <Component ref={ref as never} className={className} variants={group} initial={false} animate={state}>{children}</Component>;
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const Component = as === "li" ? motion.li : as === "article" ? motion.article : motion.div;
  return <Component className={className} variants={item}>{children}</Component>;
}

// Headline lines that rise from behind a mask, one after another. The motion
// is CSS (`.pop-line-inner` in globals.css) so it plays on first paint and the
// text is never hidden if JavaScript is slow or fails.
export function PopLines({ lines }: { lines: ReactNode[] }) {
  return <>{lines.map((line, index) => <span key={index} className="pop-line">
    <span className="pop-line-inner" style={{ "--line": index } as CSSProperties}>{line}</span>
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
