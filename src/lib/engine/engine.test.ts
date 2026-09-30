import { describe, expect, test } from "bun:test";
import { assessNeeds, inferNeeds } from "./infer";
import { getPersona, PERSONAS } from "./personas";
import { CORE_WIDGETS, runEngine } from "./rank";
import { getInjection, INJECTIONS } from "./signals";
import { type Decisions, EMPTY_DECISIONS, type Profile } from "./types";

function profileOf(id: string, ...signals: string[]): Profile {
  return signals.reduce(
    (p, s) => getInjection(s).apply(p),
    getPersona(id).profile,
  );
}

function decide(patch: Partial<Decisions>): Decisions {
  return { ...EMPTY_DECISIONS, ...patch };
}

function adaptiveIds(profile: Profile, decisions = EMPTY_DECISIONS) {
  return runEngine(profile, decisions).config.adaptive.map((s) => s.id);
}

describe("windfall", () => {
  test("a hackathon prize puts the windfall ideas on top, with the advisor nearby", () => {
    const { config, needs } = runEngine(
      profileOf("emma", "prize"),
      EMPTY_DECISIONS,
    );
    expect(needs.find((n) => n.id === "windfall")?.status).toBe("applied");
    expect(config.adaptive[0].id).toBe("windfall");
    expect(config.adaptive.some((s) => s.id === "advisor")).toBe(true);
  });

  test("without a prize there is no windfall need", () => {
    expect(
      inferNeeds(getPersona("emma").profile).some((n) => n.id === "windfall"),
    ).toBe(false);
  });
});

describe("needs combine", () => {
  test("simple UI + travelling shows travel in the simple variant", () => {
    const { config, needs } = runEngine(
      profileOf("margaret", "flight"),
      EMPTY_DECISIONS,
    );
    expect(needs.find((n) => n.id === "travel")?.status).toBe("applied");
    expect(config.density).toBe("simple");
    const travel = config.adaptive.find((s) => s.id === "travel");
    expect(travel?.variant).toBe("simple");
    expect(config.adaptive[0].id).toBe("travel");
    expect(config.adaptive.length).toBeLessThanOrEqual(3);
  });

  test("moving signals add up and push the moving checklist to the top", () => {
    const { config } = runEngine(
      profileOf("tom", "ikea", "mover", "rent"),
      EMPTY_DECISIONS,
    );
    expect(config.adaptive[0].id).toBe("moving");
    expect(config.adaptive.map((s) => s.id)).toContain("budget");
  });

  test("freelancer investor gets tax reserve and detailed investments", () => {
    const { config } = runEngine(getPersona("karim").profile, EMPTY_DECISIONS);
    const ids = config.adaptive.map((s) => s.id);
    expect(ids).toContain("taxReserve");
    expect(ids).toContain("investments");
    expect(config.density).toBe("detailed");
  });
});

describe("behaviour overrides age", () => {
  test("an active 71-year-old investor gets a detailed screen", () => {
    const { config, needs } = runEngine(
      getPersona("marc").profile,
      EMPTY_DECISIONS,
    );
    expect(needs.find((n) => n.id === "simpleUi")).toBeUndefined();
    expect(config.density).toBe("detailed");
    expect(config.adaptive[0].id).toBe("investments");
    expect(config.adaptive[0].variant).toBe("detailed");
  });

  test("age alone never produces a simple UI", () => {
    const base = getPersona("tom").profile;
    const old: Profile = {
      ...base,
      customer: { ...base.customer, age: 92 },
    };
    expect(inferNeeds(old).some((n) => n.id === "simpleUi")).toBe(false);
    expect(runEngine(old, EMPTY_DECISIONS).config.density).toBe("standard");
  });

  test("a young customer who enables large text gets a simple UI", () => {
    const { config } = runEngine(
      profileOf("tom", "largeText"),
      EMPTY_DECISIONS,
    );
    expect(config.density).toBe("simple");
  });

  test("frequent portfolio checks keep investments detailed on a simple screen", () => {
    const profile = profileOf(
      "margaret",
      "portfolio",
      "portfolio",
      "portfolio",
    );
    const withPortfolio: Profile = {
      ...profile,
      customer: { ...profile.customer, portfolioValue: 90_000 },
    };
    const { config } = runEngine(withPortfolio, EMPTY_DECISIONS);
    expect(config.density).toBe("simple");
    const investments = config.adaptive.find((s) => s.id === "investments");
    expect(investments?.variant).toBe("detailed");
  });
});

describe("low confidence asks instead of acting", () => {
  test("an IKEA purchase alone becomes a question, not a moving checklist", () => {
    const profile = profileOf("tom", "ikea");
    const { config, needs } = runEngine(profile, EMPTY_DECISIONS);
    const moving = needs.find((n) => n.id === "moving");
    expect(moving?.confidence).toBeLessThan(0.6);
    expect(moving?.status).toBe("question");
    expect(config.questions[0]?.need).toBe("moving");
    expect(config.questions[0]?.question).toBe("Planning a move?");
    expect(config.adaptive.map((s) => s.id)).not.toContain("moving");
  });

  test("answering yes declares the need with full confidence", () => {
    const profile = profileOf("tom", "ikea");
    const { config, needs } = runEngine(
      profile,
      decide({ declared: ["moving"] }),
    );
    const moving = needs.find((n) => n.id === "moving");
    expect(moving?.source).toBe("declared");
    expect(moving?.confidence).toBe(1);
    expect(config.adaptive[0].id).toBe("moving");
    expect(config.questions.some((q) => q.need === "moving")).toBe(false);
  });

  test("answering not relevant suppresses the need", () => {
    const profile = profileOf("tom", "ikea");
    const decisions = decide({ dismissed: ["moving"] });
    const { config, needs } = runEngine(profile, decisions);
    expect(needs.find((n) => n.id === "moving")?.status).toBe("suppressed");
    expect(config.questions.some((q) => q.need === "moving")).toBe(false);
    expect(adaptiveIds(profile, decisions)).not.toContain("moving");
  });

  test("Sofie's house goal asks first, then a simulator visit applies it", () => {
    const before = runEngine(getPersona("sofie").profile, EMPTY_DECISIONS);
    expect(before.config.questions[0]?.need).toBe("homeBuying");
    const after = runEngine(profileOf("sofie", "mortgage"), EMPTY_DECISIONS);
    expect(after.config.adaptive[0].id).toBe("homeBuying");
  });
});

describe("customer control", () => {
  test("pinned widgets appear first even with a low score", () => {
    const decisions = decide({ pinned: ["pension"] });
    const { config } = runEngine(getPersona("tom").profile, decisions);
    expect(config.adaptive[0].id).toBe("pension");
    expect(config.adaptive[0].pinned).toBe(true);
  });

  test("hidden widgets never appear, whatever the signals", () => {
    const profile = profileOf("tom", "ikea", "mover", "rent");
    const decisions = decide({ hidden: ["moving"] });
    expect(adaptiveIds(profile, decisions)).not.toContain("moving");
    const score = runEngine(profile, decisions).config.scores.find(
      (s) => s.id === "moving",
    );
    expect(score?.hidden).toBe(true);
  });

  test("pins beyond the density limit are still respected", () => {
    const decisions = decide({
      pinned: ["pension", "budget", "advisor", "paymentCheck"],
    });
    const ids = adaptiveIds(getPersona("margaret").profile, decisions);
    expect(ids.slice(0, 4)).toEqual(decisions.pinned);
  });
});

describe("core zone", () => {
  test("never changes for any persona or signal", () => {
    for (const persona of PERSONAS) {
      let profile = persona.profile;
      for (const injection of INJECTIONS) {
        profile = injection.apply(profile);
        const { config } = runEngine(
          profile,
          decide({ hidden: ["transactions"], pinned: ["advisor"] }),
        );
        expect(config.core).toEqual([...CORE_WIDGETS]);
        expect(
          config.adaptive.some((s) =>
            (CORE_WIDGETS as string[]).includes(s.id),
          ),
        ).toBe(false);
      }
    }
  });
});

describe("needs are explainable", () => {
  test("every shown widget has at least one reason", () => {
    for (const persona of PERSONAS) {
      const { config } = runEngine(persona.profile, EMPTY_DECISIONS);
      for (const slot of config.adaptive) {
        expect(slot.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  test("confidence stays within 0-1", () => {
    for (const persona of PERSONAS) {
      for (const n of assessNeeds(persona.profile, EMPTY_DECISIONS)) {
        expect(n.confidence).toBeGreaterThan(0);
        expect(n.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("everyday care for Margaret", () => {
  test("direct debits are summarised and a double payment jumps to the top", () => {
    const base = runEngine(getPersona("margaret").profile, EMPTY_DECISIONS);
    const debits = base.needs.find((n) => n.id === "directDebits");
    expect(debits?.status).toBe("applied");
    expect(debits?.reasons.some((r) => r.includes("Proximus"))).toBe(true);
    expect(base.config.adaptive.map((s) => s.id)).toContain("directDebits");
    const dup = runEngine(profileOf("margaret", "duplicate"), EMPTY_DECISIONS);
    expect(dup.config.density).toBe("simple");
    expect(dup.config.adaptive[0].id).toBe("duplicatePayment");
    expect(dup.config.adaptive.length).toBeLessThanOrEqual(3);
  });

  test("life moments bring their own tools", () => {
    const lina = runEngine(
      profileOf("lina", "flight", "abroad"),
      EMPTY_DECISIONS,
    );
    const ids = lina.config.adaptive.map((s) => s.id);
    expect(ids[0]).toBe("travel");
    expect(ids).toEqual(expect.arrayContaining(["fxAccounts", "esim"]));
    const house = runEngine(profileOf("sofie", "mortgage"), EMPTY_DECISIONS);
    expect(house.config.adaptive.map((s) => s.id)).toContain("appointments");
    const marc = runEngine(getPersona("marc").profile, EMPTY_DECISIONS);
    expect(marc.config.adaptive.map((s) => s.id)).toEqual(
      expect.arrayContaining(["performers", "dividends"]),
    );
    const prize = runEngine(profileOf("emma", "prize"), EMPTY_DECISIONS);
    expect(prize.config.adaptive.map((s) => s.id)).toEqual(
      expect.arrayContaining(["windfall", "business", "celebrate"]),
    );
  });
});
