import type {
  Density,
  Profile,
  Transaction,
  Variant,
} from "@/lib/engine/types";

export interface WidgetProps {
  profile: Profile;
  variant: Variant;
  density: Density;
}

export function daysSince(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
      86_400_000,
  );
}

export function within(
  txs: Transaction[],
  today: string,
  days: number,
): Transaction[] {
  return txs.filter((tx) => {
    const age = daysSince(tx.date, today);
    return age >= 0 && age <= days;
  });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
