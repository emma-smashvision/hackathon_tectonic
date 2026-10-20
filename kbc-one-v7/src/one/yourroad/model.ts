import { MONTH_SHORT } from "../../hindsight/engine/everyday";
import { euro } from "../../hindsight/engine/format";
import type { LifeState } from "../../hindsight/engine/life";
import {
  addDays,
  type PlanItem,
  type TripPick,
  type When,
  stopForKey,
  whenIndex,
} from "../../hindsight/engine/plan";
import type { RoadDef } from "../../hindsight/engine/types";
import { mortgageAt } from "../../hindsight/engine/world";
import type { PersonRoad } from "../people";

export type AssetKind = "home" | "car" | "savings" | "pension";
export interface Asset {
  id: AssetKind;
  title: string;
  value: string;
  label: string;
  summary: string;
  sentence: string;
  products: { name: string; detail: string }[];
  next: string;
  coverId?: string;
}

/** Read existing household and world facts; never invent an asset valuation or a KBC policy. */
export function assetsFor(
  person: PersonRoad | undefined,
  life: LifeState,
): Asset[] {
  const world = person?.world;
  const home = world?.home;
  const assets: Asset[] = [];
  const homeCover = life.def.cover.find((c) => c.id === "home");
  const mortgage = life.def.bills.find((b) => b.id === "mortgage");
  const homeInsurance = life.def.bills.find((b) =>
    /home insurance/i.test(b.label),
  );
  if (home) {
    const loan = home.mortgage
      ? mortgageAt(home.mortgage, life.today.cal)
      : null;
    const rent = home.rent;
    const products = [
      ...(loan
        ? [
            {
              name: "KBC home loan",
              detail: `${euro(loan.left)} left · ${euro(loan.payment)} a month`,
            },
          ]
        : []),
      ...(rent
        ? [
            {
              name: "Rental deposit",
              detail: `${euro(rent.deposit)} · rent ${euro(rent.monthly)} a month`,
            },
          ]
        : []),
      ...(home.insurance
        ? [
            {
              name: home.insurance.label,
              detail: `${home.insurance.kbc ? "With KBC" : "With another insurer"}${home.insurance.monthly ? ` · ${euro(home.insurance.monthly)} a month` : ""}`,
            },
          ]
        : []),
    ];
    assets.push({
      id: "home",
      title: "Home",
      value: loan ? euro(loan.left) : rent ? euro(rent.monthly) : "Your home",
      label: loan ? "loan remaining" : rent ? "rent / month" : "Owned home",
      summary: home.insurance?.label ?? "Home details",
      sentence: rent
        ? `Your rent in ${home.city} is ${euro(rent.monthly)} a month.`
        : `Your home is in ${home.city}${loan ? `, with ${euro(loan.left)} left on your loan` : ""}.`,
      products,
      next: "Review your home cover",
      coverId: home.coverId,
    });
  } else if (homeCover || mortgage) {
    assets.push({
      id: "home",
      title: "Home",
      value: mortgage
        ? euro(mortgage.amount)
        : homeInsurance
          ? euro(homeInsurance.amount)
          : "Insured",
      label: mortgage ? "loan / month" : "home insurance / month",
      summary: homeCover?.note ?? "Your home loan",
      sentence: mortgage
        ? `Your home loan costs ${euro(mortgage.amount)} a month.`
        : `Your home is insured${homeInsurance ? ` for ${euro(homeInsurance.amount)} a month` : ""}.`,
      products: [
        ...(mortgage
          ? [{ name: "Home loan", detail: `${euro(mortgage.amount)} a month` }]
          : []),
        ...(homeCover
          ? [{ name: "Home insurance", detail: homeCover.note }]
          : []),
      ],
      next: "Review your home cover",
      coverId: homeCover?.id,
    });
  }
  if (world?.car) {
    const car = world.car;
    assets.push({
      id: "car",
      title: "Car",
      value: euro(car.insurance.yearly),
      label: "insurance / year",
      summary: `Renews ${car.insurance.renews.day} ${MONTH_SHORT[car.insurance.renews.month]} · ${car.insurance.kbc ? "KBC" : "other insurer"}`,
      sentence: `Your car insurance is ${euro(car.insurance.yearly)} a year.`,
      products: [
        { name: car.label, detail: car.insurance.label },
        {
          name: car.insurance.kbc
            ? "KBC car insurance"
            : "Your current insurer",
          detail: `Renews ${car.insurance.renews.day} ${MONTH_SHORT[car.insurance.renews.month]} · previously ${euro(car.insurance.before)}`,
        },
      ],
      next: "Discuss your insurance",
    });
  }
  const pots = life.pots.filter((p) => !p.locked && p.kind !== "pension");
  const holdings = world?.holdings ?? [];
  if (pots.length || holdings.length) {
    const total =
      pots.reduce((sum, p) => sum + p.balance, 0) +
      holdings.reduce((sum, h) => sum + h.value, 0);
    assets.push({
      id: "savings",
      title: "Savings & investments",
      value: euro(total),
      label: holdings.length
        ? "savings + investments"
        : "across your savings pots",
      summary: holdings.length
        ? "Savings · Bolero · KBC funds"
        : `${pots.length} savings ${pots.length === 1 ? "pot" : "pots"}`,
      sentence: `You have ${euro(total)} in savings${holdings.length ? " and investments" : ""}.`,
      products: [
        ...pots.map((p) => ({
          name: p.label,
          detail: `${euro(p.balance)}${p.monthly ? ` · ${euro(p.monthly)} a month` : ""}`,
        })),
        ...holdings.map((h) => ({
          name: `${h.name} · ${h.via}`,
          detail: `${euro(h.value)} · last monthly value`,
        })),
      ],
      next: "Review your savings plan",
    });
  }
  const pension = world?.pension;
  const income = life.def.incomes.find((i) => i.id === "pension");
  if (pension || income) {
    assets.push({
      id: "pension",
      title: "Pension",
      value: euro(pension?.fund ?? income!.amount),
      label: pension ? "pension savings" : "income / month",
      summary: pension
        ? `${euro(pension.paid)} saved this year`
        : `Paid on day ${income!.day}`,
      sentence: pension
        ? `Your pension savings are ${euro(pension.fund)}.`
        : `Your pension of ${euro(income!.amount)} arrives on day ${income!.day} each month.`,
      products: pension
        ? [
            {
              name: "KBC pension saving",
              detail: `${euro(pension.paid)} contributed this year · annual limit ${euro(pension.limit)}`,
            },
          ]
        : [
            {
              name: "Pension income",
              detail: `${euro(income!.amount)} each month, on day ${income!.day}`,
            },
          ],
      next: "Talk about your pension",
    });
  }
  return assets;
}

export interface ComingItem {
  id: string;
  title: string;
  when: When;
  kind: "bill" | "journey";
  amount: number | null;
  amountLabel: string;
  ready: number;
  action?: { key: string; id: string; label: string };
  reminder?: TripPick;
}
export const progress = (saved: number, target: number) =>
  target > 0
    ? Math.min(100, Math.max(0, Math.round((saved / target) * 100)))
    : 0;

/** The next dated items. Keep the nearest journey visible if recurring bills fill the list. */
export function comingUp(
  life: LifeState,
  road: RoadDef,
  plan: PlanItem[],
  limit = 5,
): ComingItem[] {
  const events: ComingItem[] = life.upcoming
    .filter((u) => u.kind !== "fork")
    .map((u) => {
      const stop = stopForKey(road, u.ref.key);
      const choices = [
        ...(stop?.behaviours ?? []),
        ...(stop?.action ? [{ id: "main", action: stop.action }] : []),
      ];
      const action = choices
        .filter((b) => !u.done.includes(b.id))
        .sort((a, b) => b.action.readiness - a.action.readiness)[0];
      return {
        id: u.ref.key,
        title: u.title,
        when: { ...u.cal, day: u.day },
        kind: "journey",
        amount: u.amount,
        amountLabel:
          u.amountSource === "crowd"
            ? "typical, people like you"
            : u.amountSource === "last-year"
              ? "last year's amount"
              : "",
        ready: u.ready,
        action: action
          ? { key: u.ref.key, id: action.id, label: action.action.label }
          : undefined,
      };
    });
  const bills: ComingItem[] = life.next30
    .filter((d) => d.kind === "bill")
    .map((d) => {
      const id = `yourroad:${d.key}`;
      const when = { ...d.cal, day: d.day };
      const today = { ...life.today.cal, day: life.today.day };
      const remind =
        whenIndex(when) > whenIndex(today) ? addDays(when, -1) : when;
      return {
        id,
        title: d.label,
        when,
        kind: "bill",
        amount: d.amount,
        amountLabel: "scheduled bill",
        ready: plan.some((p) => p.id === id) ? 100 : 0,
        reminder: {
          id,
          source: { scope: "place", roadId: road.id, key: d.key },
          spec: {
            kind: "remind",
            title: `Check ${d.label} before it is due`,
            detail: `Reminder for your ${euro(Math.abs(d.amount))} bill on ${d.day} ${MONTH_SHORT[d.cal.month]}. No payment changes.`,
            when: remind,
          },
        },
      };
    });
  const all = [...events, ...bills].sort(
    (a, b) => whenIndex(a.when) - whenIndex(b.when) || a.id.localeCompare(b.id),
  );
  const selected = all.slice(0, limit);
  const nextJourney = events.find((e) => !selected.some((s) => s.id === e.id));
  if (limit > 3 && !selected.some((s) => s.kind === "journey") && nextJourney)
    selected[selected.length - 1] = nextJourney;
  return selected.sort((a, b) => whenIndex(a.when) - whenIndex(b.when));
}

/** Older plan actions can also come from the city; their app copy stays in bank words. */
export function plainPlanText(text: string): string {
  const words: Record<string, string> = {
    drivers: "people",
    driver: "person",
    fuel: "buffer",
    boot: "savings",
    tyres: "cover",
    paved: "prepared",
    bump: "cost",
    bumps: "costs",
    glovebox: "saved plan",
    drive: "journey",
    driving: "planning",
  };
  return text
    .replace(/test[- ]drive/gi, "explore")
    .replace(
      /\b(drivers?|fuel|boot|tyres|paved|bumps?|glovebox|drive|driving)\b/gi,
      (word) => words[word.toLowerCase()],
    );
}
