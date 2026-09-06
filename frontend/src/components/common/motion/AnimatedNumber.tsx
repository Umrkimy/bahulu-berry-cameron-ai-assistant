import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type NumberFormat = "currency" | "number" | "percent";

interface AnimatedNumberProps {
  value: number;
  format?: NumberFormat;
  decimals?: number;
}

const formatters = {
  currency: new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  number: new Intl.NumberFormat("en-MY"),
  percent: new Intl.NumberFormat("en-MY", { style: "percent", maximumFractionDigits: 0 }),
};

export default function AnimatedNumber({ value, format = "number", decimals = 0 }: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useMotionValueEvent(motionValue, "change", setDisplayValue);

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, { duration: 0.64, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [motionValue, reducedMotion, value]);

  if (format === "percent") return <>{formatters.percent.format(displayValue / 100)}</>;
  if (format === "currency") return <>{formatters.currency.format(displayValue)}</>;
  return <>{new Intl.NumberFormat("en-MY", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(displayValue)}</>;
}
