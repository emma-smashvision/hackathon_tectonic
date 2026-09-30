import type { BehaviourSignals, Profile, Transaction } from "./types";

/** Reference date for the synthetic dataset. */
export const DEMO_TODAY = "2026-09-30";

export function daysAgo(days: number, today = DEMO_TODAY): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function tx(
  id: string,
  ago: number,
  merchant: string,
  amount: number,
  category: Transaction["category"],
  extra: Partial<Transaction> = {},
): Transaction {
  return { id, date: daysAgo(ago), merchant, amount, category, ...extra };
}

const QUIET_BEHAVIOUR: BehaviourSignals = {
  widgetTaps: {},
  zoomUsage: 0,
  errorRate: 0.02,
  portfolioViewsPerWeek: 0,
  pageViews: {},
  largeTextEnabled: false,
};

export interface Persona {
  id: string;
  label: string;
  tagline: string;
  profile: Profile;
}

export const PERSONAS: Persona[] = [
  {
    id: "jana",
    label: "Jana, 74",
    tagline: "Retired, prefers large text and a calm screen",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "jana",
        firstName: "Jana",
        age: 74,
        city: "Brugge",
        occupation: "retired",
        household: "Lives alone",
        balance: 3_240.55,
        savings: 38_400,
        savingsGoals: [],
        portfolioValue: 0,
        monthlyNetIncome: 1_890,
        advisorName: "An Peeters",
      },
      transactions: [
        tx("j1", 2, "Apotheek Sint-Jan", -23.4, "groceries", {
          city: "Brugge",
        }),
        tx("j2", 4, "Delhaize Brugge", -61.2, "groceries", { city: "Brugge" }),
        tx("j3", 29, "Federale Pensioendienst", 1_890, "pension_income"),
        tx("j4", 9, "Luminus", -94, "utilities"),
        tx("j5", 12, "Transfer to Lieve (granddaughter)", -50, "transfer"),
        tx("j6", 59, "Federale Pensioendienst", 1_890, "pension_income"),
        tx("j7", 40, "Luminus", -94, "utilities"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { transactions: 12, balance: 30 },
        zoomUsage: 0.45,
        errorRate: 0.14,
        largeTextEnabled: true,
      },
    },
  },
  {
    id: "tom",
    label: "Tom, 29",
    tagline: "About to start renting in a new city",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "tom",
        firstName: "Tom",
        age: 29,
        city: "Leuven",
        occupation: "employee",
        household: "Single",
        balance: 2_115.8,
        savings: 6_200,
        savingsGoals: [
          {
            id: "tom-g1",
            label: "Emergency fund",
            kind: "emergency",
            target: 10_000,
            saved: 6_200,
          },
        ],
        portfolioValue: 0,
        monthlyNetIncome: 2_450,
        advisorName: "Jonas De Smet",
      },
      transactions: [
        tx("t1", 1, "Colruyt Leuven", -48.3, "groceries", { city: "Leuven" }),
        tx("t2", 3, "De Werf", -27.5, "restaurant", { city: "Leuven" }),
        tx("t3", 5, "Transfer to Arne", -40, "transfer"),
        tx("t4", 6, "Spotify", -11.99, "subscription"),
        tx("t5", 25, "Salary — Brightlane NV", 2_450, "salary"),
        tx("t6", 36, "Spotify", -11.99, "subscription"),
        tx("t7", 55, "Salary — Brightlane NV", 2_450, "salary"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { budget: 18, transactions: 20 },
      },
    },
  },
  {
    id: "sofie",
    label: "Sofie, 34 & Pieter",
    tagline: "Saving for a first home together",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "sofie",
        firstName: "Sofie",
        age: 34,
        city: "Mechelen",
        occupation: "employee",
        household: "Sofie & Pieter (joint account)",
        balance: 4_870.1,
        savings: 41_300,
        savingsGoals: [
          {
            id: "sofie-g1",
            label: "Our first home",
            kind: "house",
            target: 60_000,
            saved: 41_300,
          },
        ],
        portfolioValue: 0,
        monthlyNetIncome: 5_300,
        advisorName: "Leen Wouters",
      },
      transactions: [
        tx("s1", 2, "Albert Heijn Mechelen", -86.4, "groceries", {
          city: "Mechelen",
        }),
        tx("s2", 4, "Savings — Our first home", -750, "transfer"),
        tx("s3", 5, "Landlord Verbeeck", -1_050, "rent", { city: "Mechelen" }),
        tx("s4", 24, "Salary — Sofie", 2_750, "salary"),
        tx("s5", 24, "Salary — Pieter", 2_550, "salary"),
        tx("s6", 35, "Landlord Verbeeck", -1_050, "rent", { city: "Mechelen" }),
        tx("s7", 44, "Engie", -118, "utilities"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { transactions: 10 },
        pageViews: { mortgageSimulator: 2 },
      },
    },
  },
  {
    id: "karim",
    label: "Karim, 45",
    tagline: "Freelance consultant who actively invests",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "karim",
        firstName: "Karim",
        age: 45,
        city: "Antwerpen",
        occupation: "freelancer",
        household: "Married, two kids",
        balance: 18_930.4,
        savings: 52_000,
        savingsGoals: [],
        portfolioValue: 184_250,
        monthlyNetIncome: 5_150,
        advisorName: "Pieter Janssens",
      },
      transactions: [
        tx(
          "k1",
          3,
          "Invoice 2026-031 — Norrland BV",
          6_200,
          "freelance_income",
        ),
        tx("k2", 6, "Monthly investment plan", -500, "investment"),
        tx("k3", 10, "Delhaize Antwerpen", -142.8, "groceries"),
        tx(
          "k4",
          21,
          "Invoice 2026-030 — Studio Meir",
          2_100,
          "freelance_income",
        ),
        tx("k5", 33, "Tax prepayment Q3", -3_100, "tax"),
        tx("k6", 36, "Monthly investment plan", -500, "investment"),
        tx("k7", 48, "Invoice 2026-028 — Havenlab", 8_900, "freelance_income"),
        tx(
          "k8",
          77,
          "Invoice 2026-026 — Norrland BV",
          3_400,
          "freelance_income",
        ),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { investments: 25, transactions: 14 },
        portfolioViewsPerWeek: 5,
      },
    },
  },
  {
    id: "marc",
    label: "Marc, 71",
    tagline: "Retired — and checks his portfolio every day",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "marc",
        firstName: "Marc",
        age: 71,
        city: "Gent",
        occupation: "retired",
        household: "Married",
        balance: 7_410.25,
        savings: 95_000,
        savingsGoals: [],
        portfolioValue: 420_800,
        monthlyNetIncome: 2_650,
        advisorName: "Katrien Maes",
      },
      transactions: [
        tx("m1", 1, "Monthly investment plan", -1_000, "investment"),
        tx("m2", 2, "Carrefour Gent", -74.9, "groceries", { city: "Gent" }),
        tx("m3", 8, "Dividend — Euro Stoxx fund", 412, "investment"),
        tx("m4", 28, "Federale Pensioendienst", 2_650, "pension_income"),
        tx("m5", 31, "Monthly investment plan", -1_000, "investment"),
        tx("m6", 58, "Federale Pensioendienst", 2_650, "pension_income"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { investments: 40, transactions: 8 },
        portfolioViewsPerWeek: 12,
        zoomUsage: 0.05,
        errorRate: 0.03,
      },
    },
  },
];

export function getPersona(id: string): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}
