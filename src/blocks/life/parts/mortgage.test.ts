import { describe, expect, test } from "bun:test";
import { monthlyPayment } from "./mortgage";

describe("indicative mortgage calculation", () => {
  test("amortizes the example loan at the stated fixed rate", () => {
    expect(monthlyPayment(320000, 60000, 25)).toBeCloseTo(1301.62, 2);
  });
  test("handles no borrowing, no interest and a zero term", () => {
    expect(monthlyPayment(150000, 150000, 25)).toBe(0);
    expect(monthlyPayment(150000, 160000, 25)).toBe(0);
    expect(monthlyPayment(120000, 0, 10, 0)).toBe(1000);
    expect(monthlyPayment(120000, 0, 0)).toBe(0);
  });
  test("a larger contribution lowers the monthly payment", () => {
    expect(monthlyPayment(320000, 80000, 25)).toBeLessThan(
      monthlyPayment(320000, 60000, 25),
    );
  });
});
