import { describe, expect, test } from "bun:test";
import { amountInCents, isStructuredCommunication } from "./money-input";

describe("demo payment input", () => {
  test("parses decimal amounts exactly, including comma keyboards", () => {
    expect(amountInCents("50")).toBe(5000);
    expect(amountInCents(" 0,29 ")).toBe(29);
    expect(amountInCents("12.5")).toBe(1250);
  });
  test("rejects zero, negative, ambiguous, oversized and fractional-cent amounts", () => {
    for (const value of [
      "",
      "0",
      "-5",
      "1e3",
      "1,000.00",
      "1.001",
      "NaN",
      "10000000",
      "1.",
    ]) {
      expect(amountInCents(value)).toBeNull();
    }
  });
  test("requires the displayed structured communication format", () => {
    expect(isStructuredCommunication("+++123/4567/89012+++")).toBe(true);
    for (const value of [
      "",
      "123456789012",
      "+++123/456/89012+++",
      "+++abc/4567/89012+++",
    ]) {
      expect(isStructuredCommunication(value)).toBe(false);
    }
  });
});
