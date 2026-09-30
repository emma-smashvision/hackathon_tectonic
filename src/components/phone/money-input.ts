/** Decimal euro input, parsed as cents without floating-point rounding. */
export function amountInCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function isStructuredCommunication(value: string): boolean {
  return /^\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+$/.test(value.trim());
}
