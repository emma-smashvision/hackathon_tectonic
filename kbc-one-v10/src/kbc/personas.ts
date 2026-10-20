import type { Persona, Tx } from "./types";

// Synthetic demo customers. No real people, accounts or payments.

let seq = 0;
const tx = (
  date: string,
  merchant: string,
  category: string,
  amount: number,
  extra: Partial<Tx> = {},
): Tx => ({ id: `t${++seq}`, date, merchant, category, amount, ...extra });

const coffee = (month: string, days: number[], shops: string[], price = 2.8) =>
  days.map((d, i) =>
    tx(
      `2026-${month}-${String(d).padStart(2, "0")}T08:${10 + (i % 40)}:00`,
      shops[i % shops.length],
      "coffee",
      -price - (i % 3) * 0.4,
    ),
  );

const tom: Persona = {
  id: "tom",
  name: "Tom",
  short: "29 · moving to Gent · just paid dinner for four",
  initial: "T",
  color: "#1b6fd1",
  now: "2026-10-17T22:18:00",
  city: "Gent",
  accounts: { current: 1987.4, savings: 6200 },
  salary: { amount: 2840, day: 25, payer: "Studio Kade bv" },
  transactions: [
    tx("2026-10-17T22:14:00", "Bar Bidon", "restaurant", -128.4, {
      city: "Gent",
    }),
    tx("2026-10-16T18:02:00", "Delhaize Gent", "groceries", -43.2),
    tx("2026-10-15T12:40:00", "NMBS", "transport", -8.6),
    tx("2026-10-12T19:30:00", "Lien", "transfer_in", 18.5),
    tx("2026-10-09T10:00:00", "Verhuisfirma Snel", "moving", -480),
    tx("2026-10-06T09:12:00", "Immo Vandamme", "rent", -950, { city: "Gent" }),
    tx("2026-10-03T15:20:00", "IKEA Gent", "furniture", -349),
    tx("2026-10-02T13:05:00", "Brico Gent", "furniture", -200),
    tx("2026-10-01T07:00:00", "Delhaize Gent", "groceries", -61.9),
    tx("2026-09-25T06:00:00", "Studio Kade bv", "salary", 2790),
    tx("2026-09-28T20:10:00", "Bar Bidon", "restaurant", -96, { city: "Gent" }),
    tx("2026-09-14T21:00:00", "Pakhuis", "restaurant", -132, { city: "Gent" }),
    ...coffee(
      "10",
      [1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 16, 17],
      ["Café Labath", "Barista Gent", "Starbucks Korenmarkt"],
    ),
    ...coffee(
      "09",
      [2, 3, 4, 8, 9, 10, 11, 15, 16, 17, 22, 23, 24, 25, 29, 30],
      ["Café Labath", "Barista Gent"],
    ),
  ],
  debits: [
    {
      id: "d1",
      payee: "Proximus",
      amount: 74,
      previous: 62,
      due: "2026-10-22",
      kind: "direct_debit",
      lastUsed: "2026-10-17",
    },
    {
      id: "d2",
      payee: "Engie",
      amount: 140,
      due: "2026-10-22",
      kind: "direct_debit",
    },
    {
      id: "d3",
      payee: "Netflix",
      amount: 13.99,
      due: "2026-10-28",
      kind: "direct_debit",
      lastUsed: "2026-10-15",
    },
    {
      id: "d4",
      payee: "Spotify",
      amount: 11.99,
      due: "2026-10-30",
      kind: "direct_debit",
      lastUsed: "2026-08-10",
    },
  ],
  goals: [
    {
      id: "g1",
      name: "Gent flat fund",
      target: 3000,
      saved: 2160,
      monthly: 300,
    },
  ],
  contacts: [
    { id: "lien", name: "Lien", kbc: true, color: "#7c3aed" },
    { id: "arne", name: "Arne", kbc: true, color: "#0f766e" },
    { id: "sam", name: "Sam", kbc: false, color: "#b45309" },
  ],
  splitGroup: ["lien", "arne", "sam"],
  moving: {
    to: "Gent",
    date: "2026-11-01",
    budget: 1500,
    steps: [
      { label: "Rental deposit account", done: true },
      { label: "Movers booked", done: true },
      { label: "Home insurance moved", done: true },
      { label: "New address to Proximus", done: false },
      { label: "Register at Gent city hall", done: false },
    ],
  },
  card: { last4: "4821", frozen: false, regions: ["BE", "EU"] },
  advisor: { name: "Jonas", office: "KBC Gent Kouter", nextSlot: "Tue 14:00" },
  behaviour: {
    largeText: false,
    zoomsPerWeek: 0,
    misTapRate: 0.01,
    opensPerWeek: 9,
  },
  calendar: [
    { date: "2026-10-22", label: "Proximus and Engie", amount: -214 },
    { date: "2026-10-25", label: "Salary", amount: 2840 },
    { date: "2026-11-01", label: "Rent Gent", amount: -950 },
    {
      date: "2026-11-02",
      label: "Car insurance renews (8% more)",
      amount: -412,
    },
  ],
  beliefs: [
    {
      id: "b1",
      text: "Moving to Gent on 1 November",
      source: "You confirmed on 3 Oct",
      status: "told",
    },
    {
      id: "b2",
      text: "You split dinners with Lien, Arne and Sam",
      source: "Your last 3 split requests",
      status: "inferred",
      forget: "after 6 months",
    },
    {
      id: "b3",
      text: "Buying a house",
      source: "You said no on 12 Sep",
      status: "said_no",
    },
  ],
};

const lina: Persona = {
  id: "lina",
  name: "Lina",
  short: "31 · weekend in London · daughter Noor",
  initial: "L",
  color: "#9333ea",
  now: "2026-10-17T13:05:00",
  city: "Leuven",
  abroad: {
    country: "UK",
    city: "London",
    until: "2026-10-18",
    currency: "GBP",
    dailySpend: 40,
  },
  accounts: {
    current: 1486.3,
    savings: 4200,
    pocketGBP: 18.2,
    child: { name: "Noor", balance: 3.1, weekly: 15, day: "Saturday" },
  },
  salary: { amount: 2610, day: 26, payer: "KU Leuven" },
  transactions: [
    tx("2026-10-17T12:40:00", "Pret A Manger", "restaurant", -11.4, {
      currency: "GBP",
      city: "London",
    }),
    tx("2026-10-17T10:15:00", "TfL", "transport", -8.5, {
      currency: "GBP",
      city: "London",
    }),
    tx("2026-10-16T19:30:00", "Dishoom", "restaurant", -38, {
      currency: "GBP",
      city: "London",
    }),
    tx("2026-10-16T14:00:00", "Tate Shop", "shopping", -24, {
      currency: "GBP",
      city: "London",
    }),
    tx("2026-10-15T18:00:00", "Hotel Hoxton", "travel", -312, {
      currency: "GBP",
      city: "London",
    }),
    tx("2026-10-15T09:00:00", "Eurostar", "travel", -168),
    tx("2026-10-11T09:00:00", "Noor pocket money", "family", -15),
    tx("2026-10-10T17:20:00", "Colruyt Leuven", "groceries", -72.3),
    tx("2026-09-26T06:00:00", "KU Leuven", "salary", 2610),
    ...coffee(
      "10",
      [1, 3, 6, 8, 10, 13, 14],
      ["Koffie Onan", "Barista Leuven"],
    ),
  ],
  debits: [
    {
      id: "d1",
      payee: "Telenet",
      amount: 58,
      due: "2026-10-24",
      kind: "direct_debit",
    },
    {
      id: "d2",
      payee: "Rent Leuven",
      amount: 890,
      due: "2026-11-01",
      kind: "standing_order",
    },
  ],
  goals: [{ id: "g1", name: "City trips", target: 1200, saved: 540 }],
  contacts: [{ id: "noor", name: "Noor", kbc: true, color: "#db2777" }],
  card: { last4: "5530", frozen: false, regions: ["BE", "EU", "UK"] },
  esim: { country: "UK", leftGB: 0.4 },
  advisor: {
    name: "Sara",
    office: "KBC Leuven Ladeuze",
    nextSlot: "Mon 10:30",
  },
  behaviour: {
    largeText: false,
    zoomsPerWeek: 0,
    misTapRate: 0.02,
    opensPerWeek: 12,
  },
  calendar: [
    { date: "2026-10-18", label: "Eurostar home" },
    { date: "2026-10-18", label: "Noor's pocket money", amount: -15 },
    { date: "2026-10-24", label: "Telenet", amount: -58 },
  ],
  beliefs: [
    {
      id: "b1",
      text: "London trip, 15–18 Oct",
      source: "From your Eurostar booking · you confirmed",
      status: "told",
    },
    {
      id: "b2",
      text: "Noor gets €15 every Saturday",
      source: "Your own habit · you confirmed",
      status: "told",
    },
    {
      id: "b3",
      text: "You spend about £40 a day in London",
      source: "Card payments, last 3 days",
      status: "inferred",
      forget: "after the trip",
    },
  ],
};

const margaret: Persona = {
  id: "margaret",
  name: "Margaret",
  short: "74 · zooms in, likes it simple · paid twice",
  initial: "M",
  color: "#0e7490",
  now: "2026-10-17T10:20:00",
  city: "Mechelen",
  accounts: { current: 3240.55, savings: 38400 },
  pension: { amount: 1890, next: "2026-10-23" },
  transactions: [
    tx("2026-10-15T06:00:00", "Luminus", "energy", -84.2),
    tx("2026-10-14T06:00:00", "Luminus", "energy", -84.2),
    tx("2026-10-13T10:00:00", "Apotheek", "other", -12.4),
    tx("2026-10-11T09:30:00", "Delhaize Mechelen", "groceries", -54.1),
    tx("2026-09-23T06:00:00", "Federale Pensioendienst", "pension", 1890),
    tx("2026-09-14T06:00:00", "Luminus", "energy", -84.2),
  ],
  debits: [
    {
      id: "d1",
      payee: "Proximus",
      amount: 52,
      previous: 40,
      due: "2026-10-21",
      kind: "direct_debit",
    },
    {
      id: "d2",
      payee: "Luminus",
      amount: 84.2,
      due: "2026-11-14",
      kind: "direct_debit",
    },
    {
      id: "d3",
      payee: "De Watergroep",
      amount: 31,
      due: "2026-10-28",
      kind: "direct_debit",
    },
    {
      id: "d4",
      payee: "Mutualiteit",
      amount: 12,
      due: "2026-11-02",
      kind: "direct_debit",
    },
  ],
  goals: [],
  contacts: [],
  card: { last4: "1188", frozen: false, regions: ["BE"] },
  advisor: { name: "An", office: "KBC Mechelen", nextSlot: "Wed 09:30" },
  behaviour: {
    largeText: true,
    zoomsPerWeek: 14,
    misTapRate: 0.12,
    opensPerWeek: 4,
  },
  calendar: [{ date: "2026-10-23", label: "Pension", amount: 1890 }],
  beliefs: [
    {
      id: "b1",
      text: "You prefer bigger text and fewer items",
      source: "You often zoom in",
      status: "inferred",
    },
  ],
};

const karim: Persona = {
  id: "karim",
  name: "Karim",
  short: "45 · freelance designer · client just paid",
  initial: "K",
  color: "#0f766e",
  now: "2026-10-17T16:40:00",
  city: "Antwerpen",
  accounts: { current: 7904.12, savings: 21050, business: 12380 },
  transactions: [
    tx("2026-10-17T16:31:00", "Atelier Vos", "invoice_paid", 1200, {
      account: "business",
    }),
    tx("2026-10-15T11:00:00", "Adobe", "software", -71.99, {
      account: "business",
    }),
    tx("2026-10-12T09:00:00", "Coolblue", "equipment", -899, {
      account: "business",
    }),
    tx("2026-10-09T20:00:00", "Delhaize Antwerpen", "groceries", -88.4),
    tx("2026-10-04T10:00:00", "Kortrijk Design", "invoice_paid", 3100, {
      account: "business",
    }),
    ...coffee(
      "10",
      [2, 5, 9, 12, 14, 16],
      ["Normo Coffee", "Caffènation"],
      3.2,
    ),
  ],
  debits: [
    {
      id: "d1",
      payee: "Sociale verzekeringsfonds",
      amount: 920,
      due: "2026-11-01",
      kind: "direct_debit",
    },
    {
      id: "d2",
      payee: "Adobe",
      amount: 71.99,
      due: "2026-11-15",
      kind: "direct_debit",
      lastUsed: "2026-10-17",
    },
  ],
  goals: [],
  contacts: [],
  invoices: [
    { client: "Studio Noord", amount: 4850, due: "2026-10-24" },
    { client: "Kortrijk Design", amount: 2300, due: "2026-10-30" },
    { client: "BXL Events", amount: 700, due: "2026-10-11" },
  ],
  taxReserve: { saved: 8420, target: 11000, vatDue: "2026-01-20", rate: 0.21 },
  portfolio: {
    weekPct: 1.8,
    checksPerWeek: 12,
    holdings: [
      { name: "World equity ETF", value: 24100, changePct: 2.3 },
      { name: "Sustainable fund", value: 11800, changePct: 1.1 },
      { name: "Euro bonds", value: 6410, changePct: -0.2 },
    ],
  },
  pensionSaving: { paid: 870, limit: 1050, fundValue: 14920 },
  card: { last4: "7702", frozen: false, regions: ["BE", "EU"] },
  advisor: {
    name: "Pieter",
    office: "KBC Antwerpen Meir",
    nextSlot: "Thu 11:00",
  },
  behaviour: {
    largeText: false,
    zoomsPerWeek: 0,
    misTapRate: 0.01,
    opensPerWeek: 20,
  },
  calendar: [
    { date: "2026-10-24", label: "Studio Noord invoice due", amount: 4850 },
    { date: "2026-11-01", label: "Social contributions", amount: -920 },
    { date: "2026-12-31", label: "Last day for pension saving" },
  ],
  beliefs: [
    {
      id: "b1",
      text: "Self-employed, VAT quarterly",
      source: "You told us at onboarding",
      status: "told",
    },
  ],
};

const sofie: Persona = {
  id: "sofie",
  name: "Sofie",
  short: "34 · physiotherapist · practice growing",
  initial: "S",
  color: "#0369a1",
  now: "2026-10-17T20:45:00",
  city: "Brugge",
  accounts: { current: 2310.8, savings: 41300 },
  salary: { amount: 2950, day: 28, payer: "AZ Sint-Jan" },
  transactions: [
    tx("2026-10-16T20:00:00", "KBC mortgage simulator", "app", 0),
    tx("2026-10-14T18:00:00", "Immoweb Premium", "housing", -9.99),
    tx("2026-10-12T11:00:00", "Colruyt Brugge", "groceries", -96.2),
    tx("2026-10-07T10:00:00", "Physiotherapy association · yearly membership", "work", -95),
    tx("2026-10-05T09:00:00", "Transfer to house fund", "savings", -500),
    tx("2026-09-28T06:00:00", "AZ Sint-Jan", "salary", 2950),
    ...coffee("10", [3, 10, 17], ["Li O Lait"], 3.4),
  ],
  debits: [
    {
      id: "d1",
      payee: "Rent Brugge",
      amount: 980,
      due: "2026-11-01",
      kind: "standing_order",
    },
    {
      id: "d2",
      payee: "Orange",
      amount: 45,
      due: "2026-10-25",
      kind: "direct_debit",
    },
  ],
  goals: [
    {
      id: "g1",
      name: "Our first home",
      target: 60000,
      saved: 41300,
      monthly: 1000,
    },
  ],
  contacts: [{ id: "pieter", name: "Pieter", kbc: true, color: "#2563eb" }],
  home: {
    fund: 41300,
    target: 60000,
    nextAppointment: "Thu 10:00 · mortgage advisor",
  },
  card: { last4: "3391", frozen: false, regions: ["BE", "EU"] },
  advisor: { name: "Ellen", office: "KBC Brugge Markt", nextSlot: "Thu 10:00" },
  behaviour: {
    largeText: false,
    zoomsPerWeek: 1,
    misTapRate: 0.02,
    opensPerWeek: 7,
  },
  calendar: [
    { date: "2026-10-23", label: "Mortgage advisor, Thu 10:00" },
    { date: "2026-10-28", label: "Salary", amount: 2950 },
  ],
  beliefs: [
    {
      id: "b1",
      text: "Buying a first home with Pieter",
      source: "Your savings goal · you confirmed",
      status: "told",
    },
  ],
};


const nadia: Persona = {
  id: "nadia",
  name: "Nadia",
  short: "47 · a hard month · calm home, a person first",
  initial: "N",
  color: "#7c6fb0",
  now: "2026-10-17T19:10:00",
  city: "Mechelen",
  care: true,
  accounts: { current: 2900, savings: 9500 },
  salary: { amount: 2750, day: 28, payer: "AZ Sint-Maarten" },
  transactions: [
    tx("2026-10-16T18:20:00", "Delhaize Mechelen", "groceries", -38.6),
    tx("2026-10-14T12:10:00", "Bakkerij Lemmens", "groceries", -9.4),
    tx("2026-10-11T10:30:00", "NMBS", "transport", -12.2),
    tx("2026-10-08T17:45:00", "Colruyt Mechelen", "groceries", -64.3),
    tx("2026-10-02T06:00:00", "KBC mortgage", "housing", -720),
    tx("2026-09-28T06:00:00", "AZ Sint-Maarten", "salary", 2750),
  ],
  debits: [
    {
      id: "d1",
      payee: "Subscriptions",
      amount: 20,
      due: "2026-10-20",
      kind: "direct_debit",
    },
    {
      id: "d2",
      payee: "KBC mortgage",
      amount: 720,
      due: "2026-11-02",
      kind: "direct_debit",
    },
    {
      id: "d3",
      payee: "Energy advance",
      amount: 130,
      due: "2026-11-06",
      kind: "direct_debit",
    },
  ],
  goals: [],
  contacts: [],
  card: { last4: "6610", frozen: false, regions: ["BE", "EU"] },
  advisor: { name: "Els", office: "KBC Mechelen Bruul", nextSlot: "Mon 16:00" },
  behaviour: {
    largeText: false,
    zoomsPerWeek: 0,
    misTapRate: 0.02,
    opensPerWeek: 3,
  },
  calendar: [
    { date: "2026-10-20", label: "Subscriptions", amount: -20 },
    { date: "2026-10-28", label: "Salary", amount: 2750 },
  ],
  beliefs: [
    {
      id: "b1",
      text: "Your father passed away in September",
      source: "You told Kate on 27 Sep",
      status: "told",
    },
    {
      id: "b2",
      text: "No suggestions for now",
      source: "You chose this on 27 Sep",
      status: "told",
    },
  ],
};

// ---------- Marc: an app on the side; just bought a domain name ----------
const marc: Persona = {
  id: "marc",
  name: "Marc",
  short: "26 · building an app · just bought a domain",
  initial: "M",
  color: "#0e7490",
  now: "2026-10-17T18:30:00",
  city: "Gent",
  accounts: { current: 3120.4, savings: 12800 },
  salary: { amount: 2980, day: 25, payer: "Lumen Labs nv" },
  transactions: [
    tx("2026-10-16T21:10:00", "Figma", "software", -15),
    tx("2026-10-14T13:00:00", "Coworking Gent · day pass", "work", -18),
    tx("2026-10-13T22:40:00", "Apple Developer Program", "software", -99),
    tx("2026-10-12T20:05:00", "Combell · domain name", "software", -14.99),
    tx("2026-10-10T18:30:00", "Delhaize Gent", "groceries", -54.6),
    tx("2026-10-06T09:00:00", "Transfer to startup buffer", "savings", -400),
    tx("2026-09-25T06:00:00", "Lumen Labs nv", "salary", 2980),
    ...coffee("10", [2, 7, 9, 14, 16], ["Mokabon", "Barista Gent"], 3.2),
  ],
  debits: [
    { id: "d1", payee: "Rent Gent", amount: 820, due: "2026-11-01", kind: "standing_order" },
    { id: "d2", payee: "Proximus", amount: 39, due: "2026-10-26", kind: "direct_debit" },
  ],
  goals: [{ id: "g1", name: "Startup buffer", target: 15000, saved: 12800, monthly: 400 }],
  contacts: [{ id: "yara", name: "Yara", kbc: true, color: "#0ea5e9" }],
  card: { last4: "7742", frozen: false, regions: ["BE", "EU"] },
  advisor: { name: "Wim", office: "KBC Gent Kouter", nextSlot: "Tue 14:00" },
  behaviour: { largeText: false, zoomsPerWeek: 0, misTapRate: 0.01, opensPerWeek: 15 },
  calendar: [
    { date: "2026-10-25", label: "Salary", amount: 2980 },
    { date: "2026-10-26", label: "Proximus", amount: -39 },
  ],
  beliefs: [
    { id: "b1", text: "Building an app on the side", source: "Domain name, developer account and software · inferred", status: "inferred" },
  ],
};

// Rail order follows the pitch: travel, moving, then the two business roads.
export const PERSONAS: Persona[] = [lina, tom, sofie, marc, karim, margaret, nadia];
export const PERSONA_IDS = PERSONAS.map((p) => p.id);

export function seedPersona(id: string): Persona | undefined {
  const p = PERSONAS.find((x) => x.id === id);
  return p ? structuredClone(p) : undefined;
}
