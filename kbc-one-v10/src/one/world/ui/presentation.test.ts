import { describe, expect, test } from "bun:test";
import { crowdFrequency, crowdPercent, humanDates } from "./presentation";
const shown = (value: number | null) => ({ shown: true, value, reason: "Published" });
describe("world crowd presentation", () => {
  test("withheld values never reach copy, even if a raw value remains", () => {
    expect(crowdPercent({ shown: false, value: .14, reason: "Below minimum" })).toBeNull();
    expect(crowdFrequency({ shown: false, value: .14, reason: "Below minimum" })).toBeNull();
    expect(crowdPercent(shown(null))).toBeNull();
  });
  test("fractions render as whole percentages and accurate familiar ratios", () => {
    expect(crowdPercent(shown(.14))).toBe("14%");
    expect(crowdFrequency(shown(.14))).toBe("1 in 7");
    expect(crowdFrequency(shown(.41))).toBe("41%");
    expect(crowdFrequency(shown(0))).toBe("0%");
    expect(crowdFrequency(shown(1))).toBe("100%");
    expect(crowdPercent(shown(NaN))).toBeNull();
  });
});

test("source dates are readable and do not shift timezone", () => {
  expect(humanDates("Demo calendar · 2027-01-01")).toBe("Demo calendar · 1 Jan 2027");
  expect(humanDates("Explore · no personal date")).toBe("Explore · no personal date");
  expect(humanDates("2027-02-30")).toBe("2027-02-30");
});
