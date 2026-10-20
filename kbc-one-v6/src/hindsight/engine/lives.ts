// The money each persona drives with: income, fixed bills, pots, goals and cover.
// All amounts are synthetic and illustrative (a plausible Belgian household), not KBC data.
// Months in `from` / `to` / `month` are journey months on the persona's road.

export interface IncomeDef {
  id: string;
  label: string;
  amount: number;
  day: number;
  from?: number;
  to?: number;
  /** month-to-month variation (freelance invoices) */
  vary?: number;
  /** a salary: holiday pay and the year-end bonus follow it */
  salary?: boolean;
}

export type BillGroup = "home" | "energy" | "insurance" | "phone" | "transport" | "subscriptions" | "family" | "care" | "work" | "loan" | "tax";

export interface BillDef {
  id: string;
  label: string;
  amount: number;
  day: number;
  group: BillGroup;
  /** calendar months (0 = Jan) when it is due; default every month */
  months?: number[];
  from?: number;
  to?: number;
}

export interface PotDef {
  id: string;
  label: string;
  balance: number;
  monthly: number;
  locked?: boolean;
}

export interface GoalDef {
  id: string;
  label: string;
  /** name of the destination pin in the city */
  place: string;
  target: number;
  saved: number;
  monthly: number;
}

export interface CoverDef {
  id: string;
  label: string;
  state: "ok" | "check" | "gap";
  note: string;
}

export interface OneOff {
  id: string;
  month: number;
  day: number;
  label: string;
  amount: number;
}

/** Signed yearly amounts for the Everyday Road (+ money in, − money out). 0 = doesn't apply. */
export interface Yearly {
  renewals: number;
  energy: number;
  holidayPay: number;
  holidays: number;
  propertyTax: number;
  school: number;
  taxResult: number;
  pensionSaving: number;
  bonus: number;
  december: number;
  /** tax return filing reminder applies */
  none: number;
}

export interface LifeDef {
  roadId: string;
  household: string;
  balance: number;
  incomes: IncomeDef[];
  bills: BillDef[];
  /** everyday spending per month (groceries, going out, small things) */
  spend: number;
  /** spending changes from a journey month on (retirement, a new job) */
  spendSteps?: { from: number; amount: number }[];
  pots: PotDef[];
  goals: GoalDef[];
  cover: CoverDef[];
  oneOffs?: OneOff[];
  yearly: Yearly;
}

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

export const LIVES: Record<string, LifeDef> = {
  // ---------- Tom: moving to Gent (Moving house, month 0) ----------
  "moving-house": {
    roadId: "moving-house",
    household: "Lives alone · moving from Leuven to a rented flat in Gent",
    balance: 1987,
    incomes: [{ id: "salary", label: "Salary", amount: 2840, day: 25, salary: true }],
    bills: [
      { id: "rent", label: "Rent, Gent", amount: 950, day: 1, group: "home" },
      { id: "energy", label: "Engie", amount: 140, day: 22, group: "energy" },
      { id: "phone", label: "Proximus", amount: 74, day: 22, group: "phone" },
      { id: "netflix", label: "Netflix", amount: 14, day: 28, group: "subscriptions" },
      { id: "spotify", label: "Spotify", amount: 12, day: 30, group: "subscriptions" },
      { id: "car-ins", label: "Car insurance", amount: 412, day: 2, group: "insurance", months: [10] },
    ],
    spend: 1150,
    pots: [{ id: "savings", label: "Savings", balance: 6200, monthly: 0 }],
    goals: [{ id: "g1", label: "Gent flat fund", place: "Flat in Gent", target: 3000, saved: 2160, monthly: 300 }],
    cover: [
      { id: "home", label: "Contents", state: "ok", note: "Your contents insurance moved with you to Gent." },
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
      { id: "liability", label: "Liability", state: "check", note: "No family liability cover found. Many people who moved alone didn't have it." },
    ],
    yearly: Y({ renewals: -320, energy: -150, holidayPay: 2400, holidays: -1200, taxResult: 180, bonus: 2300, december: -500 }),
  },

  "first-home": {
    roadId: "first-home",
    household: "Lives alone · owns a flat in Gent",
    balance: 1850,
    incomes: [{ id: "salary", label: "Salary", amount: 2650, day: 28, salary: true }],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 890, day: 2, group: "home" },
      { id: "energy", label: "Energy advance", amount: 115, day: 5, group: "energy" },
      { id: "phone", label: "Internet & phone", amount: 55, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 32, day: 15, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 28, day: 20, group: "subscriptions" },
      { id: "transport", label: "Bike lease", amount: 39, day: 8, group: "transport" },
    ],
    spend: 1050,
    pots: [{ id: "savings", label: "Savings", balance: 3200, monthly: 100 }],
    goals: [
      { id: "renovation", label: "Renovation fund", place: "Renovation", target: 8000, saved: 1200, monthly: 150 },
      { id: "portugal", label: "Summer in Portugal", place: "Portugal", target: 1600, saved: 350, monthly: 100 },
    ],
    cover: [
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the flat, linked to the mortgage." },
      { id: "loan", label: "Mortgage", state: "ok", note: "Outstanding balance insurance in place." },
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
      { id: "liability", label: "Liability", state: "check", note: "No family liability cover found. Many first-time owners didn't have it." },
    ],
    yearly: Y({ renewals: -260, holidayPay: 2250, holidays: -1300, taxResult: 210, pensionSaving: -600, bonus: 2100, december: -550 }),
  },

  "first-job": {
    roadId: "first-job",
    household: "Lives with his parents · Brussels",
    balance: 920,
    incomes: [{ id: "salary", label: "Salary", amount: 2050, day: 30, salary: true }],
    bills: [
      { id: "home", label: "Contribution at home", amount: 250, day: 1, group: "home" },
      { id: "transport", label: "Transport pass", amount: 49, day: 3, group: "transport" },
      { id: "phone", label: "Phone", amount: 25, day: 8, group: "phone" },
      { id: "gym", label: "Gym", amount: 32, day: 15, group: "subscriptions" },
      { id: "subs", label: "Streaming", amount: 14, day: 20, group: "subscriptions" },
    ],
    spend: 1150,
    pots: [{ id: "savings", label: "Savings", balance: 400, monthly: 50 }],
    goals: [
      { id: "deposit", label: "Deposit for my own place", place: "Own place", target: 6000, saved: 400, monthly: 200 },
      { id: "japan", label: "Trip to Japan", place: "Japan", target: 2500, saved: 150, monthly: 100 },
    ],
    cover: [
      { id: "hospital", label: "Hospital", state: "check", note: "Your employer may offer hospital cover. Check if you're enrolled." },
      { id: "liability", label: "Liability", state: "ok", note: "Covered by your parents' family policy while you live at home." },
      { id: "income", label: "Income", state: "ok", note: "Covered by social security as an employee." },
    ],
    yearly: Y({ renewals: -120, holidayPay: 650, holidays: -900, bonus: 1500, december: -380 }),
  },

  "first-child": {
    roadId: "first-child",
    household: "Couple · owns a house in Mechelen · baby on the way",
    balance: 3400,
    incomes: [
      { id: "salary", label: "Salary", amount: 2900, day: 28, salary: true },
      { id: "partner", label: "Partner's share", amount: 1100, day: 1 },
    ],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 1050, day: 3, group: "home" },
      { id: "energy", label: "Energy advance", amount: 160, day: 6, group: "energy" },
      { id: "car-ins", label: "Car insurance", amount: 62, day: 10, group: "insurance" },
      { id: "phone", label: "Internet & phone", amount: 78, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 38, day: 15, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 24, day: 20, group: "subscriptions" },
      { id: "childcare", label: "Childcare", amount: 520, day: 5, group: "family", from: 12 },
    ],
    spend: 2000,
    spendSteps: [{ from: 12, amount: 1750 }],
    pots: [{ id: "savings", label: "Savings", balance: 7200, monthly: 150 }],
    goals: [
      { id: "baby", label: "Baby buffer", place: "Baby buffer", target: 3000, saved: 900, monthly: 150 },
      { id: "child-savings", label: "Savings for our child", place: "Child's account", target: 2500, saved: 0, monthly: 25 },
    ],
    cover: [
      { id: "hospital", label: "Hospital", state: "check", note: "Covers the birth. Check what it pays for a private room." },
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "car", label: "Car", state: "ok", note: "Third-party and theft." },
      { id: "liability", label: "Liability", state: "ok", note: "Family policy. Add the baby once born." },
    ],
    yearly: Y({ renewals: -380, energy: -240, holidayPay: 2450, holidays: -1100, propertyTax: -980, taxResult: 340, pensionSaving: -1000, bonus: 2300, december: -600 }),
  },

  freelance: {
    roadId: "freelance",
    household: "Lives with his partner · owns a house in Leuven",
    balance: 4100,
    incomes: [{ id: "invoices", label: "Client invoices", amount: 4600, day: 15, vary: 0.35 }],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 980, day: 2, group: "home" },
      { id: "energy", label: "Energy advance", amount: 140, day: 6, group: "energy" },
      { id: "car", label: "Car loan", amount: 310, day: 10, group: "loan" },
      { id: "phone", label: "Internet & phone", amount: 70, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 35, day: 15, group: "insurance" },
      { id: "software", label: "Design software", amount: 65, day: 20, group: "work" },
      { id: "accountant", label: "Accountant", amount: 120, day: 25, group: "work" },
      { id: "social", label: "Social contributions", amount: 850, day: 26, group: "tax", months: [2, 5, 8, 11], from: 4 },
    ],
    spend: 1750,
    pots: [{ id: "savings", label: "Savings", balance: 2200, monthly: 0 }],
    goals: [{ id: "reserve", label: "Three-month reserve", place: "Safe harbour", target: 12000, saved: 7500, monthly: 400 }],
    cover: [
      { id: "hospital", label: "Hospital", state: "ok", note: "Individual hospital cover." },
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "income", label: "Income", state: "gap", note: "Nothing pays you if you're ill for months. Most freelancers looked at this in year one." },
      { id: "liability", label: "Work", state: "check", note: "Professional liability: check what your clients require." },
    ],
    yearly: Y({ renewals: -520, energy: -260, holidays: -1400, propertyTax: -1150, taxResult: -900, pensionSaving: -1000, december: -650 }),
  },

  separation: {
    roadId: "separation",
    household: "Two children · moving to a rented flat in Hasselt",
    balance: 1300,
    incomes: [
      { id: "salary", label: "Salary", amount: 2450, day: 28, salary: true },
      { id: "child-benefit", label: "Child benefit", amount: 340, day: 10 },
    ],
    bills: [
      { id: "mortgage", label: "Your share of the mortgage", amount: 620, day: 3, group: "home", to: 6 },
      { id: "rent", label: "Rent, new flat", amount: 780, day: 1, group: "home", from: 3 },
      { id: "energy", label: "Energy advance", amount: 95, day: 6, group: "energy" },
      { id: "phone", label: "Internet & phone", amount: 45, day: 12, group: "phone" },
      { id: "ins", label: "Insurance", amount: 40, day: 15, group: "insurance" },
      { id: "kids", label: "School & activities", amount: 60, day: 20, group: "family" },
    ],
    spend: 1250,
    pots: [{ id: "savings", label: "Savings", balance: 2100, monthly: 0 }],
    goals: [],
    cover: [
      { id: "home", label: "Home", state: "check", note: "The house policy may still be in both names." },
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer, children included." },
      { id: "liability", label: "Liability", state: "check", note: "Check the children are covered in both homes." },
    ],
    yearly: Y({ renewals: -300, energy: -180, holidayPay: 2050, holidays: -900, school: -680, taxResult: 120, bonus: 1800, december: -500 }),
  },

  "caring-parent": {
    roadId: "caring-parent",
    household: "Couple · house paid off · Kortrijk",
    balance: 5200,
    incomes: [{ id: "salary", label: "Salary", amount: 3900, day: 28, salary: true }],
    bills: [
      { id: "energy", label: "Energy advance", amount: 170, day: 6, group: "energy" },
      { id: "car-ins", label: "Car insurance", amount: 70, day: 10, group: "insurance" },
      { id: "phone", label: "Internet & phone", amount: 85, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 45, day: 15, group: "insurance" },
      { id: "hospital", label: "Hospital cover", amount: 48, day: 20, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 30, day: 22, group: "subscriptions" },
      { id: "home-care", label: "Home help for mum", amount: 180, day: 25, group: "care" },
      { id: "care-gap", label: "Care home: monthly gap", amount: 520, day: 5, group: "care", from: 17 },
    ],
    spend: 2400,
    pots: [{ id: "savings", label: "Savings", balance: 18000, monthly: 300 }],
    goals: [{ id: "care-gap", label: "Care reserve for mum", place: "Care reserve", target: 6000, saved: 2000, monthly: 250 }],
    cover: [
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "car", label: "Car", state: "ok", note: "Third-party and theft." },
      { id: "mum", label: "Mum", state: "check", note: "Check your mother's own hospital cover before a care home." },
    ],
    yearly: Y({ renewals: -450, energy: -260, holidayPay: 3300, holidays: -1500, propertyTax: -1250, taxResult: 420, pensionSaving: -1000, bonus: 3200, december: -700 }),
  },

  "moving-abroad": {
    roadId: "moving-abroad",
    household: "Lives alone · moving from Antwerp to Lisbon",
    balance: 2600,
    incomes: [{ id: "salary", label: "Salary (Lisbon)", amount: 2400, day: 25 }],
    bills: [
      { id: "rent", label: "Rent, Lisbon", amount: 1050, day: 1, group: "home", from: 2 },
      { id: "transport", label: "Transport pass", amount: 40, day: 1, group: "transport" },
      { id: "phone", label: "Phone", amount: 20, day: 8, group: "phone" },
      { id: "health", label: "Private health insurance", amount: 45, day: 10, group: "insurance", from: 3 },
      { id: "subs", label: "Subscriptions", amount: 15, day: 20, group: "subscriptions" },
    ],
    spend: 950,
    pots: [{ id: "savings", label: "Savings", balance: 1200, monthly: 100 }],
    goals: [
      { id: "christmas", label: "Flight home for Christmas", place: "Home for Christmas", target: 600, saved: 150, monthly: 75 },
      { id: "buffer", label: "Lisbon buffer", place: "Lisbon buffer", target: 3000, saved: 400, monthly: 150 },
    ],
    cover: [
      { id: "health", label: "Health", state: "check", note: "Between two systems: check you're covered this month." },
      { id: "home", label: "Home", state: "gap", note: "Your Belgian home policy ended with the move." },
      { id: "liability", label: "Liability", state: "check", note: "Check if your family liability cover works abroad." },
    ],
    yearly: Y({ renewals: -90, holidays: -600, december: -450, none: 0 }),
  },

  retirement: {
    roadId: "retirement",
    household: "Couple · own house in Brugge · retiring in four months",
    balance: 6800,
    incomes: [
      { id: "salary", label: "Salary", amount: 3600, day: 28, to: 6, salary: true },
      { id: "pension", label: "Pension", amount: 2350, day: 28, from: 7 },
    ],
    bills: [
      { id: "energy", label: "Energy advance", amount: 150, day: 6, group: "energy" },
      { id: "car-ins", label: "Car insurance", amount: 55, day: 10, group: "insurance" },
      { id: "phone", label: "Internet & phone", amount: 60, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 42, day: 15, group: "insurance" },
      { id: "hospital", label: "Hospital cover (employer)", amount: 35, day: 20, group: "insurance", to: 7 },
      { id: "hospital-own", label: "Hospital cover (own)", amount: 95, day: 20, group: "insurance", from: 8 },
      { id: "subs", label: "Subscriptions", amount: 25, day: 22, group: "subscriptions" },
    ],
    spend: 2300,
    spendSteps: [{ from: 7, amount: 1700 }],
    pots: [{ id: "savings", label: "Savings", balance: 24000, monthly: 200 }],
    goals: [
      { id: "camper", label: "Camper trip to Norway", place: "Norway", target: 4000, saved: 1500, monthly: 200 },
      { id: "grandkids", label: "Grandchildren's fund", place: "Grandkids", target: 5000, saved: 1000, monthly: 100 },
    ],
    cover: [
      { id: "hospital", label: "Hospital", state: "check", note: "Your employer's plan ends when you retire. Continuing it personally is cheaper now." },
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "car", label: "Car", state: "ok", note: "Third-party and theft." },
      { id: "liability", label: "Liability", state: "ok", note: "Family policy." },
    ],
    yearly: Y({ renewals: -480, energy: -230, holidayPay: 3100, holidays: -1500, propertyTax: -1100, taxResult: -350, bonus: 3000, december: -800 }),
  },

  "losing-parent": {
    roadId: "losing-parent",
    household: "Lives with her partner · Mechelen",
    balance: 2900,
    incomes: [{ id: "salary", label: "Salary", amount: 2750, day: 28, salary: true }],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 720, day: 2, group: "home" },
      { id: "energy", label: "Energy advance", amount: 130, day: 6, group: "energy" },
      { id: "phone", label: "Internet & phone", amount: 60, day: 12, group: "phone" },
      { id: "ins", label: "Insurance", amount: 40, day: 15, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 20, day: 20, group: "subscriptions" },
    ],
    spend: 1550,
    pots: [{ id: "savings", label: "Savings", balance: 9500, monthly: 0 }],
    goals: [],
    cover: [
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
      { id: "parent", label: "His home", state: "check", note: "Keep his home insured while it's empty. The notary can help." },
    ],
    oneOffs: [{ id: "estate", month: 6, day: 19, label: "Your share of the estate", amount: 32000 }],
    yearly: Y({ renewals: -320, energy: -200, holidayPay: 2300, holidays: -1000, propertyTax: -900, taxResult: 150, bonus: 2400, december: -500 }),
  },

  "student-kid": {
    roadId: "student-kid",
    household: "Couple · two children · own house in Aalst",
    balance: 2300,
    incomes: [
      { id: "salary", label: "Salary", amount: 3100, day: 28, salary: true },
      { id: "partner", label: "Partner's share", amount: 1600, day: 1 },
    ],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 640, day: 2, group: "home" },
      { id: "energy", label: "Energy advance", amount: 165, day: 6, group: "energy" },
      { id: "phone", label: "Internet & phone", amount: 95, day: 12, group: "phone" },
      { id: "ins", label: "Home & car insurance", amount: 85, day: 15, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 30, day: 20, group: "subscriptions" },
      { id: "allowance", label: "Daughter's allowance", amount: 150, day: 1, group: "family", from: 2 },
      { id: "room", label: "Student room", amount: 480, day: 1, group: "family", from: 3 },
    ],
    spend: 2350,
    pots: [{ id: "savings", label: "Savings", balance: 6500, monthly: 150 }],
    goals: [{ id: "year-two", label: "Year-two fund", place: "Year two", target: 5000, saved: 600, monthly: 250 }],
    cover: [
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer, children included." },
      { id: "home", label: "Home", state: "ok", note: "Fire insurance on the house." },
      { id: "car", label: "Car", state: "ok", note: "Third-party and theft." },
      { id: "room", label: "Her room", state: "check", note: "Check your family policy covers her things in the student room." },
    ],
    yearly: Y({ renewals: -520, energy: -280, holidayPay: 2600, holidays: -1600, propertyTax: -950, school: -340, taxResult: 260, pensionSaving: -1000, bonus: 2500, december: -800 }),
  },

  "job-loss": {
    roadId: "job-loss",
    household: "Lives alone · rents a flat in Charleroi",
    balance: 2900,
    incomes: [
      { id: "salary", label: "Last salary", amount: 2600, day: 28, to: 1, salary: true },
      { id: "benefit", label: "Unemployment benefit", amount: 1650, day: 6, from: 2, to: 7 },
      { id: "new-job", label: "Salary (new job)", amount: 2450, day: 28, from: 7, salary: true },
    ],
    bills: [
      { id: "rent", label: "Rent", amount: 850, day: 1, group: "home" },
      { id: "energy", label: "Energy advance", amount: 95, day: 6, group: "energy" },
      { id: "car", label: "Car loan", amount: 260, day: 10, group: "loan" },
      { id: "phone", label: "Internet & phone", amount: 40, day: 12, group: "phone" },
      { id: "ins", label: "Insurance", amount: 30, day: 15, group: "insurance" },
      { id: "gym", label: "Gym", amount: 35, day: 20, group: "subscriptions" },
    ],
    spend: 800,
    spendSteps: [{ from: 8, amount: 1050 }],
    pots: [],
    goals: [],
    cover: [
      { id: "hospital", label: "Hospital", state: "check", note: "Cover through your employer often stops with the job. It can usually be continued." },
      { id: "home", label: "Home", state: "ok", note: "Tenant's insurance." },
      { id: "car", label: "Car", state: "ok", note: "Third-party." },
    ],
    yearly: Y({ renewals: -250, energy: -160, holidays: -500, december: -350 }),
  },

  "heat-pump": {
    roadId: "heat-pump",
    household: "Family of three · own house in Turnhout",
    balance: 3800,
    incomes: [{ id: "salary", label: "Salary", amount: 3300, day: 28, salary: true }],
    bills: [
      { id: "mortgage", label: "Mortgage", amount: 940, day: 2, group: "home" },
      { id: "energy", label: "Electricity advance", amount: 210, day: 6, group: "energy" },
      { id: "car-ins", label: "Car insurance", amount: 60, day: 10, group: "insurance" },
      { id: "phone", label: "Internet & phone", amount: 70, day: 12, group: "phone" },
      { id: "home-ins", label: "Home insurance", amount: 42, day: 15, group: "insurance" },
      { id: "subs", label: "Subscriptions", amount: 25, day: 20, group: "subscriptions" },
    ],
    spend: 1450,
    pots: [{ id: "savings", label: "Savings", balance: 9000, monthly: 200 }],
    goals: [{ id: "battery", label: "Home battery", place: "Battery", target: 6000, saved: 2500, monthly: 200 }],
    cover: [
      { id: "home", label: "Home", state: "ok", note: "Check the heat pump is listed in your home policy." },
      { id: "hospital", label: "Hospital", state: "ok", note: "Through your employer." },
      { id: "car", label: "Car", state: "ok", note: "Third-party and theft." },
      { id: "liability", label: "Liability", state: "ok", note: "Family policy." },
    ],
    yearly: Y({ renewals: -420, holidayPay: 2800, holidays: -1300, propertyTax: -1100, school: -340, taxResult: 300, pensionSaving: -1000, bonus: 2700, december: -600 }),
  },
};

export const lifeFor = (roadId: string): LifeDef => LIVES[roadId] ?? LIVES["first-home"];
