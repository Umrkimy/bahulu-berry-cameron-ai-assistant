import { useEffect, useState } from "react";

export function useRetryCooldown() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  return {
    remainingSeconds,
    beginCooldown: (seconds?: number) => setRemainingSeconds(Math.max(0, seconds ?? 0)),
  };
}
