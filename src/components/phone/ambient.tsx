"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Mood } from "@/lib/engine/present";

interface AmbientTheme {
  gradients: string[];
  /** Seconds per breath; faster feels livelier. */
  breathe: number;
}

/**
 * Breathing radial glows over the dark navy screen. Colour and speed follow
 * the mood the engine gave this home (after the investsuite ambient idea).
 */
export const AMBIENT: Record<Mood, AmbientTheme> = {
  calm: {
    gradients: [
      "radial-gradient(ellipse 70% 45% at 50% 18%, rgba(0,174,239,0.26), transparent 70%)",
      "radial-gradient(ellipse 60% 40% at 20% 70%, rgba(80,150,220,0.16), transparent 70%)",
    ],
    breathe: 16,
  },
  warm: {
    gradients: [
      "radial-gradient(ellipse 65% 42% at 55% 16%, rgba(0,174,239,0.24), transparent 70%)",
      "radial-gradient(ellipse 55% 40% at 22% 64%, rgba(255,176,128,0.2), transparent 70%)",
      "radial-gradient(ellipse 45% 35% at 85% 80%, rgba(255,210,150,0.12), transparent 70%)",
    ],
    breathe: 12,
  },
  focused: {
    gradients: [
      "radial-gradient(ellipse 60% 38% at 70% 14%, rgba(0,174,239,0.2), transparent 70%)",
      "radial-gradient(ellipse 55% 40% at 25% 66%, rgba(60,90,200,0.18), transparent 70%)",
    ],
    breathe: 9,
  },
  bright: {
    gradients: [
      "radial-gradient(ellipse 65% 42% at 40% 16%, rgba(0,200,255,0.28), transparent 70%)",
      "radial-gradient(ellipse 55% 40% at 80% 62%, rgba(60,224,208,0.2), transparent 70%)",
    ],
    breathe: 10,
  },
  celebratory: {
    gradients: [
      "radial-gradient(ellipse 70% 45% at 50% 14%, rgba(0,190,255,0.38), transparent 70%)",
      "radial-gradient(ellipse 50% 38% at 18% 58%, rgba(255,95,162,0.26), transparent 70%)",
      "radial-gradient(ellipse 50% 38% at 84% 70%, rgba(255,201,77,0.26), transparent 70%)",
    ],
    breathe: 5,
  },
  neutral: {
    gradients: [
      "radial-gradient(ellipse 65% 42% at 50% 16%, rgba(0,174,239,0.24), transparent 70%)",
      "radial-gradient(ellipse 50% 40% at 78% 70%, rgba(90,130,230,0.14), transparent 70%)",
    ],
    breathe: 12,
  },
};

export function AmbientBackground({ mood }: { mood: Mood }) {
  const theme = AMBIENT[mood];
  return (
    <div aria-hidden="true" className="ambient">
      <AnimatePresence initial={false}>
        <motion.div
          key={mood}
          className="ambient-layer"
          style={{
            background: theme.gradients.join(", "),
            animationDuration: `${theme.breathe}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}

const COLORS = ["#00aeef", "#ffc94d", "#ff5fa2", "#ffffff", "#5fe3c0"];

/** A one-off burst of confetti; skipped entirely with reduced motion. */
export function Confetti({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), reduced ? 0 : 2800);
    return () => clearTimeout(timer);
  }, [reduced]);
  if (reduced) return null;
  return (
    <div aria-hidden="true" className="confetti">
      {Array.from({ length: 56 }, (_, i) => {
        // Deterministic spread so renders are stable.
        const x = (i * 37) % 100;
        const drift = ((i * 53) % 40) - 20;
        const delay = (i % 8) * 0.05;
        const size = 6 + (i % 4) * 2;
        return (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list
            key={i}
            className="confetti-piece"
            style={{
              left: `${x}%`,
              width: size,
              height: size * (i % 3 === 0 ? 1 : 0.45),
              background: COLORS[i % COLORS.length],
              borderRadius: i % 3 === 0 ? "50%" : 2,
            }}
            initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: [-20, 520 + (i % 5) * 60],
              x: [0, drift * 2],
              rotate: [0, 360 + i * 20],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2.2 + (i % 5) * 0.1,
              delay,
              ease: "easeIn",
            }}
          />
        );
      })}
    </div>
  );
}

/** Counts from the previous value (or zero on mount) to the new one. */
export function CountUp({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: from.current === 0 ? 1.1 : 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setShown(n),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduced]);
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
