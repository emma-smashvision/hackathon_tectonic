/** Illustrative mortgage maths for the prototype; not a credit offer. */
export const MORTGAGE_RATE = 0.033;
export const MORTGAGE_YEARS = 25;
/** Registration duty, notary and loan deed costs as a share of the price. */
export const PURCHASE_COST_RATE = 0.06;
/** Share of net income a repayment may take before it becomes tight. */
export const COMFORTABLE_RATIO = 0.33;
export const TIGHT_RATIO = 0.4;

function annuityFactor(rate = MORTGAGE_RATE, years = MORTGAGE_YEARS): number {
  const r = rate / 12;
  const n = years * 12;
  return r / (1 - (1 + r) ** -n);
}

export function monthlyPayment(loan: number): number {
  return loan <= 0 ? 0 : loan * annuityFactor();
}

export interface MortgageScenario {
  price: number;
  costs: number;
  ownFunds: number;
  loan: number;
  monthly: number;
  ratio: number;
  verdict: "comfortable" | "tight" | "stretch";
}

export function mortgageScenario(
  price: number,
  ownFunds: number,
  monthlyIncome: number,
): MortgageScenario {
  const costs = price * PURCHASE_COST_RATE;
  const loan = Math.max(0, price + costs - ownFunds);
  const monthly = monthlyPayment(loan);
  const ratio = monthlyIncome > 0 ? monthly / monthlyIncome : 1;
  const verdict =
    ratio <= COMFORTABLE_RATIO
      ? "comfortable"
      : ratio <= TIGHT_RATIO
        ? "tight"
        : "stretch";
  return { price, costs, ownFunds, loan, monthly, ratio, verdict };
}

/** Highest price whose repayment stays within the comfortable ratio. */
export function maxComfortablePrice(
  ownFunds: number,
  monthlyIncome: number,
): number {
  const maxLoan = (monthlyIncome * COMFORTABLE_RATIO) / annuityFactor();
  return (maxLoan + ownFunds) / (1 + PURCHASE_COST_RATE);
}
