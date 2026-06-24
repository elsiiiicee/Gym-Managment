"use client";

import * as React from "react";

interface UseCountUpOptions {
  duration?: number;
  format?: (n: number) => string;
  restartKey?: number;
}

export function useCountUp(
  target: number,
  {
    duration = 1100,
    format = (n) => Math.round(n).toLocaleString(),
    restartKey = 0,
  }: UseCountUpOptions = {}
): string {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, restartKey]);

  return format(value);
}
