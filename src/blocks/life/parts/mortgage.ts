/** Synthetic fixed-rate annuity example, excluding fees and insurance. */
export function monthlyPayment(
  price: number,
  contribution: number,
  years: number,
  annualRate = 0.035,
) {
  const principal = Math.max(0, price - contribution);
  const months = years * 12;
  if (months <= 0) return 0;
  const rate = annualRate / 12;
  return rate === 0
    ? principal / months
    : (principal * rate) / (1 - (1 + rate) ** -months);
}
