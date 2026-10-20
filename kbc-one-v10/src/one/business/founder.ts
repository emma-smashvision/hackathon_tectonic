// Founder road: one vertical road in seven chapters, from the first idea to stepping back.
// Sofie's physiotherapy practice is written out in full (what she already did, the BV
// proposal she is at now, and what follows). Other business roads are adapted from
// the job roads in ./model. Crowd numbers are synthetic demo data.

import { type BizProfile, type Crowd, customerRoad, type PartnerId, profileById } from "./model";

export type ChapterId = "spark" | "launch" | "first-year" | "grow" | "crossroads" | "mature" | "exit";
export interface Chapter { id: ChapterId; n: number; name: string; title: string; color: string }
export const CHAPTERS: Chapter[] = [
  { id: "spark", n: 1, name: "Spark", title: "Test your idea", color: "#f5a524" },
  { id: "launch", n: 2, name: "Launch", title: "Make it official", color: "#59dcff" },
  { id: "first-year", n: 3, name: "First year", title: "Your first year", color: "#7ee2a8" },
  { id: "grow", n: 4, name: "Grow", title: "Grow your business", color: "#b9a6ff" },
  { id: "crossroads", n: 5, name: "Crossroads", title: "Choose your road", color: "#ff9b7a" },
  { id: "mature", n: 6, name: "Mature", title: "Build your wealth", color: "#5fd6c4" },
  { id: "exit", n: 7, name: "Exit", title: "Step back", color: "#c9d3e0" },
];
export const chapter = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

export type IconName =
  | "spark" | "card" | "badge" | "shield" | "doc" | "percent" | "health" | "umbrella" | "euro" | "calendar"
  | "refresh" | "key" | "piggy" | "gift" | "scale" | "chart" | "bank" | "pen" | "people" | "box" | "home" | "door";

export type NodeStatus = "done" | "now" | "next" | "optional";
export interface KateForm {
  /** fields Kate fills from what KBC knows */
  fromKbc: { label: string; value: string }[];
  /** fields that need the customer, with Kate's suggestion */
  needYou: { label: string; hint: string; suggestion: string }[];
  /** who receives it */
  to: string;
}
export interface FounderNode {
  id: string;
  chapter: ChapterId;
  title: string;
  /** label in the chapter stepper */
  short: string;
  /** status line under the title on the road */
  sub: string;
  icon: IconName;
  status: NodeStatus;
  /** only on one side of a crossroads */
  branch?: "a" | "b";
  minutes?: number;
  fee?: string;
  online?: boolean;
  /** "What it is, and why now" */
  why: string;
  todo?: string[];
  partners: PartnerId[];
  crowd?: Crowd;
  kate?: string;
  form?: KateForm;
  /** minutes Kate saved by filling it in */
  saved?: number;
}
export interface Branch {
  label: string;
  short: string;
  share: number;
  good: string;
  pros: string[];
  cons: string[];
  next: string;
  quote?: string;
}
export interface FounderFork {
  /** sits right after this node */
  after: string;
  chapter: ChapterId;
  title: string;
  question: string;
  a: Branch;
  b: Branch;
  /** Kate's pick when she knows your numbers */
  pick?: "a" | "b";
  pickWhy?: string;
}
export interface FounderRoad {
  id: string;
  profileId: string;
  owner: { initial: string; name: string; line: string };
  /** this road belongs to the viewing customer */
  mine: boolean;
  chapterTitles?: Partial<Record<ChapterId, string>>;
  nodes: FounderNode[];
  fork?: FounderFork;
  /** the partners to line up once a road is taken: Belgian organisations people on this road used */
  team?: Partial<Record<"a" | "b", TeamItem[]>>;
}
export interface TeamItem { partner: PartnerId; why: string; names: string[] }

// Belgian organisations people use when they start a BV or a business. KBC does not choose for
// the customer; offers on the partner cards are example offers for the demo.
const SOCIAL_FUNDS = ["Liantis", "Acerta", "Xerius", "Partena Professional", "Securex"];
const BV_TEAM: TeamItem[] = [
  { partner: "accountant", why: "Financial plan, annual accounts and corporate tax", names: ["ITAA-registered accountants"] },
  { partner: "notary", why: "Deed of incorporation, filed for publication", names: ["Find one on notaris.be"] },
  { partner: "kbc", why: "Company account, bank certificate for the capital", names: ["KBC business adviser"] },
  { partner: "social-fund", why: "Your contributions as a company director", names: SOCIAL_FUNDS },
  { partner: "insurer", why: "Liability and income cover in the BV's name", names: ["KBC Verzekeringen", "Your broker"] },
  { partner: "vlaio", why: "Subsidised advice through the KMO-portefeuille", names: ["VLAIO", "UNIZO"] },
];

// ---------- Sofie: physiotherapy practice next to AZ Sint-Jan ----------
const SOFIE: FounderRoad = {
  id: "sofie-physio",
  profileId: "physio",
  mine: true,
  owner: { initial: "S", name: "Sofie's practice", line: "Physiotherapy · since 2022" },
  chapterTitles: { crossroads: "Become a BV?" },
  nodes: [
    {
      id: "idea", chapter: "spark", title: "Idea check", short: "Idea", sub: "Done · Nov 2021", icon: "spark", status: "done",
      why: "Patients asked for evening sessions after your hospital shifts. You tested it with two colleagues before registering anything.",
      partners: ["kbc"], crowd: { share: 0.62, label: "tested demand with a few patients before registering" },
      kate: "62% of physios before you tested demand first. The ones who did started with a waiting list instead of an empty agenda.",
    },
    {
      id: "account", chapter: "launch", title: "Business account", short: "Account", sub: "Done · Mar 2022 · KBC business account", icon: "card", status: "done", minutes: 5, online: true, saved: 15,
      why: "Practice money and private money stay apart from the first patient, which made every later step simpler.",
      partners: ["kbc"], crowd: { share: 0.72, label: "used a separate account from the first patient" },
      kate: "People who mixed practice and private money spent the most hours with their accountant in year one.",
    },
    {
      id: "sole", chapter: "launch", title: "Sole proprietorship founded", short: "Founded", sub: "Done · Mar 2022 · side activity, you kept your hospital job", icon: "badge", status: "done", minutes: 10, online: true, saved: 40,
      why: "You started self-employed in your own name (eenmanszaak) as a side activity, keeping your salary and social rights through AZ Sint-Jan.",
      partners: ["counter", "social-fund"], crowd: { share: 0.68, label: "started as a side activity next to a salaried job" },
      kate: "68% of physios started on the side. They kept the security of a salary while their patient list grew.",
    },
    {
      id: "social", chapter: "launch", title: "Social security check", short: "Social", sub: "Done · social insurance fund joined before your first patient", icon: "shield", status: "done", minutes: 8, online: true, saved: 30,
      why: "Affiliation with a social insurance fund is mandatory before you start. It collects your quarterly contributions and builds your pension and sickness rights.",
      partners: ["social-fund"], crowd: { share: 0.58, label: "chose a large national fund" },
      kate: "Most physios joined through their fund's business counter, so the KBO registration happened in the same visit.",
    },
    {
      id: "kbo", chapter: "launch", title: "KBO check & enterprise number", short: "KBO", sub: "Done · enterprise number in 2 days", icon: "doc", status: "done", minutes: 4, online: true, saved: 35,
      why: "The business counter checked your details and registered your activity in the KBO (Crossroads Bank for Enterprises). Your enterprise number goes on every invoice and receipt.",
      partners: ["counter"], crowd: { share: 0.52, label: "registered through their social insurance fund's counter" },
      kate: "Kate filled 9 of 12 fields from your KBC profile. The other three were your practice name, start date and practice address.",
    },
    {
      id: "riziv", chapter: "launch", title: "RIZIV: conventioned", short: "RIZIV", sub: "Done · practice address registered", icon: "health", status: "done", minutes: 6, online: true, saved: 10,
      why: "Patients get reimbursed through your RIZIV number. As a conventioned physio you follow the agreed fees.",
      partners: ["riziv"], crowd: { share: 0.81, label: "stayed conventioned in their first three years" },
      kate: "81% of physios stayed conventioned at the start. Patients trusted the fees from day one.",
    },
    {
      id: "vat", chapter: "launch", title: "VAT: treatments exempt", short: "VAT", sub: "Done · no VAT returns for treatments", icon: "percent", status: "done",
      why: "Physiotherapy treatments are exempt from VAT. Selling products or non-medical sessions can bring VAT obligations, so your accountant checks once a year.",
      partners: ["vat", "accountant"], crowd: { share: 0.34, label: "had some VAT-able income by year two" },
      kate: "A third of physios ended up selling something VAT-able, often insoles or group sessions. You haven't so far.",
    },
    {
      id: "liability", chapter: "launch", title: "Professional liability", short: "Insurance", sub: "Done · covered from the first patient", icon: "umbrella", status: "done", minutes: 6, saved: 20,
      why: "Professional liability insurance covers claims from patients.",
      partners: ["insurer"], crowd: { share: 0.93, label: "insured their liability before the first patient" },
    },
    {
      id: "payments", chapter: "first-year", title: "Card payments for patients", short: "Payments", sub: "Done · Bancontact and Payconiq", icon: "euro", status: "done", minutes: 5, online: true, saved: 10,
      why: "Patients pay at the end of the session; the money lands on your business account the same day.",
      partners: ["kbc"], crowd: { share: 0.77, label: "offered card or app payments in year one" },
    },
    {
      id: "contributions", chapter: "first-year", title: "Quarterly contributions", short: "Contrib.", sub: "Done · paid every quarter since 2022", icon: "calendar", status: "done",
      why: "Provisional social contributions every quarter, based on an estimate of your income.",
      partners: ["social-fund"], crowd: { share: 0.49, label: "had a regularisation they had not saved for" },
    },
    {
      id: "prepayments", chapter: "first-year", title: "Tax prepayments", short: "Prepay", sub: "Done · no surcharge since 2023", icon: "euro", status: "done",
      why: "Paying income tax in advance on your practice income avoids a surcharge.",
      partners: ["accountant"], crowd: { share: 0.38, label: "made tax prepayments in year one" },
    },
    {
      id: "regularisation", chapter: "first-year", title: "First regularisation", short: "Regul.", sub: "Done · your 35% reserve covered it", icon: "refresh", status: "done",
      why: "Contributions were recalculated on your real income. Your automatic 35% reserve paid it in full.",
      partners: ["social-fund", "kbc"], crowd: { share: 0.49, label: "were caught by the regularisation" },
      kate: "Half the physios before you were caught by the regularisation. You weren't, thanks to the automatic transfer on every payment.",
    },
    {
      id: "statute", chapter: "first-year", title: "RIZIV social-statute allowance", short: "Allowance", sub: "Done · claimed every year", icon: "health", status: "done", minutes: 4, online: true, saved: 15,
      why: "Conventioned physios can claim a yearly RIZIV allowance towards their pension.",
      partners: ["riziv"], crowd: { share: 0.61, label: "claimed it in their first year" },
    },
    {
      id: "room", chapter: "grow", title: "Own practice room", short: "Room", sub: "Done · 2024 · investment credit", icon: "key", status: "done",
      why: "You rented a treatment room and fitted it out, financed with an investment credit and depreciated over several years.",
      partners: ["kbc", "accountant", "lawyer"], crowd: { share: 0.44, label: "financed their fit-out with an investment credit" },
    },
    {
      id: "income", chapter: "grow", title: "Guaranteed income insurance", short: "Income", sub: "Done · pays if you can't work", icon: "umbrella", status: "done",
      why: "Once the practice became a large part of your income, you insured it against long illness or injury.",
      partners: ["insurer"], crowd: { share: 0.57, label: "took income cover before the practice was their main income" },
    },
    {
      id: "vapz", chapter: "grow", title: "VAPZ pension", short: "VAPZ", sub: "Done · tax-deductible pension saving", icon: "piggy", status: "done",
      why: "A supplementary pension for the self-employed (VAPZ), deducted as a professional cost.",
      partners: ["insurer", "kbc"], crowd: { share: 0.46, label: "started a VAPZ before year four" },
    },
    {
      id: "compare", chapter: "crossroads", title: "Compare sole proprietorship and BV", short: "Compare", sub: "Start · about 6 min", icon: "scale", status: "now", minutes: 6, online: true,
      why: "Your practice profit passed about €74,000 last year. That is where most physios start comparing a BV. Kate prepares the numbers; your accountant confirms them.",
      todo: ["Check the figures Kate filled in", "Add the three answers only you know", "Send the comparison to your accountant"],
      partners: ["accountant", "kbc"], crowd: { share: 0.43, label: "ended up starting a BV" },
      kate: "Physios who switched did so at a median profit of about €70,000. You are at €74,200, and you plan to buy a home, which many wanted separate from the practice.",
      form: {
        to: "your accountant",
        fromKbc: [
          { label: "Practice profit 2025", value: "€74,200" },
          { label: "Practice revenue 2025", value: "€96,800" },
          { label: "Practice costs 2025", value: "€22,600" },
          { label: "Social contributions paid", value: "€14,900" },
          { label: "Equipment book value", value: "€11,300" },
          { label: "Investment credit outstanding", value: "€6,400" },
          { label: "VAPZ premium", value: "€3,100" },
        ],
        needYou: [
          { label: "Planned BV start", hint: "Most chose 1 January", suggestion: "1 Jan 2027" },
          { label: "Shareholders", hint: "Only you, or with Pieter?", suggestion: "Only me" },
          { label: "Director's salary", hint: "At least €45,000 for the reduced rate", suggestion: "€45,000 a year" },
        ],
      },
    },
    // Road A: stay a sole proprietor
    {
      id: "a-review", chapter: "crossroads", branch: "a", title: "Recheck after the 2026 figures", short: "Recheck", sub: "Next · with your accountant", icon: "refresh", status: "next",
      why: "Staying a sole proprietor is fine. Most who stayed rechecked once their yearly figures came in.",
      partners: ["accountant"], crowd: { share: 0.57, label: "of physios stayed a sole proprietor" },
    },
    {
      id: "a-pension", chapter: "crossroads", branch: "a", title: "Raise your VAPZ", short: "VAPZ", sub: "Next · lowers your tax this year", icon: "piggy", status: "next",
      why: "With a higher profit, a higher VAPZ premium lowers your tax and social contributions.",
      partners: ["insurer", "accountant"],
    },
    // Road B: become a BV
    {
      id: "plan", chapter: "crossroads", branch: "b", title: "Financial plan & starting equity", short: "Plan", sub: "Next · with your accountant", icon: "chart", status: "next", minutes: 15, fee: "Accountant's fee",
      why: "A BV has no minimum capital, but you need sufficient starting equity and a financial plan for the first two years. Founders are liable if it was clearly too low.",
      todo: ["Two-year budget with your accountant", "Decide what you bring in: cash, your equipment, your patient agreements", "Plan the costs of the switch"],
      partners: ["accountant", "kbc"], crowd: { share: 0.88, label: "had their accountant write the financial plan" },
      kate: "The physios who were happiest afterwards started the plan two months before the deed. Your comparison already holds most of the numbers.",
    },
    {
      id: "bank-cert", chapter: "crossroads", branch: "b", title: "Company account & bank certificate", short: "Account", sub: "Next · one appointment", icon: "bank", status: "next", minutes: 20,
      why: "A cash contribution goes to a blocked account in the name of the BV in formation. KBC gives the notary a certificate; the money is released once the company exists.",
      partners: ["kbc", "notary"], crowd: { share: 0.74, label: "opened the company account at their existing bank" },
      form: {
        to: "KBC",
        fromKbc: [{ label: "Name and address", value: "Sofie · Brugge" }, { label: "ID and nationality", value: "From your KBC profile" }, { label: "Practice activity", value: "Physiotherapy" }],
        needYou: [{ label: "Amount you contribute", hint: "From your financial plan", suggestion: "€15,000" }, { label: "Draft articles", hint: "From your notary", suggestion: "Upload later" }],
      },
    },
    {
      id: "deed", chapter: "crossroads", branch: "b", title: "Sign the deed at the notary", short: "Deed", sub: "Next · switch day", icon: "pen", status: "next", fee: "Notary quote · others paid about €1,200",
      why: "The notary draws up the articles of association and files the deed. The BV gets its own enterprise number.",
      todo: ["Agree name, seat, purpose and shares", "Sign the deed", "Register the UBO within a month"],
      partners: ["notary", "accountant"], crowd: { share: 0.54, label: "used the notary their accountant works with" },
      kate: "What physios forgot most: the UBO register, moving the room lease into the BV's name, and giving patients the new account number.",
    },
    {
      id: "ubo", chapter: "crossroads", branch: "b", title: "UBO register", short: "UBO", sub: "Next · within a month · about 5 min", icon: "people", status: "next", minutes: 5, online: true,
      why: "Register yourself as ultimate beneficial owner of the BV. Forgetting it costs a fine.",
      partners: ["accountant"], crowd: { share: 0.71, label: "registered the UBO in the first month" },
    },
    {
      id: "move", chapter: "crossroads", branch: "b", title: "Move the practice into the BV", short: "Move", sub: "Next · same quarter as the deed", icon: "box", status: "next",
      why: "Equipment, the room lease, the payment terminal and subscriptions move to the BV. Your sole proprietorship stops or is adapted in the KBO.",
      todo: ["Contribute or sell your equipment to the BV", "Move the room lease and the payment terminal", "Stop or adapt your sole proprietorship in the KBO"],
      partners: ["accountant", "counter", "lawyer"], crowd: { share: 0.69, label: "moved everything in the same quarter as the deed" },
    },
    {
      id: "riziv-insure", chapter: "crossroads", branch: "b", title: "Update RIZIV payments and insurance", short: "Update", sub: "Next · after the deed", icon: "health", status: "next",
      why: "Your RIZIV number stays personal. Check with your accountant how the BV invoices your treatments and update payment details. Move your liability and income cover to the BV.",
      partners: ["riziv", "insurer", "accountant"], crowd: { share: 0.63, label: "updated their cover in the first month" },
    },
    {
      id: "salary", chapter: "crossroads", branch: "b", title: "Director's salary", short: "Salary", sub: "Next · from month 1", icon: "euro", status: "next",
      why: "The reduced corporate tax rate on the first €100,000 of profit requires, among other conditions, a director's salary of at least €45,000 a year (or equal to the profit if lower).",
      partners: ["accountant", "social-fund"], crowd: { share: 0.67, label: "paid at least the minimum director's salary from year one" },
      kate: "Physios with a fixed monthly director's salary said cash flow felt like a salary again.",
    },
    {
      id: "ipt", chapter: "mature", title: "Pension through your BV", short: "Pension", sub: "Later · individual pension commitment", icon: "piggy", status: "next",
      why: "As a company director, your BV can build a supplementary pension for you through an individual pension commitment (IPT), next to your VAPZ.",
      partners: ["insurer", "accountant"], crowd: { share: 0.52, label: "started an IPT within two years of the BV" },
    },
    {
      id: "home", chapter: "mature", title: "Your first home, with a BV", short: "Home", sub: "Later · with Pieter", icon: "home", status: "next",
      why: "For a mortgage, banks look at your director's salary and the BV's annual accounts. Keeping the practice in the BV also keeps it separate from your home.",
      partners: ["kbc"], crowd: { share: 0.48, label: "bought a home within three years of their BV" },
      kate: "Physios who planned the BV and the home together talked to their KBC adviser about both in one appointment.",
    },
    {
      id: "reserve", chapter: "mature", title: "Liquidation reserve", short: "Reserve", sub: "Later · profit you leave in the BV", icon: "chart", status: "next",
      why: "Small companies can set aside part of their profit in a liquidation reserve: a separate tax now and a lower tax when you take it out later.",
      partners: ["accountant"], crowd: { share: 0.39, label: "built a liquidation reserve" },
    },
    {
      id: "exit", chapter: "exit", title: "Sell, pass on or close", short: "Exit", sub: "One day · your patients, your room, your name", icon: "door", status: "next",
      why: "Physios usually pass on their patient base and practice room to a colleague, or close the BV when they stop.",
      partners: ["lawyer", "accountant", "notary"], crowd: { share: 0.58, label: "passed their practice on to a colleague" },
    },
  ],
  fork: {
    after: "compare", chapter: "crossroads",
    title: "Stay a sole proprietor, or become a BV?",
    question: "Both are fine. You can decide later.",
    a: {
      label: "Stay a sole proprietor", short: "A · Stay", share: 0.57, good: "Good if your profit stays moderate and you want the least admin.",
      pros: ["Simplest admin and lowest accountant costs", "All profit is yours straight away"],
      cons: ["Personal income tax on all your profit", "Practice and private assets are not separated"],
      next: "Recheck, raise your VAPZ", quote: "For my income the BV wasn't worth the admin yet.",
    },
    b: {
      label: "Become a BV", short: "B · BV", share: 0.43, good: "Good when profit passes about €70,000 and you want the practice separate from your home.",
      pros: ["Reduced corporate tax rate on the first €100,000 of profit", "Practice separate from your private assets", "Pension through the BV and a liquidation reserve"],
      cons: ["Notary and higher accountant costs", "Annual accounts and more admin", "Money in the BV is not freely yours"],
      next: "Financial plan, bank certificate, deed", quote: "Lower tax on what I leave in the company, and my house is separate from the practice.",
    },
    pick: "b",
    pickWhy: "Your practice profit was €74,200 in 2025, above the €70,000 where most physios switched. And you plan to buy a home with Pieter, which many wanted separate from the practice.",
  },
  team: {
    a: [
      { partner: "accountant", why: "A yearly check of sole proprietorship or BV", names: ["ITAA-registered accountants"] },
      { partner: "insurer", why: "A higher VAPZ and income cover", names: ["KBC Verzekeringen", "Your broker"] },
    ],
    b: BV_TEAM,
  },
};

// ---------- Marc: an app on the side, a domain name just bought ----------
const MARC: FounderRoad = {
  id: "marc-founder",
  profileId: "founder",
  mine: true,
  owner: { initial: "M", name: "Marc's app", line: "Tech founder · domain bought 12 Oct" },
  chapterTitles: { launch: "Side activity or BV?" },
  nodes: [
    {
      id: "domain", chapter: "spark", title: "Domain name bought", short: "Domain", sub: "Done · 12 Oct · Combell", icon: "spark", status: "done",
      why: "You paid for a .be domain name and an Apple developer account. For KBC that is the first signal of a new business.",
      partners: ["kbc"], crowd: { share: 0.61, label: "registered a business within three months of buying their domain" },
    },
    {
      id: "landing", chapter: "spark", title: "Idea check", short: "Idea", sub: "Done · landing page live", icon: "chart", status: "done",
      why: "You tested the idea with a landing page before building more.",
      partners: ["vlaio"], crowd: { share: 0.47, label: "tested demand with a landing page first" },
    },
    {
      id: "start", chapter: "launch", title: "Side activity or BV?", short: "Start", sub: "Start · about 4 min", icon: "scale", status: "now", minutes: 4, online: true,
      why: "Most founders start as a side activity while they keep their job, and switch to a BV once customers pay or investors join.",
      partners: ["accountant", "kbc"], crowd: { share: 0.64, label: "started as a side activity" },
    },
    // Road A: side activity in your own name
    { id: "a-kbo", chapter: "launch", branch: "a", title: "Enterprise number (KBO)", short: "KBO", sub: "Next · about 10 min online", icon: "doc", status: "next", minutes: 10, online: true, why: "A business counter registers your activity in the KBO and gives you an enterprise number.", partners: ["counter"], crowd: { share: 0.52, label: "registered through their social insurance fund's counter" } },
    { id: "a-social", chapter: "launch", branch: "a", title: "Social insurance fund", short: "Social", sub: "Next · before your first invoice", icon: "shield", status: "next", why: "Mandatory before you start, also as a side activity next to your job.", partners: ["social-fund"], crowd: { share: 0.58, label: "chose a large national fund" } },
    { id: "a-vat", chapter: "launch", branch: "a", title: "VAT number", short: "VAT", sub: "Next · you sell software to businesses", icon: "percent", status: "next", why: "Selling software to businesses usually means a normal VAT registration, so you can also deduct VAT on your costs.", partners: ["vat", "accountant"], crowd: { share: 0.71, label: "chose normal VAT when selling to businesses" } },
    { id: "a-account", chapter: "launch", branch: "a", title: "Business account", short: "Account", sub: "Next · 5 min", icon: "card", status: "next", minutes: 5, online: true, why: "Keep app income and costs apart from day one.", partners: ["kbc"], crowd: { share: 0.74, label: "opened a business account before their first invoice" } },
    // Road B: a BV with a co-founder from day one
    { id: "b-agreement", chapter: "launch", branch: "b", title: "Shareholder agreement", short: "Agreement", sub: "Next · with your co-founder", icon: "people", status: "next", why: "Agree shares, roles, vesting and what happens if one of you leaves.", partners: ["lawyer"], crowd: { share: 0.69, label: "signed a shareholder agreement before the deed" } },
    { id: "b-plan", chapter: "launch", branch: "b", title: "Financial plan", short: "Plan", sub: "Next · with an accountant", icon: "chart", status: "next", why: "A BV needs a financial plan for the first two years and sufficient starting equity.", partners: ["accountant"], crowd: { share: 0.88, label: "had their accountant write the plan" } },
    { id: "b-deed", chapter: "launch", branch: "b", title: "Notary deed", short: "Deed", sub: "Next · switch day", icon: "pen", status: "next", why: "The notary draws up the articles and files the deed; the BV gets its own enterprise number.", partners: ["notary", "kbc"], crowd: { share: 0.54, label: "used the notary their accountant works with" } },
    {
      id: "terms", chapter: "first-year", title: "Terms, privacy and your brand", short: "Terms", sub: "Later · before your first customer", icon: "scale", status: "next",
      why: "Terms of service and a privacy policy (GDPR) before the first customer; register your brand name with the Benelux Office for Intellectual Property (BOIP).",
      partners: ["lawyer"], crowd: { share: 0.44, label: "registered their brand in year one" },
    },
    {
      id: "prepay", chapter: "first-year", title: "Tax prepayments", short: "Prepay", sub: "Later · every quarter", icon: "euro", status: "next",
      why: "Prepaying tax on your business income avoids a surcharge.", partners: ["accountant"], crowd: { share: 0.38, label: "made tax prepayments in year one" },
    },
    {
      id: "funding", chapter: "grow", title: "Grow on revenue or raise money", short: "Funding", sub: "Later · Start it @KBC, VLAIO", icon: "bank", status: "next",
      why: "Start it @KBC supports early-stage founders; VLAIO has innovation support. Most founders who raised money switched to a BV first.",
      partners: ["kbc", "vlaio"], crowd: { share: 0.29, label: "joined an accelerator in their first two years" },
    },
  ],
  fork: {
    after: "start", chapter: "launch",
    title: "Start as a side activity, or a BV from day one?",
    question: "Both are fine. You can switch later.",
    a: {
      label: "Side activity", short: "A · Side", share: 0.64, good: "Good to test the product while you keep your job.",
      pros: ["Keep your salary and social rights", "Fastest and cheapest start"], cons: ["You are personally liable"], next: "Enterprise number, VAT, first invoice",
    },
    b: {
      label: "BV from day one", short: "B · BV", share: 0.36, good: "Good with a co-founder or investors on board.",
      pros: ["Shares for you and your co-founder", "Ready for investors"], cons: ["Notary, financial plan and higher costs"], next: "Shareholder agreement, plan, deed",
    },
    pick: "a",
    pickWhy: "You still earn a salary and have no revenue yet. 64% of 18,700 founders before you started on the side and switched to a BV once customers paid or investors joined.",
  },
  team: {
    a: [
      { partner: "counter", why: "Your enterprise number in the KBO", names: SOCIAL_FUNDS.map((n) => `${n} business counter`).slice(0, 3) },
      { partner: "social-fund", why: "Contributions as a side activity", names: SOCIAL_FUNDS },
      { partner: "accountant", why: "VAT returns and your tax return", names: ["ITAA-registered accountants", "Online fixed-fee accountants"] },
      { partner: "kbc", why: "Business account and Start it @KBC", names: ["KBC business adviser", "Start it @KBC"] },
      { partner: "vlaio", why: "Starter advice and innovation support", names: ["VLAIO", "UNIZO"] },
    ],
    b: BV_TEAM,
  },
};

// Chapters for the job roads in ./model, phase by phase.
const PHASE_CHAPTER: Record<string, ChapterId> = {
  "physio:side-start": "launch", "physio:side-year": "first-year", "physio:main": "grow", "physio:bv": "crossroads",
  "lawyer:trainee-start": "launch", "lawyer:trainee": "first-year", "lawyer:own": "grow", "lawyer:bv": "crossroads",
  "student:test": "spark", "student:student": "launch", "student:graduate": "first-year",
  "freelancer:start": "launch", "freelancer:sole-years": "first-year", "freelancer:bv": "crossroads",
  "founder:idea": "spark", "founder:launch": "launch",
  "employer:prepare-hire": "grow", "employer:day-one": "grow", "employer:first-year": "grow",
};
const ICON_BY_PARTNER: Partial<Record<PartnerId, IconName>> = {
  counter: "doc", "social-fund": "shield", accountant: "chart", notary: "pen", lawyer: "scale", vat: "percent",
  insurer: "umbrella", kbc: "card", "social-secretariat": "people", prevention: "shield", riziv: "health", bar: "scale", vlaio: "gift", vdab: "people",
};

/** Adapt a job road to the founder road shape; statuses follow the customer when it is theirs. */
export function roadFromProfile(profile: BizProfile, personKey?: string): FounderRoad {
  const customer = customerRoad(personKey);
  const mine = customer?.profile === profile.id;
  const nowIndex = mine ? profile.phases.findIndex((p) => p.id === customer!.now) : -1;
  let nowGiven = false;
  const nodes: FounderNode[] = profile.phases.flatMap((phase, i) => phase.steps.map((step): FounderNode => {
    let status: NodeStatus = "next";
    if (mine && i < nowIndex) status = "done";
    else if (mine && i === nowIndex && !nowGiven) { status = "now"; nowGiven = true; }
    return {
      id: `${phase.id}:${step.id}`, chapter: PHASE_CHAPTER[`${profile.id}:${phase.id}`] ?? "grow",
      title: step.title, short: step.title.split(" ").slice(0, 2).join(" "),
      sub: status === "done" ? "Done" : status === "now" ? `Now · ${step.when.toLowerCase()}` : step.when,
      icon: ICON_BY_PARTNER[step.partners[0]] ?? "doc", status,
      why: step.detail, todo: step.todo, partners: step.partners, crowd: step.crowd, kate: step.kate,
    };
  }));
  const fork = profile.fork;
  const lastOfAfter = fork ? profile.phases.find((p) => p.id === fork.after)?.steps.at(-1) : undefined;
  const branch = (b: NonNullable<BizProfile["fork"]>["branches"][number], letter: string): Branch => ({
    label: b.label, short: `${letter} · ${b.label}`, share: b.share, good: b.line, pros: [b.line], cons: [], next: "", quote: b.quote,
  });
  return {
    id: `${profile.id}${mine ? `:${personKey}` : ""}`, profileId: profile.id, mine,
    owner: { initial: profile.job[0], name: mine ? "Your business" : `${profile.job} road`, line: profile.headline },
    nodes,
    fork: fork && lastOfAfter ? {
      after: `${fork.after}:${lastOfAfter.id}`,
      chapter: profile.id === "student" || profile.id === "employer" ? nodes.find((n) => n.id === `${fork.after}:${lastOfAfter.id}`)!.chapter : "crossroads",
      title: fork.title, question: fork.intro, a: branch(fork.branches[0], "A"), b: branch(fork.branches[1], "B"),
    } : undefined,
  };
}

/** The road to show: Sofie's full practice road, or a job road adapted to the viewer. */
export function founderRoadFor(profileId: string, personKey?: string): FounderRoad | undefined {
  if (profileId === "physio" && personKey === "sofie") return SOFIE;
  if (profileId === "founder" && personKey === "marc") return MARC;
  const profile = profileById(profileId);
  return profile && roadFromProfile(profile, personKey);
}

export const chapterTitle = (road: FounderRoad, id: ChapterId) => road.chapterTitles?.[id] ?? chapter(id).title;
export const nowNode = (road: FounderRoad) => road.nodes.find((n) => n.status === "now");
export const savedMinutes = (road: FounderRoad) => road.nodes.reduce((sum, n) => sum + (n.status === "done" ? n.saved ?? 0 : 0), 0);
export const formatSaved = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

/** Nodes on the path you follow: shared nodes plus the chosen (or Kate's picked) branch. */
export function routeNodes(road: FounderRoad, chosen?: "a" | "b") {
  const side = chosen ?? road.fork?.pick ?? "b";
  return road.nodes.filter((n) => !n.branch || n.branch === side);
}

/** Apply a crossroads choice: the comparison is done and the first step of the chosen road starts. */
export function chooseBranch(road: FounderRoad, side: "a" | "b"): FounderRoad {
  let started = false;
  const nodes = road.nodes.map((n) => {
    if (n.status === "now") return { ...n, status: "done" as const, sub: "Done · today" };
    if (n.branch === side && !started) { started = true; return { ...n, status: "now" as const, sub: n.sub.replace(/^Next/, "Start") }; }
    return n;
  });
  return { ...road, nodes };
}

/** Mark the current step done and move "now" to the next step on the route. */
export function completeNow(road: FounderRoad, chosen?: "a" | "b"): FounderRoad {
  const route = routeNodes(road, chosen).filter((n) => n.status !== "optional");
  const i = route.findIndex((n) => n.status === "now");
  if (i < 0) return road;
  const nextId = route.slice(i + 1).find((n) => n.status === "next")?.id;
  return {
    ...road,
    nodes: road.nodes.map((n) => n.id === route[i].id ? { ...n, status: "done", sub: "Done · today" }
      : n.id === nextId ? { ...n, status: "now", sub: n.sub.replace(/^Next/, "Start") } : n),
  };
}

/** The chapter-level map: one row per chapter, the ways in, and where this customer stands. */
export interface MapNode { id: string; chapter: ChapterId; label: string; col: number; wayIn?: boolean }
export const MAP_NODES: MapNode[] = [
  { id: "idea", chapter: "spark", label: "Idea check", col: 1, wayIn: true },
  { id: "side", chapter: "launch", label: "Side business", col: 0, wayIn: true },
  { id: "freelance", chapter: "launch", label: "Freelance", col: 1, wayIn: true },
  { id: "partners", chapter: "launch", label: "With partners", col: 2, wayIn: true },
  { id: "clients", chapter: "first-year", label: "First clients", col: 1, wayIn: true },
  { id: "hire", chapter: "grow", label: "First hire", col: 0 },
  { id: "invest", chapter: "grow", label: "Buy or invest", col: 2, wayIn: true },
  { id: "stay", chapter: "crossroads", label: "Stay sole proprietor", col: 0 },
  { id: "bv", chapter: "crossroads", label: "Become a BV", col: 2 },
  { id: "pension", chapter: "mature", label: "Pension & wealth", col: 1 },
  { id: "sell", chapter: "exit", label: "Sell", col: 0 },
  { id: "pass", chapter: "exit", label: "Pass it on", col: 1, wayIn: true },
  { id: "close", chapter: "exit", label: "Close down", col: 2 },
];
export const MAP_EDGES: [string, string][] = [
  ["idea", "side"], ["idea", "freelance"], ["idea", "partners"], ["side", "clients"], ["freelance", "clients"], ["partners", "clients"],
  ["clients", "hire"], ["clients", "invest"], ["hire", "stay"], ["hire", "bv"], ["invest", "stay"], ["invest", "bv"],
  ["stay", "pension"], ["bv", "pension"], ["pension", "sell"], ["pension", "pass"], ["pension", "close"],
];
/** Where each road stands on the map: done nodes, the current node and Kate's route ahead. */
export function mapStateFor(road: FounderRoad): { done: string[]; you?: string; route: string[] } {
  if (road.id === SOFIE.id) return { done: ["idea", "side", "clients", "invest"], you: "invest", route: ["bv", "pension", "pass"] };
  if (road.id === MARC.id) return { done: ["idea"], you: "idea", route: ["side", "clients", "invest", "bv", "pension", "pass"] };
  if (!road.mine) return { done: [], route: [] };
  const now = nowNode(road);
  const at = now ? chapter(now.chapter).n : 0;
  const path = road.profileId === "employer" ? ["idea", "freelance", "clients", "hire", "stay", "pension", "pass"] : ["idea", "freelance", "clients", "invest", "bv", "pension", "pass"];
  const done = path.filter((id) => chapter(MAP_NODES.find((m) => m.id === id)!.chapter).n < at);
  return { done, you: done.at(-1), route: path.filter((id) => !done.includes(id)) };
}
