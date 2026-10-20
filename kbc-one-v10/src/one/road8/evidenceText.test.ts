import { expect, test } from "bun:test";
import { stopEvidenceFor } from "../crowd";
import { evidenceText } from "./evidenceText";

test("cost copy describes the gated buffer outcome, not a fabricated threshold frequency", () => {
  const evidence = stopEvidenceFor("moving-house", "setting-up")!;
  expect(evidenceText(evidence)).toContain(
    "faced a cost that strained their buffer",
  );
  expect(evidenceText(evidence)).not.toContain("paid more than");
});

test("withheld values cannot leak through the road headline", () => {
  const evidence = stopEvidenceFor("moving-house", "setting-up")!;
  evidence.surprised = {
    ...evidence.surprised,
    share: { shown: false, value: 0.37, reason: "Small group" },
    median: { shown: false, value: 999, reason: "Small group" },
  };
  expect(evidenceText(evidence)).toBe(
    "Outcome withheld: fewer than 500 people in this group.",
  );
});

test("care evidence stays closed before consent", () => {
  const evidence = stopEvidenceFor("losing-parent", "funeral")!;
  expect(evidence.available).toBe(false);
  expect(evidenceText(evidence)).toBe(evidence.reason!);
});
