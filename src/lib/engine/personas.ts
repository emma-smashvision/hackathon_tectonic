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

const debit = { directDebit: true };

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
    id: "margaret",
    label: "Margaret, 74",
    tagline: "Retired, prefers large text and a calm screen",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "margaret",
        firstName: "Margaret",
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
        tx("j4", 9, "Luminus", -94, "utilities", debit),
        tx("j5", 12, "Transfer to Lieve (granddaughter)", -50, "transfer"),
        tx("j6", 59, "Federale Pensioendienst", 1_890, "pension_income"),
        tx("j7", 40, "Luminus", -94, "utilities", debit),
        tx("j8", 5, "Proximus", -46.99, "subscription", debit),
        tx("j9", 35, "Proximus", -34.99, "subscription", debit),
        tx("j10", 15, "Farys water", -38, "utilities", debit),
        tx("j11", 45, "Farys water", -38, "utilities", debit),
        tx("j12", 18, "Telenet TV", -42, "subscription", debit),
        tx("j13", 48, "Telenet TV", -42, "subscription", debit),
        tx("j14", 21, "Ethias home insurance", -31.5, "insurance", debit),
        tx("j15", 51, "Ethias home insurance", -31.5, "insurance", debit),
        tx("j16", 11, "Het Nieuwsblad", -29, "subscription", debit),
        tx("j17", 41, "Het Nieuwsblad", -29, "subscription", debit),
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
    id: "lina",
    label: "Lina, 31",
    tagline: "Loves city trips, Lisbon is next",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "lina",
        firstName: "Lina",
        age: 31,
        city: "Hasselt",
        occupation: "employee",
        household: "Lives with her partner",
        balance: 5_640.3,
        savings: 22_800,
        savingsGoals: [
          {
            id: "lina-g1",
            label: "City trips",
            kind: "travel",
            target: 3_000,
            saved: 2_150,
          },
        ],
        portfolioValue: 0,
        monthlyNetIncome: 3_300,
        advisorName: "Els Martens",
        currencies: [
          { code: "GBP", amount: 420, rate: 0.84 },
          { code: "USD", amount: 310, rate: 1.09 },
        ],
      },
      transactions: [
        tx("jn1", 2, "Delhaize Hasselt", -54.8, "groceries", {
          city: "Hasselt",
        }),
        tx("jn2", 4, "Savings — City trips", -150, "transfer"),
        tx("jn3", 8, "Proximus", -62, "utilities"),
        tx("jn4", 11, "Bistro Bonaparte", -46, "restaurant", {
          city: "Hasselt",
        }),
        tx("jn5", 24, "Salary — Stad Hasselt", 3_300, "salary"),
        tx("jn6", 38, "Proximus", -62, "utilities"),
        tx("jn7", 54, "Salary — Stad Hasselt", 3_300, "salary"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { transactions: 16, budget: 14 },
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
        appointments: [
          {
            id: "a1",
            title: "Mortgage advisor meeting",
            when: "Thu 1 Oct, 10:00",
            where: "KBC Mechelen",
          },
          {
            id: "a2",
            title: "Second viewing, Kerkstraat 12",
            when: "Sat 3 Oct, 14:00",
            where: "Immo Dewaele",
          },
          {
            id: "a3",
            title: "Intro with the estate agent",
            when: "Mon 21 Sep",
            where: "Immo Dewaele",
            done: true,
          },
        ],
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
        holdings: [
          { name: "Tech fund", value: 50_250, ytd: 0.18 },
          { name: "World ETF", value: 92_000, ytd: 0.12 },
          { name: "Bond fund", value: 42_000, ytd: -0.01 },
        ],
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
        tx("k9", 15, "Dividend — World ETF", 236, "investment"),
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
        holdings: [
          { name: "World ETF", value: 160_200, ytd: 0.14 },
          { name: "Euro Stoxx fund", value: 98_400, ytd: 0.06 },
          { name: "Bond fund", value: 90_000, ytd: 0.02 },
          { name: "Ageas", value: 30_200, ytd: 0.04 },
          { name: "Solvay", value: 42_000, ytd: -0.09 },
        ],
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
  {
    id: "emma",
    label: "Emma & Thomas",
    tagline: "Just won a hackathon — and €10,000",
    profile: {
      today: DEMO_TODAY,
      customer: {
        id: "emma",
        firstName: "Emma",
        age: 27,
        city: "Gent",
        occupation: "employee",
        household: "Emma & Thomas (joint account)",
        balance: 3_480.6,
        savings: 4_900,
        savingsGoals: [
          {
            id: "emma-g1",
            label: "Rainy-day buffer",
            kind: "emergency",
            target: 8_000,
            saved: 4_900,
          },
        ],
        portfolioValue: 0,
        monthlyNetIncome: 5_050,
        advisorName: "Sarah Claes",
        teamSize: 2,
      },
      transactions: [
        tx("e1", 1, "Club-Mate & pizza, Gent", -64.5, "restaurant", {
          city: "Gent",
        }),
        tx("e2", 3, "Colruyt Gent", -72.3, "groceries", { city: "Gent" }),
        tx("e3", 5, "Landlord Van Damme", -1_150, "rent", { city: "Gent" }),
        tx("e4", 7, "GitHub Copilot", -10, "subscription"),
        tx("e5", 24, "Salary — Emma", 2_600, "salary"),
        tx("e6", 24, "Salary — Thomas", 2_450, "salary"),
        tx("e7", 35, "Landlord Van Damme", -1_150, "rent", { city: "Gent" }),
        tx("e8", 37, "GitHub Copilot", -10, "subscription"),
      ],
      behaviour: {
        ...QUIET_BEHAVIOUR,
        widgetTaps: { transactions: 14, budget: 16 },
      },
    },
  },
];

export function getPersona(id: string): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}
