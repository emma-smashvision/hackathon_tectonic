import { describe, expect, test } from "bun:test";
import { BUSINESS_QUERY, customerRoad, detectedProfile, FORM_ORDER, PARTNERS, partnersOf, PROFILES, stepsOf } from "./model";

describe("business roadmaps", () => {
  test("covers the requested jobs, from eenmanszaak to BV and first employee", () => {
    expect(PROFILES.map((p) => p.id)).toEqual(["physio", "lawyer", "student", "freelancer", "employer", "founder"]);
    const forms = new Set(PROFILES.flatMap((p) => p.phases.map((ph) => ph.form)));
    for (const form of FORM_ORDER) expect(forms.has(form)).toBe(true);
  });

  test("every step is complete and names known partners", () => {
    for (const profile of PROFILES) {
      const ids = stepsOf(profile).map(({ step }) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const { phase, step } of stepsOf(profile)) {
        expect(profile.forms).toContain(phase.form);
        expect(step.todo.length).toBeGreaterThan(0);
        expect(step.partners.length).toBeGreaterThan(0);
        for (const id of step.partners) expect(PARTNERS[id]).toBeDefined();
        expect(step.crowd.share).toBeGreaterThan(0);
        expect(step.crowd.share).toBeLessThan(1);
        expect(step.kate.length).toBeGreaterThan(20);
      }
    }
  });

  test("forks and partner choices add up to the whole crowd", () => {
    for (const profile of PROFILES) {
      if (profile.fork) {
        expect(profile.phases.some((ph) => ph.id === profile.fork!.after)).toBe(true);
        expect(profile.fork.branches.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(1, 5);
      }
      for (const partner of partnersOf(profile)) {
        if (partner.options) expect(partner.options.reduce((sum, o) => sum + o.share, 0)).toBeCloseTo(1, 5);
      }
    }
  });

  test("BV roads include the notary and the accountant", () => {
    for (const profile of PROFILES.filter((p) => p.forms.includes("bv") && p.id !== "employer")) {
      const ids = partnersOf(profile).map((p) => p.id);
      expect(ids).toContain("notary");
      expect(ids).toContain("accountant");
    }
  });

  test("KBC recognises Karim's job and search finds business situations", () => {
    expect(detectedProfile("karim")).toBe("freelancer");
    expect(detectedProfile("sofie")).toBe("physio");
    for (const key of ["tom", "lina", "margaret", "nadia"]) expect(detectedProfile(key)).toBeUndefined();
    for (const key of ["karim", "sofie", "marc"]) {
      const road = customerRoad(key)!;
      expect(PROFILES.find((p) => p.id === road.profile)!.phases.some((ph) => ph.id === road.now)).toBe(true);
    }
    for (const q of ["I want to start a business", "eenmanszaak naar bv", "hire my first employee", "physio practice"]) expect(BUSINESS_QUERY.test(q)).toBe(true);
    expect(BUSINESS_QUERY.test("we just bought our first house")).toBe(false);
  });
});
