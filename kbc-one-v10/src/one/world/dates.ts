import { TODAY } from "../../hindsight/engine/everyday";

export const WORLD_TODAY = `${TODAY.year}-${String(TODAY.month + 1).padStart(2, "0")}-${String(TODAY.day).padStart(2, "0")}`;
export function worldDate(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : WORLD_TODAY;
}
/** UTC keeps the same day in every browser timezone. ISO remains available for sorting. */
export function formatWorldDate(value: string): string {
  if (worldDate(value) !== value) return "Date not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
/** Anchor renewals to the demo snapshot; advancing time must not hide an overdue event. */
export function renewalDate(renewal: { month: number; day: number }): string {
  const year = Number(WORLD_TODAY.slice(0, 4));
  let date = new Date(Date.UTC(year, renewal.month, renewal.day)).toISOString().slice(0, 10);
  if (date < WORLD_TODAY) date = new Date(Date.UTC(year + 1, renewal.month, renewal.day)).toISOString().slice(0, 10);
  return date;
}
