// KBC One: one person = one Kate customer (the past and the present: transactions, blocks,
// Kate) + one household and road (the future: Hindsight's replay, the crowd, the city).
// All data is synthetic. Households are written to match each Kate persona's numbers
// (balance, savings, salary day and amount, direct debits), so the Home and the Road agree.

import { type LifeDef, LIVES, type Yearly } from "../hindsight/engine/lives";
import { EVERYDAY_ONLY_ID } from "../hindsight/engine/roads";
import type { Persona } from "../hindsight/engine/types";

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
  balance: 2311,
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
  },
  lina: {
    key: "lina",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Lina", 31, "Leuven", 0, "", 2, 1, [{ roadId: "first-child", year: 2018 }]),
    household: LINA_HOUSEHOLD,
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
  },
  sofie: {
    key: "sofie",
    roadId: EVERYDAY_ONLY_ID,
    persona: ME("Sofie", 34, "Brugge", 0, "", 0, 1, [{ roadId: "first-job", year: 2015 }]),
    household: SOFIE_HOUSEHOLD,
    preview: {
      roadId: "first-home",
      title: "Drive First home before you buy",
      line: "You used the mortgage simulator three times. 41.212 people drove the first two years after the keys; see what they hit.",
    },
  },
  nadia: {
    key: "nadia",
    roadId: "losing-parent",
    persona: ME("Nadia", 47, "Mechelen", 1, "My father passed away three weeks ago.", 2, 1, [{ roadId: "first-home", year: 2009 }]),
    // the road's own household is Nadia's
    household: LIVES["losing-parent"],
  },
};

export const personRoad = (id: string): PersonRoad | undefined => PEOPLE[id];
