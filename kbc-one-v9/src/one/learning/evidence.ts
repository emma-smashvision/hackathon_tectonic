import type { CrowdNumber, StopEvidence } from "../crowd";
import type { Lesson } from "./types";

export const money = (value: number) => new Intl.NumberFormat("en-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
export const shown = (number: CrowdNumber) => number.shown && number.value !== null;

/** Use a familiar ratio only when it stays within one percentage point of the published rate. */
function frequency(value: number): string {
  const denominator = Math.round(1 / value);
  return value > 0 && denominator >= 2 && denominator <= 20 && Math.abs(1 / denominator - value) <= .01
    ? `1 in ${denominator}` : `${Math.round(value * 100)}% of`;
}

/** No measurement is read before its publication gate. */
export function lessonEvidence(evidence: StopEvidence | null): Pick<Lesson, "reveal" | "helped" | "note"> {
  if (!evidence?.available) return { reveal: { headline: "No published crowd evidence for this lesson.", withheld: evidence?.reason ?? "Evidence unavailable." }, helped: [] };
  const { share, median } = evidence.surprised;
  const moving = evidence.roadId === "moving-house";
  const setup = evidence.stopId === "setting-up";
  const december = evidence.stopId === "december";
  const experience = setup ? "faced setup costs" : december ? "had December spending" : evidence.stopId === "energy-year" ? "got a yearly bill" : "got a first bill";
  const typical = setup || december ? "Typical cost" : "Typical bill";
  const headline = evidence.kind === "boost"
    ? shown(median) ? `Typical deposit refund: ${money(median.value!)}.` : "Amounts are not published for this group."
    : `${shown(share) ? `${frequency(share.value!)} ${moving ? "movers" : "households"} ${experience} their buffer couldn't cover.` : "The outcome is not published for this group."}${shown(median) ? ` ${typical}: ${money(median.value!)}.` : ""}`;
  const detail = evidence.kind === "boost" ? "Refund timing varies. Check the release steps and plan with money already available." : undefined;
  const note = evidence.notes[0];
  const year = note?.by.match(/\bin (\d{4})\b/)?.[1];
  const since = note?.by.match(/\bsince (\d{4})\b/)?.[1];
  const author = moving ? "a mover" : evidence.roadId === "first-home" ? "a first-home buyer" : "a household";
  return {
    reveal: { headline, detail, ...(!shown(evidence.kind === "boost" ? median : share) ? { withheld: (evidence.kind === "boost" ? median : share).reason } : {}) },
    helped: evidence.helped.map(item => ({ label: item.label, ...(shown(item.outcome) ? { share: Math.round(item.outcome.value! * 100) } : {}) })),
    note: note ? { text: note.text, by: `— ${author}${year ? `, ${year}` : since ? `, since ${since}` : ""}` } : undefined,
  };
}
