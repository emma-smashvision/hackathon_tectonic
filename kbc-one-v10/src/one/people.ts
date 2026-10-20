// KBC One: one person = one Kate customer (the past and the present: transactions, blocks,
// Kate) + one household and road (the future: Hindsight's replay, the crowd, the city).
// All data is synthetic. Households are written to match each Kate persona's numbers
// (balance, savings, salary day and amount, direct debits), so the Home and the Road agree.

import { type LifeDef, LIVES, type Yearly } from "../hindsight/engine/lives";
import type { Advisor } from "../hindsight/engine/plan";
import { PERSONAS } from "../kbc/personas";
import { EVERYDAY_ONLY_ID } from "../hindsight/engine/roads";
import type { Persona } from "../hindsight/engine/types";
import type { WorldDef } from "../hindsight/engine/world";

const Y = (y: Partial<Yearly>): Yearly => ({
  renewals: 0,
  energy: 0,
  holidayPay: 0,
  holidays: 0,
  propertyTax: 0,
  school: 0,
  taxResult: 0,
  pensionSaving: 0,
  bonus: 0,
  december: 0,
  none: 1,
  ...y,
});

/** What starts the driving world for this person (always on their own tap). */
export type LookAheadKind = "told" | "crossroads" | "bump" | "preview";

export interface PersonRoad {
  /** Kate persona id; also the storage key for this person's journeys */
  key: string;
  /** life road id, or EVERYDAY_ONLY_ID when there is no life road right now */
  roadId: string;
  /** Hindsight's persona shape for that road (name, month on the road, bands, passport) */
  persona: Persona;
  household: LifeDef;
  /** a road this person is about to enter: offered as a test drive ("drive it before you buy") */
  preview?: { roadId: string; title: string; line: string };
  /** a life event the customer told us about: the on-ramp line on the Home */
  told?: string;
  /** Large & simple people get the road as plain words, never the game */
  noGame?: boolean;
  /** the customer's own advisor (from the Kate persona), for booking a talk from the road */
  advisor?: Advisor;
  /** what they own, rent, insure, save and invest: their own streets in the city (none for Margaret, Nadia) */
  world?: WorldDef;
}

// Tom's household lives in lives.ts as LIVES["moving-house"] (it is that road's own driver).

// ---------- Karim: freelance designer (Going freelance, month 20) ----------
export const KARIM_HOUSEHOLD: LifeDef = {
  roadId: "freelance",
  household: "Lives with his partner · owns a house in Antwerpen",
  balance: 7904,
  incomes: [{ id: "invoices", label: "Client invoices", amount: 5200, day: 24, vary: 0.35 }],
  bills: [
    { id: "mortgage", label: "Mortgage", amount: 1150, day: 2, group: "home" },
    { id: "energy", label: "Energy advance", amount: 150, day: 6, group: "energy" },
    { id: "phone", label: "Internet & phone", amount: 65, day: 12, group: "phone" },
    { id: "software", label: "Adobe", amount: 72, day: 15, group: "work" },
    { id: "home-ins", label: "Home insurance", amount: 38, day: 15, group: "insurance" },
    { id: "accountant", label: "Accountant", amount: 130, day: 25, group: "work" },
    { id: "social", label: "Social contributions", amount: 920, day: 1, group: "tax", months: [1, 4, 7, 10] },
  ],
  spend: 2100,
  pots: [{ id: "savings", label: "Savings", balance: 21050, monthly: 0 }],
  goals: [{ id: "tax", label: "Tax reserve", place: "Tax office", target: 11000, saved: 8420, monthly: 600 }],
  cover: [
    { id: "hospital", label: "Hospital", state: "ok", note: "Individual hospital cover." },
    { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
    { id: "income", label: "Income", state: "gap", note: "Nothing pays you if you're ill for months. Most freelancers looked at this in their first years." },
  ],
  yearly: Y({ renewals: -560, energy: -240, holidays: -1600, propertyTax: -1200, taxResult: -1100, pensionSaving: -180, december: -700 }),
};

// ---------- Lina: Everyday Road only ----------
export const LINA_HOUSEHOLD: LifeDef = {
  roadId: EVERYDAY_ONLY_ID,
  household: "Lives with her daughter Noor · rents in Leuven",
  balance: 1486,
  incomes: [{ id: "salary", label: "Salary", amount: 2610, day: 26, salary: true }],
  bills: [
    { id: "rent", label: "Rent, Leuven", amount: 890, day: 1, group: "home" },
    { id: "energy", label: "Energy advance", amount: 95, day: 6, group: "energy" },
    { id: "pocket", label: "Noor's pocket money", amount: 60, day: 11, group: "family" },
    { id: "ins", label: "Insurance", amount: 35, day: 15, group: "insurance" },
    { id: "phone", label: "Telenet", amount: 58, day: 24, group: "phone" },
  ],
  spend: 1150,
  pots: [{ id: "savings", label: "Savings", balance: 4200, monthly: 100 }],
  goals: [{ id: "g1", label: "City trips", place: "Next city trip", target: 1200, saved: 540, monthly: 60 }],
  cover: [
    { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer, Noor included." },
    { id: "liability", label: "Liability", state: "ok", note: "Family policy." },
    { id: "travel", label: "Travel", state: "check", note: "Check what your card's travel cover includes before the next trip." },
  ],
  yearly: Y({ renewals: -280, energy: -150, holidayPay: 2300, holidays: -1100, school: -350, taxResult: 260, pensionSaving: -600, bonus: 2200, december: -650 }),
};

// ---------- Margaret: Everyday Road only, retired ----------
export const MARGARET_HOUSEHOLD: LifeDef = {
  roadId: EVERYDAY_ONLY_ID,
  household: "Lives alone · own house in Mechelen · retired",
  balance: 3241,
  incomes: [{ id: "pension", label: "Pension", amount: 1890, day: 23 }],
  bills: [
    { id: "mutual", label: "Mutualiteit", amount: 12, day: 2, group: "insurance" },
    { id: "energy", label: "Luminus", amount: 84, day: 14, group: "energy" },
    { id: "ins", label: "Home insurance", amount: 30, day: 15, group: "insurance" },
    { id: "phone", label: "Proximus", amount: 52, day: 21, group: "phone" },
    { id: "water", label: "De Watergroep", amount: 31, day: 28, group: "home" },
  ],
  spend: 900,
  pots: [{ id: "savings", label: "Savings", balance: 38400, monthly: 0 }],
  goals: [],
  cover: [
    { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
    { id: "hospital", label: "Hospital", state: "ok", note: "Through your mutualiteit." },
    { id: "liability", label: "Liability", state: "ok", note: "Family policy." },
  ],
  yearly: Y({ renewals: -240, energy: -120, holidays: -600, propertyTax: -850, taxResult: 120, december: -350 }),
};

// ---------- Sofie & Pieter: Everyday Road + a house fund (about to enter First home) ----------
export const SOFIE_HOUSEHOLD: LifeDef = {
  roadId: EVERYDAY_ONLY_ID,
  household: "Lives with Pieter · rents in Brugge · saving for a first home",
  balance: 74311,
  incomes: [{ id: "salary", label: "Salary", amount: 2950, day: 28, salary: true }],
  bills: [
    { id: "rent", label: "Rent, Brugge", amount: 980, day: 1, group: "home" },
    { id: "energy", label: "Energy advance", amount: 110, day: 6, group: "energy" },
    { id: "ins", label: "Insurance", amount: 30, day: 15, group: "insurance" },
    { id: "phone", label: "Orange", amount: 45, day: 25, group: "phone" },
  ],
  spend: 750,
  pots: [{ id: "savings", label: "Savings", balance: 0, monthly: 0 }],
  goals: [{ id: "g1", label: "Our first home", place: "First home", target: 60000, saved: 41300, monthly: 1000 }],
  cover: [
    { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
    { id: "liability", label: "Liability", state: "ok", note: "Family policy, Pieter included." },
    { id: "home", label: "Home", state: "check", note: "When you buy, fire insurance is needed from the day of the deed." },
  ],
  yearly: Y({ renewals: -260, energy: -160, holidayPay: 2500, holidays: -1300, taxResult: 240, pensionSaving: -1000, bonus: 2400, december: -600 }),
};

// ---------- Marc: tech founder, app on the side ----------
export const MARC_HOUSEHOLD: LifeDef = {
  roadId: EVERYDAY_ONLY_ID,
  household: "Lives alone · rents in Gent · building an app on the side",
  balance: 3120,
  incomes: [{ id: "salary", label: "Salary", amount: 2980, day: 25, salary: true }],
  bills: [
    { id: "rent", label: "Rent, Gent", amount: 820, day: 1, group: "home" },
    { id: "energy", label: "Energy advance", amount: 80, day: 6, group: "energy" },
    { id: "phone", label: "Proximus", amount: 39, day: 26, group: "phone" },
    { id: "software", label: "Software for the app", amount: 30, day: 16, group: "work" },
  ],
  spend: 900,
  pots: [{ id: "savings", label: "Startup buffer", balance: 12800, monthly: 400 }],
  goals: [{ id: "g1", label: "Startup buffer", place: "Startup", target: 15000, saved: 12800, monthly: 400 }],
  cover: [
    { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
    { id: "liability", label: "Liability", state: "check", note: "Professional liability once you sell your app." },
  ],
  yearly: Y({ renewals: -120, energy: -90, holidayPay: 2400, holidays: -900, bonus: 2500, december: -500 }),
};

// ---------- their own worlds (streets inside the ring) ----------
// Synthetic, and written to agree with the Kate personas and households above: Tom's rent, deposit and
// car insurance renewal (+8% on 2 Nov), Karim's home loan (€ 1.150 a month), holdings and pension saving,
// Lina's flat and Noor's pocket money, Sofie & Pieter's house fund and Thursday's appointment with Ellen.

const TOM_WORLD: WorldDef = {
  home: { tenure: "rent", kind: "flat", city: "Gent", rent: { monthly: 950, deposit: 1900, leaseStart: { year: 2026, month: 10, day: 1 } }, insurance: { label: "KBC Home Insurance, tenant", kbc: true }, coverId: "home" },
  car: { label: "2017 hatchback", insurance: { label: "Third-party + mini-omnium", yearly: 412, before: 381, renews: { month: 10, day: 2 }, kbc: false } },
  holdings: [],
};

const KARIM_WORLD: WorldDef = {
  home: {
    tenure: "own",
    kind: "terraced",
    city: "Antwerpen",
    boughtYear: 2012,
    epc: "C",
    // € 1.150 a month: an annuity of € 240.000 at 3,1% fixed over 25 years
    mortgage: { original: 240000, rate: 0.031, start: { year: 2012, month: 1 }, years: 25, fixed: true, balanceInsurance: true },
    insurance: { label: "KBC Home Insurance", monthly: 38, kbc: true },
    coverId: "home",
  },
  holdings: [
    { id: "world-etf", name: "World equity ETF", kind: "ETF", sri: 4, costs: 0.22, via: "Bolero", since: { year: 2019, month: 2 }, initial: 4000, monthly: 150, value: 24100, profile: "equity", beta: 1, vol: 0.022 },
    { id: "sustainable", name: "Sustainable fund", kind: "fund", sri: 4, costs: 1.6, via: "KBC fund", since: { year: 2021, month: 5 }, initial: 10000, value: 11800, profile: "equity", beta: 0.9, vol: 0.018 },
    { id: "bonds", name: "Euro bonds", kind: "bonds", sri: 2, costs: 0.6, via: "KBC fund", since: { year: 2022, month: 0 }, initial: 7000, value: 6410, profile: "bonds", beta: 1, vol: 0.006 },
  ],
  pension: { limit: 1050, paid: 870, fund: 14920 },
};

const LINA_WORLD: WorldDef = {
  home: { tenure: "rent", kind: "flat", city: "Leuven", rent: { monthly: 890, deposit: 1780, leaseStart: { year: 2021, month: 8, day: 1 } }, insurance: { label: "KBC family and tenant insurance", monthly: 35, kbc: true }, coverId: "liability" },
  holdings: [],
  child: { name: "Noor", balance: 3.1, weekly: 15, day: "Saturday" },
  pension: { limit: 1050, paid: 0, fund: 6900, usual: 600 },
};

const SOFIE_WORLD: WorldDef = {
  home: { tenure: "rent", kind: "flat", city: "Brugge", rent: { monthly: 980, deposit: 1960, leaseStart: { year: 2022, month: 3, day: 1 } }, insurance: { label: "KBC family and tenant insurance", monthly: 30, kbc: true } },
  futureHome: { goalId: "g1", city: "Brugge", appointment: { dow: "Thu", time: "10:00", with: "Ellen", role: "mortgage advisor" }, coverId: "home" },
  holdings: [],
  pension: { limit: 1050, paid: 0, fund: 9800, usual: 1000 },
};

const ME = (name: string, age: number, city: string, month: number, line: string, bufferBand: number, incomeBand: number, driven: Persona["driven"] = []): Persona => ({
  name,
  age,
  city,
  month,
  line,
  bufferBand,
  incomeBand,
  driven,
});

export const PEOPLE: Record<string, PersonRoad> = {
  tom: {
    key: "tom",
    roadId: "moving-house",
    persona: ME("Tom", 29, "Gent", 0, "Moving from Leuven to a rented flat in Gent on 1 November.", 2, 1, [{ roadId: "first-job", year: 2019 }]),
    household: LIVES["moving-house"],
    told: "You told us you're moving to Gent on 1 November.",
    world: TOM_WORLD,
  },
  lina: {
    key: "lina",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Lina", 31, "Leuven", 0, "", 2, 1, [{ roadId: "first-child", year: 2018 }]),
    household: LINA_HOUSEHOLD,
    world: LINA_WORLD,
  },
  margaret: {
    key: "margaret",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Margaret", 74, "Mechelen", 0, "", 3, 0, [{ roadId: "retirement", year: 2016 }]),
    household: MARGARET_HOUSEHOLD,
    noGame: true,
  },
  karim: {
    key: "karim",
    roadId: "freelance",
    persona: ME("Karim", 45, "Antwerpen", 20, "Freelance designer since early 2025.", 3, 2, [
      { roadId: "first-job", year: 2004 },
      { roadId: "first-home", year: 2012 },
    ]),
    household: KARIM_HOUSEHOLD,
    world: KARIM_WORLD,
  },
  sofie: {
    key: "sofie",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Sofie", 34, "Brugge", 0, "", 0, 1, [{ roadId: "first-job", year: 2015 }]),
    household: SOFIE_HOUSEHOLD,
    world: SOFIE_WORLD,
    preview: {
      roadId: "first-home",
      title: "Drive First home before you buy",
      line: "You used the mortgage simulator three times. 41.212 people drove the first two years after the keys; see what they hit.",
    },
  },
  marc: {
    key: "marc",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Marc", 26, "Gent", 0, "", 2, 1, [{ roadId: "first-job", year: 2022 }]),
    household: MARC_HOUSEHOLD,
  },
  nadia: {
    key: "nadia",
    roadId: "losing-parent",
    persona: ME("Nadia", 47, "Mechelen", 1, "My father passed away three weeks ago.", 2, 1, [{ roadId: "first-home", year: 2009 }]),
    // the road's own household is Nadia's
    household: LIVES["losing-parent"],
  },
};

// the advisor comes from the same Kate persona, so the Home and the Road name the same person
for (const p of Object.values(PEOPLE)) {
  const k = PERSONAS.find((x) => x.id === p.key);
  if (k) p.advisor = { name: k.advisor.name, office: k.advisor.office, nextSlot: k.advisor.nextSlot };
}

export const personRoad = (id: string): PersonRoad | undefined => PEOPLE[id];
