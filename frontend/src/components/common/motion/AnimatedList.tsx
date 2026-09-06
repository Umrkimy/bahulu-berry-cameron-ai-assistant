import type { ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

interface AnimatedListProps {
  children: ReactNode;
}

interface AnimatedListItemProps {
  children: ReactNode;
  itemKey: string | number;
}

export function AnimatedList({ children }: AnimatedListProps) {
  return <AnimatePresence initial={false} mode="popLayout">{children}</AnimatePresence>;
}

export function AnimatedListItem({ children, itemKey }: AnimatedListItemProps) {
  const reducedMotion = useReducedMotion();
  return <m.div key={itemKey} layout="position" initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>{children}</m.div>;
}
