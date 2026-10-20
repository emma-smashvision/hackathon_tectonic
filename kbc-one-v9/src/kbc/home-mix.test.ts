import { describe, expect, test } from "bun:test";
import { bubbleDiameter, bubbleLabel, fitBubbleCluster, layoutBubbles, minimumBubbleDiameter, reorderBlocks } from "./home-mix";
import { composeWithRules } from "./compose";
import { seedPersona, PERSONA_IDS } from "./personas";
import type { Placed } from "./types";

describe("v7.1 Home mix", () => {
  test("editing preserves sizes and membership, including a move across the fold", () => {
    const original = ["a", "b", "c", "d", "e", "f"].map((id, i) => ({ id, size: i % 2 ? "s" : "l" }));
    const moved = reorderBlocks(original, "f", "a");
    expect(moved.map(b => b.id)).toEqual(["f", "a", "b", "c", "d", "e"]);
    expect(moved.find(b => b.id === "f")?.size).toBe("s");
    expect(original.map(b => b.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(reorderBlocks(original, "absent", "a")).toBe(original);
  });

  test("one home goal has one starting bubble, retaining the higher-priority home plan", () => {
    const persona = seedPersona("sofie")!;
    const home = composeWithRules({ persona, trackers: [], muted: [], rules: [], requests: [], log: [] });
    expect(home.blocks[0].id).toBe("home_buying");
    expect(home.blocks.some(b => b.id === "savings_goal")).toBe(false);
  });

  test("v1 sizing is ordered by usefulness without making small bubbles untappable", () => {
    const block = { score: "later", size: "s" } as Placed;
    const low = bubbleDiameter(block, false);
    const high = bubbleDiameter({ ...block, score: "urgent", size: "l" }, false);
    expect(low).toBeGreaterThanOrEqual(78);
    expect(high).toBeGreaterThan(low);
    expect(bubbleDiameter(block, true)).toBeGreaterThan(low);
  });

  test("short stage fields move overflow below the fold and reserve space for motion", () => {
    const blocks = Array.from({ length: 6 }, (_, i) => ({ id: `${i}`, title: "Coming up", value: "4", score: "urgent", size: "l" } as Placed));
    for (const large of [false, true]) for (const width of [342, 358]) for (const height of [134, 149, 215, 300]) {
      const fit = fitBubbleCluster(blocks, width, height, large);
      expect(fit.count).toBeGreaterThan(0);
      expect(fit.count).toBeLessThanOrEqual(blocks.length);
      fit.positions.forEach((p, i) => {
        const radius = fit.sizes[i] / 2;
        expect(fit.sizes[i]).toBeGreaterThanOrEqual(minimumBubbleDiameter(blocks[i], large));
        expect(p.x * width - radius).toBeGreaterThanOrEqual(9.9);
        expect(p.y * height - radius).toBeGreaterThanOrEqual(9.9);
        expect(p.x * width + radius).toBeLessThanOrEqual(width - 9.9);
        expect(p.y * height + radius).toBeLessThanOrEqual(height - 9.9);
        fit.positions.slice(i + 1).forEach((q, j) => expect(Math.hypot((p.x - q.x) * width, (p.y - q.y) * height)).toBeGreaterThanOrEqual(radius + fit.sizes[i + j + 1] / 2 + 7.8));
      });
    }
    expect(fitBubbleCluster(blocks, 342, 149, false).count).toBe(3);
    expect(fitBubbleCluster(blocks, 342, 80, false).count).toBe(0);
  });

  test("pension labels are short and complete, while long values keep enough space", () => {
    const block = { id: "left_until_payday", title: "Left until your pension", value: "€ 3.189" } as Placed;
    expect(bubbleLabel(block)).toBe("Left until pension");
    expect(block.title).toBe("Left until your pension");
    expect(minimumBubbleDiameter({ ...block, value: "£ 127,50 for € 150" }, false)).toBeGreaterThanOrEqual(144);
  });

  test("seeded layouts keep each persona's first bubbles apart and inside the field", () => {
    for (const id of PERSONA_IDS) {
      const persona = seedPersona(id)!;
      const home = composeWithRules({ persona, trackers: [], muted: [], rules: [], requests: [], log: [] });
      const large = home.style === "large";
      const blocks = home.blocks.slice(0, large ? 3 : home.style === "dense" ? 5 : 4);
      for (const width of [342, 358]) {
        const height = large ? 242 : 290;
        const sizes = blocks.map(b => bubbleDiameter(b, large));
        const positions = layoutBubbles(sizes, width, height, large ? 12 : 10);
        expect(positions).toEqual(layoutBubbles(sizes, width, height, large ? 12 : 10));
        positions.forEach((p, i) => {
          expect(p.x * width - sizes[i] / 2).toBeGreaterThanOrEqual(3.9);
          expect(p.x * width + sizes[i] / 2).toBeLessThanOrEqual(width - 3.9);
          expect(p.y * height - sizes[i] / 2).toBeGreaterThanOrEqual(3.9);
          expect(p.y * height + sizes[i] / 2).toBeLessThanOrEqual(height - 3.9);
          positions.slice(i + 1).forEach((q, n) => {
            expect(Math.hypot((p.x - q.x) * width, (p.y - q.y) * height)).toBeGreaterThanOrEqual((sizes[i] + sizes[i + n + 1]) / 2 + 7);
          });
        });
      }
    }
  });
});
