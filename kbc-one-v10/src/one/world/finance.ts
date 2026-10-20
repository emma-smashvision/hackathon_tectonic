import { mortgageAt } from "../../hindsight/engine/world";
import { PEOPLE } from "../people";
import { formatWorldDate, renewalDate, worldDate } from "./dates";
import type { AreaFinance, AreaId, FinanceGoal, ProductAttachment, WorldProgress, WorldStage } from "./types";

export const ownPercent = (saved: number, target: number): number => target > 0 && Number.isFinite(saved) && Number.isFinite(target) ? Math.round(Math.max(0, Math.min(1, saved / target)) * 100) : 0;
export const financeStage = (percent: number | null): WorldStage => Math.min(4, Math.floor((percent ?? 0) / 25)) as WorldStage;
export const formatWorldMoney = (value: number): string => `€ ${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 }).format(value)}`;

/** Personal amounts are panel facts only. All geometry consumes percent/stage, never wealth. */
export function financeFor(personaId: string, areaId: AreaId, progress?: WorldProgress, today?: string): AreaFinance {
  const result: AreaFinance = { label: "Your demo numbers", percent: null, stage: 0, summary: "No numbers recorded here yet", goals: [], attachments: [], facts: [] };
  // r2-wu: care is a separate district, not a reason to hide ordinary personal numbers.
  if (!Object.hasOwn(PEOPLE, personaId) || areaId === "care") return result;
  const person = PEOPLE[personaId], world = person.world;
  const date = new Date(`${worldDate(today)}T00:00:00Z`);
  const attach = (id: string, label: string, kind: ProductAttachment["kind"], visual: ProductAttachment["visual"]) => result.attachments.push({ id: `${personaId}:${areaId}:${id}`, label, kind, visual });
  const goals = person.household.goals.filter(g => g.target > 0);
  const homeGoalId = world?.futureHome?.goalId ?? (personaId === "tom" ? "g1" : undefined);
  const sourceGoals = areaId === "savings" ? goals : areaId === "home" ? goals.filter(g => g.id === homeGoalId) : [];
  result.goals = sourceGoals.map(g => ({ id: `${personaId}:${g.id}`, label: g.label, saved: g.saved, target: g.target, monthly: g.monthly, percent: ownPercent(g.saved, g.target), source: "personal-goal" }));
  const custom = progress?.personaId === personaId ? progress.unlocks?.find(u => u.areaId === areaId && u.key === "goal")?.goal : undefined;
  if (custom && custom.target > 0 && Number.isFinite(custom.target) && Number.isFinite(custom.saved ?? 0)) result.goals.push({ id: `${personaId}:world-goal:${areaId}`, label: custom.label, saved: custom.saved ?? 0, target: custom.target, monthly: 0, percent: ownPercent(custom.saved ?? 0, custom.target), source: "personal-goal" });
  if (result.goals.length) {
    result.percent = Math.round(result.goals.reduce((sum, g) => sum + g.percent, 0) / result.goals.length);
    result.summary = result.goals.map(g => `${g.label} · ${g.percent}%`).join(" · ");
    for (const goal of result.goals) result.facts.push({ label: goal.label, value: `${formatWorldMoney(goal.saved)} of ${formatWorldMoney(goal.target)} · ${goal.percent}%` });
  }
  if (areaId === "home") {
    const home = world?.home;
    const insured = !!home?.insurance || person.household.cover.some(c => c.id === "home" && c.state === "ok");
    if (insured) attach("insurance", home?.insurance?.label ?? "Home insurance", "insurance", "shield");
    if (home?.mortgage) {
      const mortgage = home.mortgage;
      // Same convention as the shared engine: payments before this calendar month.
      const state = mortgageAt(mortgage, { year: date.getUTCFullYear(), month: date.getUTCMonth() });
      result.mortgage = { original: mortgage.original, repaidPrincipal: Math.round((mortgage.original - state.left) * 100) / 100, remaining: Math.round(state.left * 100) / 100, percent: ownPercent(mortgage.original - state.left, mortgage.original), paymentsMade: mortgage.years * 12 - state.monthsLeft, totalPayments: mortgage.years * 12, monthlyPayment: Math.round(state.payment * 100) / 100, fixedRate: mortgage.fixed, balanceInsurance: mortgage.balanceInsurance, homeInsurance: insured };
      result.percent = result.mortgage.percent;
      attach("mortgage", mortgage.fixed ? "Fixed-rate mortgage" : "Mortgage", "loan", "foundation");
      if (mortgage.balanceInsurance) attach("balance-insurance", "Balance insurance", "insurance", "foundation");
      result.summary = `${formatWorldMoney(result.mortgage.repaidPrincipal)} of ${formatWorldMoney(mortgage.original)} repaid · ${result.mortgage.paymentsMade} payments · Home insurance ${insured ? "✓" : "not recorded"} · Balance insurance ${mortgage.balanceInsurance ? "✓" : "not recorded"}`;
      result.facts.push({ label: "Mortgage repaid", value: `${result.percent}% · ${result.mortgage.paymentsMade} payments` }, { label: "Payment history", value: "Scheduled demo payments before this month" });
    } else if (home?.rent) {
      const rent = home.rent;
      const startsOn = new Date(Date.UTC(rent.leaseStart.year, rent.leaseStart.month, rent.leaseStart.day)).toISOString().slice(0, 10);
      const future = startsOn > worldDate(today);
      const count = Math.max(0, (date.getUTCFullYear() - rent.leaseStart.year) * 12 + date.getUTCMonth() - rent.leaseStart.month + (date.getUTCDate() >= rent.leaseStart.day ? 1 : 0));
      // Tom's source records the future Gent lease, not the Leuven lease or its payment history.
      result.rent = { city: future && personaId === "tom" ? "Leuven" : home.city, monthly: future ? null : rent.monthly, paid: future ? null : count * rent.monthly, paymentsMade: future ? null : count, tenantInsurance: insured, basis: future ? "Current rent history is not recorded" : "Scheduled demo rent since lease start; assumes each payment was made", ...(future ? { nextHome: { city: home.city, monthly: rent.monthly, startsOn, dateLabel: formatWorldDate(startsOn), goalPercent: result.percent } } : {}) };
      result.summary = `${result.rent.city} flat · ${result.rent.paid === null ? "Rent history not recorded" : `${formatWorldMoney(result.rent.paid)} rent paid`} · Tenant insurance ${insured ? "✓" : "not recorded"}${result.percent === null ? "" : ` · ${result.goals[0].label} ${result.percent}%`}`;
      result.facts.push({ label: "Rent history", value: result.rent.basis });
      if (future) result.facts.push({ label: `${home.city} lease starts`, value: formatWorldDate(startsOn) });
    }
    if (!home) {
      const mortgage = person.household.bills.find(bill => bill.id === "mortgage");
      const rent = person.household.bills.find(bill => bill.id === "rent");
      if (mortgage) {
        attach("mortgage-bill", "Mortgage payment", "loan", "foundation");
        result.summary = `${formatWorldMoney(mortgage.amount)}/month mortgage · Repayment history not recorded`;
        result.facts.push({ label: "Monthly mortgage", value: formatWorldMoney(mortgage.amount) }, { label: "Principal repaid", value: "Not recorded" });
      } else if (rent) result.summary = `${formatWorldMoney(rent.amount)}/month rent · Payment history not recorded`;
      else if (insured) result.summary = "Home insurance ✓ · Repayment history not recorded";
    }
    if (homeGoalId && result.goals.length) attach("home-goal", result.goals[0].label, "savings", "tank");
  }
  if (areaId === "car" && world?.car) {
    const insurance = world.car.insurance;
    const renewal = renewalDate(insurance.renews);
    result.car = { insured: true, renewalDate: renewal, renewalLabel: formatWorldDate(renewal), yearlyPremium: insurance.yearly, previousPremium: insurance.before, changePercent: insurance.before > 0 ? Math.round((insurance.yearly / insurance.before - 1) * 100) : 0, loanPercent: null, maintenance: [] };
    attach("insurance", insurance.label, "insurance", "shield");
    result.summary = `Car insurance ✓ · Renews ${result.car.renewalLabel} · ${result.car.changePercent >= 0 ? "+" : ""}${result.car.changePercent}%`;
    result.facts.push({ label: "Insurance", value: `${formatWorldMoney(insurance.yearly)} a year` }, { label: "Renews", value: result.car.renewalLabel });
  }
  if (areaId === "savings") {
    for (const pot of person.household.pots) {
      attach(pot.id, pot.label, "savings", "tank");
      result.facts.push({ label: pot.label, value: formatWorldMoney(pot.balance) });
    }
    for (const goal of result.goals) attach(goal.id, goal.label, "savings", "tank");
    if (!result.goals.length) result.summary = "Your savings · Set your own goal";
  }
  if (areaId === "pension" && world?.pension) {
    const pension = world.pension;
    result.percent = ownPercent(pension.paid, pension.limit);
    result.pension = { contributed: pension.paid, yearlyMax: pension.limit, percent: result.percent, yearsContributed: null };
    result.summary = `${formatWorldMoney(pension.paid)} of ${formatWorldMoney(pension.limit)} paid this year · ${result.percent}%`;
    result.facts.push({ label: "Demo yearly maximum", value: formatWorldMoney(pension.limit) }, { label: "Years contributed", value: "Not recorded" });
    attach("pension", "Pension saving", "pension", "tree");
  }
  if (areaId === "pension" && !world?.pension) {
    const pensionIncome = person.household.incomes.find(income => /pension/i.test(income.id + income.label));
    if (pensionIncome) {
      result.summary = `${formatWorldMoney(pensionIncome.amount)}/month pension income`;
      result.facts.push({ label: "Monthly pension income", value: formatWorldMoney(pensionIncome.amount) });
    }
  }
  if (areaId === "kids" && world?.child) {
    const child = world.child;
    const goal: FinanceGoal | null = result.goals[0] ?? null;
    result.child = { name: child.name, balance: child.balance, goal };
    result.summary = goal ? `${child.name}’s goal · ${goal.percent}%` : `${child.name}’s account · Choose a goal together`;
    attach("child-account", `${child.name}’s account`, "child-account", "account");
  }
  if (areaId === "investments") for (const holding of world?.holdings ?? []) attach(holding.id, holding.name, "investment", "account");
  result.stage = financeStage(result.percent);
  return result;
}
