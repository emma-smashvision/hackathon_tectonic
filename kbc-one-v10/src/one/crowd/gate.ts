import { gateCount, type Gated, K_MIN } from "../../hindsight/engine/gate";

/** The only public shape for a crowd measurement. Never expose raw n/decisions. */
export interface CrowdNumber {
  shown: boolean;
  value: number | null;
  reason: string;
}

export const SYNTHETIC_LABEL = "Synthetic demo data · not a prediction";
export const CROWD_MIN = K_MIN;
export const withheld = (reason: string): CrowdNumber => ({ shown: false, value: null, reason });
export function publish(gated: Gated<number>): CrowdNumber {
  return gated.shown && gated.value !== null
    ? { shown: true, value: gated.value, reason: gated.decision.reason }
    : withheld(`Not published: fewer than ${K_MIN} people support this group.`);
}
export const countFor = (label: string, n: number): CrowdNumber => publish(gateCount(label, n));
