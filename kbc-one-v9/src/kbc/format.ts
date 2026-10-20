const nf2 = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nf0 = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 });

/** € 1.987,40 (Belgian format). Whole amounts drop the cents. */
export function eur(
  n: number,
  opts: { sign?: boolean; cents?: boolean } = {},
): string {
  const abs = Math.abs(n);
  const cents = opts.cents ?? !Number.isInteger(Math.round(abs * 100) / 100);
  const body = cents ? nf2.format(abs) : nf0.format(abs);
  const sign = n < 0 ? "− " : opts.sign && n > 0 ? "+ " : "";
  return `${sign}€ ${body}`;
}

export function gbp(n: number): string {
  return `£ ${nf2.format(Math.abs(n))}`;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function day(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekday(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return DAYS[d.getDay()];
}

export function monthName(iso: string): string {
  const full = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return full[new Date(iso).getMonth()];
}

/** Whole days from `from` to `to` (dates only). */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${to.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function minutesBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 60_000,
  );
}
