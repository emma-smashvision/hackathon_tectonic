import { euro, pct } from "../../hindsight/engine/format";
import type { StopEvidence } from "../crowd";

/** Render published model values only; never use raw engine measurements. */
export function evidenceText(evidence: StopEvidence): string {
  const { surprised } = evidence;
  if (!evidence.available)
    return evidence.reason ?? "No published insight yet.";
  if (evidence.kind === "bump" && surprised.share.shown)
    return `${pct(surprised.share.value!)} faced a cost that strained their buffer`;
  if (surprised.share.shown)
    return `${pct(surprised.share.value!)} ${surprised.label.toLowerCase()}`;
  if (surprised.median.shown)
    return `${surprised.label}: ${euro(surprised.median.value!)}`;
  return "Outcome withheld: fewer than 500 people in this group.";
}
