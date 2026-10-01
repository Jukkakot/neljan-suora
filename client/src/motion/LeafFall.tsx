import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "./hooks.ts";
import styles from "./LeafFall.module.css";

/** A small seeded generator (mulberry32), so the leaves fall the same way every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LeafFallProps {
  /** How many leaves. */
  count?: number;
  /** How long until it is gone, in ms. */
  ms?: number;
  seed?: number;
}

/**
 * A one-off fall of leaves over the whole screen (colour `--leaf`), swaying as they drift down: fixed,
 * never takes the pointer, gone after `ms`. Not mounted at all when the device asks for reduced motion. Generic, a
 * candidate for the shared template.
 */
export function LeafFall({ count = 24, ms = 2500, seed = 7 }: LeafFallProps) {
  const [on, setOn] = useState(() => !prefersReducedMotion());
  useEffect(() => {
    if (!on) return;
    const timer = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(timer);
  }, [on, ms]);
  const leaves = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => {
      const fall = 0.55 + random() * 0.35;
      return {
        left: `${random() * 100}%`,
        scale: (0.7 + random() * 0.6).toFixed(2),
        delay: `${Math.round(random() * (1 - fall) * ms)}ms`,
        duration: `${Math.round(fall * ms)}ms`,
        drift: `${Math.round((random() - 0.5) * 60)}px`,
        spin: `${Math.round((random() - 0.5) * 540)}deg`,
        sway: `${Math.round(10 + random() * 20)}px`,
      };
    });
  }, [count, ms, seed]);
  if (!on) return null;
  return (
    <div className={styles.fall} aria-hidden="true" data-leaffall="">
      {leaves.map((f, i) => (
        <span
          key={i}
          className={styles.leaf}
          style={
            {
              left: f.left,
              animationDelay: f.delay,
              animationDuration: f.duration,
              "--drift": f.drift,
              "--spin": f.spin,
              "--sway": f.sway,
              "--scale": f.scale,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
