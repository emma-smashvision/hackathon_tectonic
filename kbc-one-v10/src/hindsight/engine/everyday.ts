import type { Behaviour, RoadDef, StopDef } from "./types";

// The Everyday Road: the money year every Belgian household drives, every year.
// Life roads (first home, first child, …) branch off it and merge back onto it.
// Its stops are the Belgian money calendar. Timings are typical, amounts are
// synthetic, and every crowd number still comes from the simulation + crowd gate.

export const TODAY = { year: 2026, month: 9, day: 17 }; // Saturday 17 October 2026

export interface Cal {
  year: number;
  /** 0 = January */
  month: number;
}

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Calendar month of journey month k, when journey month `anchor` is today. */
export function calOf(anchor: number, k: number): Cal {
  const idx = TODAY.year * 12 + TODAY.month + (k - anchor);
  return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

/** Journey month whose calendar month is c. */
export function kOf(anchor: number, c: Cal): number {
  return anchor + (c.year * 12 + c.month) - (TODAY.year * 12 + TODAY.month);
}

export const daysIn = (c: Cal) => new Date(Date.UTC(c.year, c.month + 1, 0)).getUTCDate();
export const calLabel = (c: Cal) => `${MONTH_SHORT[c.month]} ${c.year}`;
export const dayLabel = (c: Cal, day: number) => `${Math.min(day, daysIn(c))} ${MONTH_SHORT[c.month]}`;
export function weekday(c: Cal, day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(c.year, c.month, Math.min(day, daysIn(c)))).getUTCDay()];
}
export const calIndex = (c: Cal) => c.year * 12 + c.month;

const b = (id: string, label: string, base: number, lift: number, action: string, readiness: number): Behaviour => ({
  id,
  label,
  base,
  lift,
  action: { label: action, readiness },
});

export interface EverydayStop extends StopDef {
  /** 0 = January */
  calMonth: number;
  day: number;
  /** which yearly amount in a life applies (signed in the life: + money in, − money out) */
  yearlyKey: string;
}

export const EVERYDAY_STOPS: EverydayStop[] = [
  {
    id: "renewals",
    calMonth: 0,
    day: 12,
    month: 1,
    kind: "bump",
    yearlyKey: "renewals",
    title: "Yearly premiums and fees renew",
    short: "Renewals",
    advice: "Many yearly premiums and fees land in the same weeks of January. People who spread them over the year didn't feel January.",
    amount: { median: 380, sigma: 0.45, threshold: 600 },
    behaviours: [
      b("spread", "Spread yearly premiums over twelve months", 0.3, 0.6, "Spread my yearly premiums", 60),
      b("review", "Reviewed their cover once a year", 0.35, 0.25, "Review my cover in December", 20),
    ],
    notes: [{ text: "Ask for monthly premiums. It costs a little more and January stops hurting.", by: "On the Everyday Road since 2019" }],
  },
  {
    id: "energy-year",
    calMonth: 2,
    day: 18,
    month: 3,
    kind: "bump",
    yearlyKey: "energy",
    title: "The yearly energy settlement",
    short: "Energy settlement",
    advice: "Once a year your advances are compared with what you really used. People who adjusted their advance after winter rarely had to top up.",
    amount: { median: 210, sigma: 0.7, threshold: 350 },
    behaviours: [
      b("advance", "Adjusted their monthly advance in autumn", 0.3, 0.55, "Check my energy advance", 40),
      b("meter", "Read their meter every quarter", 0.25, 0.3, "Remind me to read the meter", 20),
    ],
    notes: [{ text: "Read the meter in October and adjust the advance before winter, not after.", by: "On the Everyday Road since 2021" }],
  },
  {
    id: "holiday-pay",
    calMonth: 4,
    day: 29,
    month: 5,
    kind: "boost",
    yearlyKey: "holidayPay",
    title: "Holiday pay lands",
    short: "Holiday pay",
    advice: "Most employees get their holiday pay in May or June. People who parked part of it had the summer and the autumn covered.",
    amount: { median: 2100, sigma: 0.35 },
    action: { label: "Park half of it when it lands", readiness: 40 },
    notes: [{ text: "Half of my holiday pay goes to savings the day it lands. The other half is the holiday.", by: "On the Everyday Road since 2017" }],
  },
  {
    id: "tax-return",
    calMonth: 5,
    day: 30,
    month: 6,
    kind: "milestone",
    yearlyKey: "none",
    title: "Your tax return is due",
    short: "Tax return",
    advice: "Most people file online between May and July, and many only need to check a pre-filled proposal. Checking it is where people found missed deductions.",
    rate: { p: 0.64, label: "checked their pre-filled return before the deadline" },
    action: { label: "Remind me in May", readiness: 50 },
    notes: [{ text: "Check the childcare and pension-saving boxes. They're the ones people forget.", by: "On the Everyday Road since 2020" }],
  },
  {
    id: "holidays",
    calMonth: 6,
    day: 15,
    month: 7,
    kind: "bump",
    yearlyKey: "holidays",
    hitVerb: "spent more than",
    title: "Summer holidays",
    short: "Holidays",
    advice: "The most expensive month for many households. People who set the budget in spring spent about the same and worried less.",
    amount: { median: 1300, sigma: 0.55, threshold: 1800 },
    behaviours: [
      b("park", "Parked part of their holiday pay for it", 0.35, 0.6, "Park 40% of my holiday pay for it", 50),
      b("budget", "Set a holiday budget in spring", 0.3, 0.35, "Set a holiday budget", 30),
      b("pot", "Saved a holiday pot through the year", 0.25, 0.5, "Start a holiday pot", 40),
    ],
    notes: [{ text: "Book in January, pay the deposit from the pot. July is then just the holiday.", by: "On the Everyday Road since 2018" }],
  },
  {
    id: "property-tax",
    calMonth: 7,
    day: 14,
    month: 8,
    kind: "bump",
    yearlyKey: "propertyTax",
    title: "The property tax letter",
    short: "Property tax",
    advice: "Owners get it once a year, usually in summer. Spread over twelve months it is a small amount.",
    amount: { median: 1050, sigma: 0.3, threshold: 1200 },
    behaviours: [
      b("spread", "Spread it over the year", 0.3, 0.45, "Spread it out monthly", 60),
      b("knew", "Knew when it was coming", 0.45, 0.2, "Add it to my calendar", 20),
    ],
    notes: [{ text: "Same letter every summer. A small monthly pot and it's a non-event.", by: "On the Everyday Road since 2016" }],
  },
  {
    id: "school",
    calMonth: 7,
    day: 28,
    month: 8,
    kind: "bump",
    yearlyKey: "school",
    title: "Back to school",
    short: "School start",
    advice: "Books, trips and fees land in late August and September. The school bonus usually arrives in August; families who kept it for this barely noticed.",
    amount: { median: 340, sigma: 0.45, threshold: 500 },
    behaviours: [
      b("bonus", "Kept the school bonus for it", 0.4, 0.5, "Earmark the school bonus", 40),
      b("second", "Bought books and gear second-hand", 0.3, 0.3, "Remind me about second-hand sales", 20),
      b("pot", "Put a little aside each month", 0.25, 0.45, "Start a €30 a month school pot", 40),
    ],
    notes: [{ text: "Older students sell last year's books in June. Half the price.", by: "On the Everyday Road since 2015" }],
  },
  {
    id: "tax-assessment",
    calMonth: 8,
    day: 22,
    month: 9,
    kind: "milestone",
    yearlyKey: "taxResult",
    title: "The tax assessment arrives",
    short: "Tax letter",
    advice: "It tells you whether you get money back or pay extra. It often lands in the second half of the year.",
    rate: { p: 0.36, label: "had to pay extra" },
    action: { label: "Keep a little aside for it", readiness: 50 },
    notes: [{ text: "If you had to pay last year, you probably will again. Keep it aside from May.", by: "On the Everyday Road since 2019" }],
  },
  {
    id: "pension",
    calMonth: 11,
    day: 15,
    month: 12,
    kind: "milestone",
    yearlyKey: "pensionSaving",
    title: "Pension saving: the yearly deadline",
    short: "Pension saving",
    advice: "Payments made by 31 December count for this year's tax reduction. People who spread it monthly never had to find a lump sum in December.",
    rate: { p: 0.48, label: "used pension saving last year" },
    action: { label: "Spread it monthly", readiness: 50 },
    notes: [{ text: "Monthly pension saving: same tax benefit, no December scramble.", by: "On the Everyday Road since 2014" }],
  },
  {
    id: "bonus",
    calMonth: 11,
    day: 20,
    month: 12,
    kind: "boost",
    yearlyKey: "bonus",
    title: "End-of-year bonus",
    short: "Year-end bonus",
    advice: "Many employees get an end-of-year bonus in December. The ones who decided what it was for before it landed kept more of it.",
    amount: { median: 1900, sigma: 0.4 },
    action: { label: "Send half to my first goal", readiness: 40 },
    notes: [{ text: "I decide in November what the bonus is for. Otherwise it disappears into December.", by: "On the Everyday Road since 2020" }],
  },
  {
    id: "december",
    calMonth: 11,
    day: 23,
    month: 12,
    kind: "bump",
    yearlyKey: "december",
    hitVerb: "spent more than",
    title: "December spending",
    short: "December",
    advice: "Sinterklaas, Christmas and New Year in one month. People who started a gift pot in autumn spent the same and started January calm.",
    amount: { median: 620, sigma: 0.5, threshold: 900 },
    behaviours: [
      b("pot", "Started a gift pot in autumn", 0.3, 0.6, "Start a €50 a month gift pot", 60),
      b("list", "Made a gift list with a budget", 0.4, 0.3, "Make a gift budget", 20),
    ],
    notes: [{ text: "€50 a month from September. December stopped being a problem.", by: "On the Everyday Road since 2018" }],
  },
];

/** The Everyday Road as a road, so the same simulation and crowd gate serve it. */
export const EVERYDAY: RoadDef = {
  id: "everyday",
  name: "Everyday Road",
  tagline: "The money year every household drives, every year",
  months: 12,
  alumni: 120000,
  current: 2300000,
  status: "live",
  care: false,
  hue: "#EDE7D7",
  family: "home",
  persona: { name: "Everyone", age: 0, city: "Belgium", month: 0, line: "", bufferBand: 1, incomeBand: 1, driven: [] },
  stops: EVERYDAY_STOPS,
  callReasons: [
    { q: "Why is January so expensive?", share: 0.31 },
    { q: "When does my holiday pay arrive?", share: 0.24 },
    { q: "Can I still do pension saving this year?", share: 0.19 },
  ],
  blocked: [],
};

export const everydayStop = (id: string) => EVERYDAY_STOPS.find((s) => s.id === id);

/** Done-map key for one year's occurrence of an everyday stop. */
export const evKey = (id: string, year: number) => `ev:${id}:${year}`;
export function parseEvKey(key: string): { id: string; year: number } | null {
  const m = /^ev:([a-z-]+):(\d{4})$/.exec(key);
  return m ? { id: m[1], year: Number(m[2]) } : null;
}
