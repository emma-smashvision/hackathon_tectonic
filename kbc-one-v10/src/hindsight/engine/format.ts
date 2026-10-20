// KBC One: Belgian number format, like the rest of the app (€ 1.987)
const nf = new Intl.NumberFormat("nl-BE");

export const int = (v: number) => nf.format(Math.round(v));

export function euro(v: number): string {
  const sign = v < 0 ? "−" : "";
  return `${sign}€ ${nf.format(Math.round(Math.abs(v)))}`;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** "1 in 3" style phrasing for rates, falls back to percent. */
export function oneIn(v: number): string {
  for (const d of [2, 3, 4, 5]) {
    if (Math.abs(v - 1 / d) < 0.025) return `1 in ${d}`;
  }
  if (Math.abs(v - 2 / 3) < 0.025) return "2 in 3";
  if (Math.abs(v - 3 / 4) < 0.025) return "3 in 4";
  return pct(v);
}

/** "+€2,650" / "−€890" */
export function signedEuro(v: number): string {
  if (Math.round(v) === 0) return "€ 0";
  return `${v > 0 ? "+" : "−"}€ ${nf.format(Math.round(Math.abs(v)))}`;
}

/** 2.34 -> "2.3" */
export const months1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** 52 -> "4 years 4 months", 14 -> "14 months" */
export function duration(m: number): string {
  if (m < 24) return `${m} month${m === 1 ? "" : "s"}`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0) return `${y} years`;
  if (r === 6) return `${y}½ years`;
  return `${y} years ${r} month${r === 1 ? "" : "s"}`;
}
