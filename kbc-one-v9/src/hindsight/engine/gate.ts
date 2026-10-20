import { hashSeed, laplace, mulberry32 } from "./rng";

// The crowd gate: every number a customer sees passes through here.
// 1. Minimum crowd: no number is shown unless at least K_MIN people back it.
// 2. Noise: counts get Laplace noise (epsilon = EPSILON) before any rate is computed.
// 3. Rounding: rates are rounded to whole percent, money to a sensible step.
// Every decision is logged so the stage inspector can show what was held back and why.

export const K_MIN = 500;
export const EPSILON = 1;

export interface GateDecision {
  label: string;
  n: number;
  shown: boolean;
  reason: string;
}

export interface Gated<T> {
  shown: boolean;
  value: T | null;
  n: number;
  decision: GateDecision;
}

function noisy(label: string, count: number): number {
  const rand = mulberry32(hashSeed(`gate:${label}:${count}`));
  return Math.max(0, count + laplace(rand, 1 / EPSILON));
}

export function gateRate(label: string, hits: number, n: number): Gated<number> {
  if (n < K_MIN) {
    return {
      shown: false,
      value: null,
      n,
      decision: { label, n, shown: false, reason: `Only ${n} people match, below ${K_MIN}` },
    };
  }
  const value = Math.round((noisy(`${label}:h`, hits) / Math.max(1, noisy(`${label}:n`, n))) * 100) / 100;
  return {
    shown: true,
    value: Math.min(1, Math.max(0, value)),
    n,
    decision: { label, n, shown: true, reason: `n ≥ ${K_MIN}, noised (ε=${EPSILON}), rounded to 1%` },
  };
}

export function roundMoney(v: number): number {
  const a = Math.abs(v);
  const step = a >= 20000 ? 1000 : a >= 2000 ? 100 : a >= 200 ? 10 : 1;
  return Math.round(v / step) * step;
}

export function gateMoney(label: string, value: number, n: number): Gated<number> {
  if (n < K_MIN) {
    return {
      shown: false,
      value: null,
      n,
      decision: { label, n, shown: false, reason: `Only ${n} people match, below ${K_MIN}` },
    };
  }
  return {
    shown: true,
    value: roundMoney(value),
    n,
    decision: { label, n, shown: true, reason: `n ≥ ${K_MIN}, median rounded` },
  };
}

/** A median that isn't money (months, ratios): shown only above K_MIN, rounded to `step`. */
export function gateNumber(label: string, value: number, n: number, step: number): Gated<number> {
  if (n < K_MIN) {
    return { shown: false, value: null, n, decision: { label, n, shown: false, reason: `Only ${n} people match, below ${K_MIN}` } };
  }
  return {
    shown: true,
    value: Math.round(value / step) * step,
    n,
    decision: { label, n, shown: true, reason: `n ≥ ${K_MIN}, median rounded to ${step}` },
  };
}

export function gateCount(label: string, n: number): Gated<number> {
  if (n < K_MIN) {
    return { shown: false, value: null, n, decision: { label, n, shown: false, reason: `Below ${K_MIN}` } };
  }
  const v = Math.round(noisy(label, n));
  return { shown: true, value: v, n, decision: { label, n, shown: true, reason: `Count noised (ε=${EPSILON})` } };
}
