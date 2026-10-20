import { monthAngle, ringAt } from "./everydayRing";
import { type CityNet, HALF_W, RING_R, pointAt, sAtMonth } from "./network";

// Every road its own place: one landmark near the start of each avenue (the employer's tower, the
// notary, the maternity hospital, the harbour…) and five civic buildings on the Everyday Road at the
// month they matter (the bank in January, the tax office in June…). They stand where the generic
// dressing would have gone (cityGen keeps their footprint free). Pure TypeScript, unit-tested.

export type LandmarkKind =
  | "office"
  | "studio"
  | "notary"
  | "depot"
  | "installer"
  | "hospital"
  | "harbour"
  | "carehome"
  | "park"
  | "mediation"
  | "parentHouse"
  | "jobcentre"
  | "bank"
  | "tax"
  | "school"
  | "shops"
  | "travel";

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  title: string;
  line: string;
  /** the avenue it belongs to; null = on the Everyday Road */
  roadId: string | null;
  /** calendar month on the ring (0 = January) */
  calMonth?: number;
  x: number;
  z: number;
  /** facing the road: rotation about y, so local +z points at the road */
  rot: number;
  /** footprint radius kept free of other buildings */
  r: number;
  accent: string;
}

/** One per avenue: the place the road is about, at its start. */
export const AVENUE_LANDMARKS: Record<string, { kind: LandmarkKind; title: string; line: string; accent: string; month: number; side: 1 | -1 }> = {
  "first-job": { kind: "office", title: "Your employer", line: "The first payslip: gross, tax, net", accent: "#5ED4E8", month: 2.2, side: 1 },
  freelance: { kind: "studio", title: "The studio", line: "Invoices, VAT and social contributions", accent: "#C9C2AE", month: 2.2, side: 1 },
  "first-home": { kind: "notary", title: "The notary", line: "The deed, and the keys", accent: "#5ED4E8", month: 2.2, side: 1 },
  "moving-house": { kind: "depot", title: "The van depot", line: "Moving day", accent: "#5ED4E8", month: 2.2, side: 1 },
  "heat-pump": { kind: "installer", title: "The installer's yard", line: "Heat pumps and solar panels", accent: "#7FD6A8", month: 2.2, side: 1 },
  "first-child": { kind: "hospital", title: "Maternity hospital", line: "And the crèche next door", accent: "#E8B4A0", month: 2.2, side: 1 },
  "moving-abroad": { kind: "harbour", title: "Harbour and airport", line: "Moving abroad starts here", accent: "#8FB8E8", month: 2.2, side: 1 },
  "caring-parent": { kind: "carehome", title: "The care home", line: "Care for a parent, and for yourself", accent: "#B7B0DA", month: 2.2, side: 1 },
  retirement: { kind: "park", title: "Pension office and park", line: "The last payslip, the first pension", accent: "#D8C27A", month: 2.2, side: 1 },
  separation: { kind: "mediation", title: "Mediation house", line: "Two homes, one calm conversation", accent: "#B7B0DA", month: 2.2, side: 1 },
  "losing-parent": { kind: "parentHouse", title: "Your parent's house", line: "The notary helps with what comes next", accent: "#B7B0DA", month: 2.2, side: 1 },
  "job-loss": { kind: "jobcentre", title: "Job centre", line: "VDAB, Actiris or Le Forem: a bridge back to work", accent: "#B7B0DA", month: 2.2, side: 1 },
};

/** Five civic buildings on the Everyday Road, at the month they matter. */
export const RING_LANDMARKS: { kind: LandmarkKind; calMonth: number; title: string; line: string; accent: string }[] = [
  { kind: "bank", calMonth: 0, title: "Your bank branch", line: "January: insurance renewals and yearly fees", accent: "#5ED4E8" },
  { kind: "tax", calMonth: 5, title: "Tax office", line: "The tax return in June, the result by September", accent: "#D8C9A3" },
  { kind: "travel", calMonth: 6, title: "Travel kiosk", line: "July: the summer holidays", accent: "#8FB8E8" },
  { kind: "school", calMonth: 7, title: "School", line: "August: school costs before September", accent: "#E8B4A0" },
  { kind: "shops", calMonth: 11, title: "Shops", line: "December: gifts, parties, the year-end bonus", accent: "#F3A93C" },
];

// on your right as you drive out (the HUD column on the left never hides it)
const OFFSET = HALF_W + 20;

export function placeLandmarks(net: CityNet, advisor?: { name: string; office: string }): Landmark[] {
  const out: Landmark[] = [];
  for (const av of net.avenues) {
    const def = AVENUE_LANDMARKS[av.road.id];
    if (!def) continue;
    const { p, tan } = pointAt(av.trunk, sAtMonth(av.trunk, def.month));
    const perp = { x: -tan.z, z: tan.x };
    const x = p.x + perp.x * OFFSET * def.side;
    const z = p.z + perp.z * OFFSET * def.side;
    // local +z faces the road: from the landmark towards the avenue
    const rot = Math.atan2(p.x - x, p.z - z);
    out.push({ id: `lm:${av.road.id}`, kind: def.kind, title: def.title, line: def.line, roadId: av.road.id, x, z, rot, r: 11, accent: def.accent });
  }
  for (const c of RING_LANDMARKS) {
    const a = monthAngle(c.calMonth);
    const at = ringAt(a, RING_R + HALF_W + 20);
    const rot = Math.atan2(-at.x, -at.z);
    const line = c.kind === "bank" && advisor ? `${advisor.office} · ${advisor.name} · ${c.line}` : c.line;
    out.push({ id: `lm:ring:${c.kind}`, kind: c.kind, title: c.title, line, roadId: null, calMonth: c.calMonth, x: at.x, z: at.z, rot, r: 11, accent: c.accent });
  }
  return out;
}
