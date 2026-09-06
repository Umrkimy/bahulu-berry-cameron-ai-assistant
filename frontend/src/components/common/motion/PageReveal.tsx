import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";

interface PageRevealProps {
  children: ReactNode;
  pageKey: string;
}

export default function PageReveal({ children, pageKey }: PageRevealProps) {
  const reducedMotion = useReducedMotion();

  return <m.div key={pageKey} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>{children}</m.div>;
}
