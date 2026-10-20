import type { Placed } from "./types";

/** Ported from v1: seeded collision relaxation and sqrt-weight sizing. */
export interface BubblePosition {
  /** Centre as a share of the field (0–1). */
  x: number;
  y: number;
}

// Deterministic seeds spread across the field (after InvestSuite).
const SEED_LEFTS = [22, 74, 48, 84, 14, 62, 36, 80, 26, 56];
const SEED_TOPS = [28, 36, 70, 72, 66, 30, 56, 48, 40, 60];
const SAFE_INSET = 4;

/**
 * Seeded positions, then repeated overlap-resolution passes, each clamped to
 * a safe zone so bubbles never overlap and never leave their field (so they
 * never cover the chips or the Kate dock underneath).
 */
export function layoutBubbles(
  diameters: number[],
  width: number,
  height: number,
  gap = 8,
): BubblePosition[] {
  const items = diameters.map((d, i) => ({
    x: (SEED_LEFTS[i % SEED_LEFTS.length] / 100) * width,
    y: (SEED_TOPS[i % SEED_TOPS.length] / 100) * height,
    r: d / 2,
  }));
  const clamp = (it: (typeof items)[number]) => {
    it.x = Math.max(
      SAFE_INSET + it.r,
      Math.min(width - SAFE_INSET - it.r, it.x),
    );
    it.y = Math.max(
      SAFE_INSET + it.r,
      Math.min(height - SAFE_INSET - it.r, it.y),
    );
  };
  items.forEach(clamp);
  for (let pass = 0; pass < 120; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const min = a.r + b.r + gap;
        if (dist === 0) {
          a.x -= 10;
          b.x += 10;
          moved = true;
        } else if (dist < min) {
          const push = (min - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
          moved = true;
        }
      }
    }
    items.forEach(clamp);
    if (!moved) break;
  }
  return items.map((it) => ({ x: it.x / width, y: it.y / height }));
}

export function bubbleDiameter(block: Placed, large: boolean): number {
  const weight = { later: .2, now: .65, urgent: 1 }[block.score];
  const size = { s: -.15, m: 0, l: .2 }[block.size];
  return Math.round((large ? 106 : 78) + Math.sqrt(Math.max(0, Math.min(1, weight + size))) * (large ? 28 : 52));
}

/** Labels stay readable; details retain the original wording. */
export function bubbleLabel(block: Placed): string {
  return block.id === "left_until_payday" && block.title.includes("pension")
    ? "Left until pension" : block.title;
}

export function minimumBubbleDiameter(block: Placed, large: boolean): number {
  return Math.max(large ? 110 : 100, block.value.length > 14 ? 144 : 0,
    bubbleLabel(block).length > 24 ? 128 : 0);
}

/** Fit a prefix of the mix, reserving room for drift and hover at every edge.
 * Never trade readable text for another bubble: remaining items go below the fold.
 */
export function fitBubbleCluster(blocks: Placed[], width: number, height: number, large: boolean) {
  const inset = 10, gap = 8;
  const w = Math.max(0, width - inset * 2), h = Math.max(0, height - inset * 2);
  for (let count = blocks.length; count > 0; count--) {
    for (let step = 0; step <= 20; step++) {
      const sizes = blocks.slice(0, count).map(b => Math.max(minimumBubbleDiameter(b, large), Math.round(bubbleDiameter(b, large) * (1 - step * .025))));
      if (sizes.some(d => d > w || d > h)) continue;
      let positions = layoutBubbles(sizes, w, h, gap);
      // A very short field can fit a single row where the drifting seeds cannot.
      const rowWidth = sizes.reduce((sum, d) => sum + d, 0) + gap * (count - 1);
      if (rowWidth <= w) {
        let x = (w - rowWidth) / 2;
        positions = sizes.map(d => { const p = { x: (x + d / 2) / w, y: .5 }; x += d + gap; return p; });
      }
      const fits = positions.every((p, i) => p.x * w >= sizes[i] / 2 && p.x * w <= w - sizes[i] / 2 && p.y * h >= sizes[i] / 2 && p.y * h <= h - sizes[i] / 2) && positions.every((p, i) => positions.slice(i + 1).every((q, j) =>
        Math.hypot((p.x - q.x) * w, (p.y - q.y) * h) >= (sizes[i] + sizes[i + j + 1]) / 2 + gap - .1));
      if (fits) return { count, sizes, positions: positions.map(p => ({ x: (p.x * w + inset) / width, y: (p.y * h + inset) / height })) };
    }
  }
  return { count: 0, sizes: [], positions: [] };
}

/** Reordering never changes the user's block sizes or adds/removes an item. */
export function reorderBlocks<T extends { id: string }>(blocks: T[], from: string, to: string): T[] {
  const a = blocks.findIndex(b => b.id === from);
  const b = blocks.findIndex(b => b.id === to);
  if (a < 0 || b < 0 || a === b) return blocks;
  const next = [...blocks];
  next.splice(b, 0, next.splice(a, 1)[0]);
  return next;
}
