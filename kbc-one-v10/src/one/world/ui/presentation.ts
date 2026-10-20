import type { CrowdNumber } from "@/one/crowd";
import type { WorldStorm } from "../types";

/** Crowd rates are 0–1, not 0–100. Always retain the publication gate. */
export function crowdPercent(value: CrowdNumber): string | null {
  return value.shown && value.value !== null && Number.isFinite(value.value) ? `${Math.round(value.value * 100)}%` : null;
}
export function crowdFrequency(value: CrowdNumber): string | null {
  if (!value.shown || value.value === null || !Number.isFinite(value.value)) return null;
  const n = Math.round(1 / value.value);
  return value.value > 0 && n >= 2 && n <= 20 && Math.abs(1 / n - value.value) <= .01 ? `1 in ${n}` : crowdPercent(value);
}

/** Keep source dates intact; format only the words shown to the person. */
export function humanDates(value: string): string {
  return value.replace(/\b\d{4}-\d{2}-\d{2}\b/g, iso => {
    const date = new Date(`${iso}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
      : iso;
  });
}

export function stormStory(storm: WorldStorm): string | null {
  const frequency = crowdFrequency(storm.share);
  if (!frequency) return null;
  const people = storm.roadId === "moving-house" ? "movers" : storm.roadId === "first-home" ? "first-time buyers" : "people";
  return `${frequency} ${people} couldn’t cover this cost with their buffer.`;
}
