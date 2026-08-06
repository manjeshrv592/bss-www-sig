"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  useInView,
  useReducedMotion,
} from "motion/react";

/**
 * Counts up to `value` when the number scrolls into view.
 *
 * Rounds on every frame so it never shows a fractional count, and honours
 * prefers-reduced-motion by rendering the final value immediately — a ticking
 * number is decoration, and for someone with motion sensitivity it is noise.
 */
export function CountUp({
  value,
  durationMs = 900,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion() ?? false;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduceMotion || !inView) return;

    const controls = animate(0, value, {
      duration: durationMs / 1000,
      // Decelerating curve: quick to most of the value, easing into the last
      // few, which reads as settling rather than stopping dead.
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, durationMs, reduceMotion]);

  // Resolved during render rather than by seeding state in an effect, which
  // would be a cascading re-render for the one case that needs no animation.
  const shown = reduceMotion ? value : animated;

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString()}
    </span>
  );
}
