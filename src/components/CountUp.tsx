"use client";
import { useEffect, useState } from "react";

/** Cuenta de 0 a `end` con easing al montar. */
export default function CountUp({
  end,
  dur = 900,
  className,
}: {
  end: number;
  dur?: number;
  className?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(end * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, dur]);
  return <span className={className}>{v.toLocaleString("es-AR")}</span>;
}
