import { describe, expect, test } from "bun:test";
import { getPersona, PERSONAS } from "./personas";
import {
  BUBBLE_FIELD,
  BUBBLE_SIZE,
  bubbleDiameter,
  bubbleMetric,
  bubbleSize,
  CHIP_POOL,
  compactMoney,
  layoutBubbles,
  PRESENTATION,
  presentHomepage,
  signedPercent,
} from "./present";
import { runEngine } from "./rank";
import { getInjection } from "./signals";
import { EMPTY_DECISIONS } from "./types";

function home(id: string, ...signals: string[]) {
  const profile = signals.reduce(
    (p, signal) => getInjection(signal).apply(p),
    getPersona(id).profile,
  );
  const { config } = runEngine(profile, EMPTY_DECISIONS);
  return { profile, config, home: presentHomepage(profile, config) };
}

describe("glanceable presentation", () => {
  test("Tom asks first, then moving is largest and the narrative changes", () => {
    const before = home("tom", "ikea");
    expect(before.home.questions[0].question).toBe("Planning a move?");
    expect(before.home.bubbles.some((b) => b.id === "moving")).toBe(false);
    const after = home("tom", "ikea", "mover", "rent");
    expect(after.home.questions.some((q) => q.need === "moving")).toBe(false);
    expect(after.home.bubbles[0].id).toBe("moving");
    expect(after.home.bubbles[0].diameter).toBe(
      Math.max(...after.home.bubbles.map((b) => b.diameter)),
    );
    expect(after.home.narrative).not.toBe(before.home.narrative);
    expect(after.home.bubbles.map((b) => b.id)).toContain("budget");
  });
  test("simple mode caps bubbles including questions, even with many pins", () => {
    const profile = getInjection("ikea").apply(
      getInjection("flight").apply(getPersona("margaret").profile),
    );
    const { config } = runEngine(profile, {
      ...EMPTY_DECISIONS,
      pinned: ["travel", "advisor", "pension", "budget", "transactions"],
    });
    const view = presentHomepage(profile, config);
    expect(view.bubbles.length + view.questions.length).toBeLessThanOrEqual(3);
    expect(view.more.length).toBeGreaterThan(0);
    expect(view.bubbles.find((b) => b.id === "travel")?.variant).toBe("simple");
    expect(PRESENTATION.simple.font).toBeGreaterThan(
      PRESENTATION.detailed.font,
    );
    expect(PRESENTATION.simple.drift).toBeGreaterThan(
      PRESENTATION.detailed.drift,
    );
  });
  test("all personas have 3 unique fixed-pool suggestions and stable pure output", () => {
    for (const persona of PERSONAS) {
      const { profile, config, home: view } = home(persona.id);
      expect(view.chips.length).toBe(3);
      expect(new Set(view.chips).size).toBe(3);
      expect(view.chips.every((c) => c in CHIP_POOL)).toBe(true);
      expect(
        view.bubbles.length + view.questions.length,
      ).toBeGreaterThanOrEqual(3);
      expect(presentHomepage(profile, config)).toEqual(view);
      expect(config.core).toEqual(["balance", "quickPay"]);
    }
    expect(home("sofie").home.chips).toContain("house");
    expect(home("margaret", "flight").home.chips).toContain("travel");
  });
  test("figures use profile data and sizing follows score, not pin order", () => {
    expect(bubbleMetric("homeBuying", getPersona("sofie").profile).value).toBe(
      "69%",
    );
    expect(bubbleDiameter(98, "standard")).toBeGreaterThan(
      bubbleDiameter(20, "standard"),
    );
    expect(bubbleDiameter(-5, "simple")).toBeGreaterThan(0);
    expect(home("marc").config.density).toBe("detailed");
  });
  test("hidden widgets stay out of bubbles and More for you", () => {
    const profile = home("tom", "ikea", "mover", "rent").profile;
    const { config } = runEngine(profile, {
      ...EMPTY_DECISIONS,
      hidden: ["moving"],
    });
    const view = presentHomepage(profile, config);
    expect([...view.bubbles, ...view.more].some((b) => b.id === "moving")).toBe(
      false,
    );
  });
});

describe("floating bubble home", () => {
  test("bubbles never overlap and stay inside their field", () => {
    for (const persona of PERSONAS) {
      for (const signals of [
        [],
        ["flight", "abroad"],
        ["prize"],
        ["duplicate"],
      ]) {
        const { home: view, config } = home(persona.id, ...signals);
        const sizes = [
          ...view.bubbles.map((b) => b.size),
          ...view.questions.map(() => bubbleSize(0.3, config.density)),
        ];
        const height = BUBBLE_FIELD[config.density];
        for (const width of [320, 350]) {
          const gap = config.density === "simple" ? 12 : 8;
          const pos = layoutBubbles(sizes, width, height, gap);
          pos.forEach((p, i) => {
            const r = sizes[i] / 2;
            expect(p.x * width).toBeGreaterThanOrEqual(r);
            expect(p.x * width).toBeLessThanOrEqual(width - r);
            expect(p.y * height).toBeGreaterThanOrEqual(r);
            expect(p.y * height).toBeLessThanOrEqual(height - r);
            for (let j = i + 1; j < pos.length; j++) {
              const d = Math.hypot(
                (p.x - pos[j].x) * width,
                (p.y - pos[j].y) * height,
              );
              expect(d).toBeGreaterThan(r + sizes[j] / 2);
            }
          });
        }
      }
    }
  });

  test("sizing follows the square root of the weight, larger in simple mode", () => {
    expect(bubbleSize(1, "standard")).toBeGreaterThan(
      bubbleSize(0.25, "standard"),
    );
    expect(bubbleSize(0.25, "standard") - bubbleSize(0, "standard")).toBe(
      Math.round((BUBBLE_SIZE.standard.max - BUBBLE_SIZE.standard.min) * 0.5),
    );
    expect(bubbleSize(0, "simple")).toBeGreaterThan(bubbleSize(0, "standard"));
    const view = home("marc").home;
    expect(view.bubbles[0].size).toBe(BUBBLE_SIZE.detailed.max);
  });

  test("tints, nudges and mood follow the data", () => {
    const marc = home("marc").home;
    expect(marc.bubbles.find((b) => b.id === "performers")?.direction).toBe(
      "up",
    );
    expect(marc.mood).toBe("focused");
    const margaret = home("margaret", "duplicate").home;
    expect(margaret.bubbles[0].id).toBe("duplicatePayment");
    expect(margaret.bubbles[0].nudge).toBe(true);
    expect(margaret.mood).toBe("calm");
    const prize = home("emma", "prize").home;
    expect(prize.mood).toBe("celebratory");
    expect(prize.bubbles.find((b) => b.id === "windfall")?.nudge).toBe(true);
    expect(home("lina", "flight", "abroad").home.mood).toBe("bright");
    expect(compactMoney(420, "GBP")).toBe("£420");
    expect(signedPercent(-0.09)).toBe("−9%");
  });
});
