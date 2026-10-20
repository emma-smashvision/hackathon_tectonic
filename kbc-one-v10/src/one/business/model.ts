// Business roadmaps: from a side activity to an eenmanszaak, a BV and a first employee.
// Every road is written as what earlier KBC customers in the same job actually did.
// All crowd numbers are synthetic demo data. Legal steps describe Belgian rules in
// plain words; amounts that change yearly point to the partner who knows the current figure.

/** Everyone who walked a road before you: the crowd Kate speaks for. */
export const CROWD_TOTAL = 2_300_000;
export const SYNTHETIC = "Synthetic demo crowd · not a forecast or legal advice";

export type LegalForm = "side" | "sole" | "bv" | "employer";
export const FORMS: Record<LegalForm, { label: string; short: string; line: string }> = {
  side: { label: "Side activity", short: "Side", line: "Self-employed next to a salaried job" },
  sole: { label: "Eenmanszaak", short: "Eenmanszaak", line: "Self-employed in your own name" },
  bv: { label: "BV", short: "BV", line: "A company with its own legal personality" },
  employer: { label: "Employer", short: "Employer", line: "Your first employee on the payroll" },
};
export const FORM_ORDER: LegalForm[] = ["side", "sole", "bv", "employer"];

export type PartnerId =
  | "counter" | "social-fund" | "accountant" | "notary" | "lawyer" | "vat" | "insurer"
  | "kbc" | "social-secretariat" | "prevention" | "riziv" | "bar" | "vlaio" | "vdab";

export interface PartnerOption { label: string; share: number; note: string }
export interface Partner {
  id: PartnerId;
  name: string;
  /** the Dutch name people search for, when it differs */
  local?: string;
  kind: "public" | "professional" | "kbc";
  role: string;
  /** what earlier customers chose, when there is a choice to make */
  options?: PartnerOption[];
}

export const PARTNERS: Record<PartnerId, Partner> = {
  counter: {
    id: "counter", name: "Business counter", local: "Ondernemingsloket", kind: "public",
    role: "Registers your activity in the KBO (Crossroads Bank for Enterprises) and gives you a company number.",
    options: [
      { label: "Counter of your social insurance fund", share: 0.52, note: "One visit for both registrations." },
      { label: "Independent counter, online", share: 0.33, note: "Fastest when your paperwork is ready." },
      { label: "Through your accountant", share: 0.15, note: "They file it for you." },
    ],
  },
  "social-fund": {
    id: "social-fund", name: "Social insurance fund", local: "Sociaal verzekeringsfonds", kind: "public",
    role: "Mandatory before you start. Collects your quarterly social contributions and builds your pension, sickness and family rights.",
    options: [
      { label: "Large national fund", share: 0.58, note: "Many offices, app to follow your contributions." },
      { label: "Fund your accountant works with", share: 0.29, note: "One less thing to follow up." },
      { label: "Fund of your professional federation", share: 0.13, note: "Knows your profession's rules." },
    ],
  },
  accountant: {
    id: "accountant", name: "Accountant", local: "Boekhouder / accountant", kind: "professional",
    role: "Bookkeeping, VAT returns, tax return and prepayments. For a BV also the financial plan and annual accounts.",
    options: [
      { label: "Local accountancy office", share: 0.46, note: "Face-to-face; most chosen once there is a BV." },
      { label: "Online fixed-fee accountant", share: 0.31, note: "Cheapest for a simple eenmanszaak." },
      { label: "Specialist in your profession", share: 0.23, note: "Knows the sector's tax rules and deductions." },
    ],
  },
  notary: {
    id: "notary", name: "Notary", local: "Notaris", kind: "professional",
    role: "Draws up and signs the deed of incorporation of your BV and files it for publication.",
    options: [
      { label: "Notary your accountant works with", share: 0.54, note: "Financial plan and deed in one flow." },
      { label: "Notary near you", share: 0.38, note: "Easy to sign in person." },
      { label: "Notary chosen for online incorporation", share: 0.08, note: "Sign remotely with your eID." },
    ],
  },
  lawyer: {
    id: "lawyer", name: "Business lawyer", local: "Advocaat ondernemingsrecht", kind: "professional",
    role: "Contracts, general terms and conditions, shareholder and association agreements, employment contracts.",
    options: [
      { label: "Templates checked by a lawyer", share: 0.44, note: "Most chosen for terms and conditions." },
      { label: "Lawyer for one agreement", share: 0.37, note: "Typical for a shareholder agreement." },
      { label: "Legal help through an insurance", share: 0.19, note: "Legal protection cover for businesses." },
    ],
  },
  vat: {
    id: "vat", name: "VAT administration", local: "FOD Financiën · btw", kind: "public",
    role: "Activates your VAT number and receives your VAT returns, or confirms you are exempt.",
  },
  insurer: {
    id: "insurer", name: "Insurer", local: "Verzekeraar", kind: "professional",
    role: "Professional liability, guaranteed income when you are ill, and the mandatory workplace accident insurance once you employ someone.",
    options: [
      { label: "KBC insurance with your business account", share: 0.41, note: "One adviser for bank and cover." },
      { label: "Broker comparing insurers", share: 0.36, note: "Most chosen for income cover." },
      { label: "Collective scheme of your profession", share: 0.23, note: "Bar, federation or association." },
    ],
  },
  kbc: {
    id: "kbc", name: "KBC business adviser", kind: "kbc",
    role: "Business account, card payments, starter and investment credit, and the bank certificate for your BV's capital.",
  },
  "social-secretariat": {
    id: "social-secretariat", name: "Social secretariat", local: "Sociaal secretariaat", kind: "professional",
    role: "Registers you as an employer with the RSZ, files the Dimona, calculates payroll and knows your joint committee.",
    options: [
      { label: "Large social secretariat", share: 0.63, note: "Payroll, legal updates and HR templates." },
      { label: "Smaller secretariat through your accountant", share: 0.27, note: "Same contact for books and payroll." },
      { label: "Online payroll service", share: 0.1, note: "For one or two simple contracts." },
    ],
  },
  prevention: {
    id: "prevention", name: "External prevention service", local: "Externe preventiedienst", kind: "professional",
    role: "Mandatory once you employ someone: workplace risk analysis and occupational health checks.",
  },
  riziv: {
    id: "riziv", name: "RIZIV", local: "RIZIV / INAMI", kind: "public",
    role: "Your RIZIV number, conventioned status and, for conventioned physiotherapists, a yearly social-statute allowance towards your pension.",
  },
  bar: {
    id: "bar", name: "Your bar", local: "Orde van advocaten (balie)", kind: "professional",
    role: "Registers you as a trainee, supervises the traineeship and sets the rules for your practice, third-party account and lawyer's company.",
  },
  vlaio: {
    id: "vlaio", name: "VLAIO", kind: "public",
    role: "Flemish agency for entrepreneurs: starter advice and subsidies such as the KMO-portefeuille for training and advice.",
  },
  vdab: {
    id: "vdab", name: "VDAB", kind: "public",
    role: "Finds candidates and offers on-the-job training routes when you hire your first employee.",
  },
};

export interface Crowd { share: number; label: string }
export interface BizStep {
  id: string;
  title: string;
  /** "Month 3", "Before day one" */
  when: string;
  detail: string;
  todo: string[];
  partners: PartnerId[];
  crowd: Crowd;
  quote?: { text: string; by: string };
  /** Kate's answer, in the crowd's words */
  kate: string;
}
export interface BizPhase { id: string; title: string; form: LegalForm; when: string; steps: BizStep[] }
export interface BizFork {
  /** shown after this phase */
  after: string;
  title: string;
  intro: string;
  branches: { id: string; label: string; share: number; line: string; quote: string }[];
  kate: string;
}
export interface BizProfile {
  id: string;
  /** the job, as KBC knows it */
  job: string;
  name: string;
  age: number;
  city: string;
  headline: string;
  /** what KBC noticed that points to this road */
  noticed: string;
  crowd: number;
  forms: LegalForm[];
  /** phase the profile's example person is in now */
  now: string;
  phases: BizPhase[];
  fork?: BizFork;
  hue: string;
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

// BV steps every road shares; each profile adds what is specific to its job.
const bvSteps = (crowd: number, job: string): BizStep[] => [
  {
    id: "financial-plan", title: "Write the financial plan and choose your starting capital", when: "2 months before",
    detail: "A BV has no minimum capital, but you need sufficient starting equity and a financial plan for the first two years. Founders are liable if it was clearly too low.",
    todo: ["Two-year budget with your accountant", "Decide what you bring in: cash, equipment or your client base", "Plan the costs of the switch"],
    partners: ["accountant", "kbc"],
    crowd: { share: 0.88, label: "had their accountant write the financial plan" },
    quote: { text: "The plan forced us to price properly. Best side effect of the switch.", by: `A ${job} who switched in 2023` },
    kate: `${pct(0.88)} of the ${crowd.toLocaleString("en-GB")} people on this road let their accountant write the plan. The ones who were happiest afterwards started the plan two months before the deed, not two weeks.`,
  },
  {
    id: "bank-certificate", title: "Open the company account and get the bank certificate", when: "1 month before",
    detail: "A cash contribution goes to a blocked account in the name of the BV in formation. The bank gives the notary a certificate; the money is released once the company exists.",
    todo: ["Book a KBC business adviser", "Deposit the cash contribution", "Send the certificate to the notary"],
    partners: ["kbc", "notary"],
    crowd: { share: 0.74, label: "opened the company account at their existing bank" },
    kate: "Most people did this in one appointment. Bring your eID, the draft articles of association and the amount you contribute.",
  },
  {
    id: "deed", title: "Sign the deed at the notary", when: "Switch day",
    detail: "The notary draws up the articles of association and files the deed. The BV gets its own company number and VAT number.",
    todo: ["Agree the articles: name, seat, purpose, shares", "Sign the deed", "Register the UBO (ultimate beneficial owners) within a month"],
    partners: ["notary", "accountant", "lawyer"],
    crowd: { share: 0.71, label: "registered the UBO in the first month" },
    quote: { text: "The UBO register is a five-minute job. Forgetting it costs a fine.", by: "Took the company road in 2022" },
    kate: "The deed itself is one appointment. What people forgot most: the UBO register, moving contracts and subscriptions into the BV's name, and telling clients the new bank account.",
  },
  {
    id: "director-pay", title: "Pay yourself a director's salary", when: "From month 1",
    detail: "The reduced corporate tax rate on the first €100,000 of profit requires, among other conditions, a director's salary of at least €45,000 a year (or equal to the profit if that is lower).",
    todo: ["Agree a monthly director's salary with your accountant", "Keep paying social contributions as a company director", "Check the yearly corporate tax and annual accounts deadline"],
    partners: ["accountant", "social-fund"],
    crowd: { share: 0.67, label: "paid at least the minimum director's salary from year one" },
    kate: "People who set up a fixed monthly director's salary from the start said cash flow felt like a salary again. The ones who took irregular withdrawals had more surprises at year end.",
  },
];

export const PROFILES: BizProfile[] = [
  {
    id: "physio", job: "Physiotherapist", name: "Lotte", age: 27, city: "Gent", hue: "#7FD6C2",
    headline: "Side practice → own practice → BV",
    noticed: "Hospital salary plus practice payments from patients",
    crowd: 14_300, forms: ["side", "sole", "bv"], now: "side-year",
    phases: [
      {
        id: "side-start", title: "Start on the side", form: "side", when: "Month −3 to 0",
        steps: [
          {
            id: "riziv", title: "Choose conventioned or not", when: "Before you start",
            detail: "Your RIZIV number lets patients get reimbursed. Conventioned physios follow the agreed fees and can get a yearly RIZIV social-statute allowance for their pension.",
            todo: ["Check your RIZIV number and visa", "Decide on conventioned status", "Ask about the social-statute allowance"],
            partners: ["riziv"],
            crowd: { share: 0.81, label: "stayed conventioned in their first three years" },
            quote: { text: "Conventioned made my first patients trust the fees. I never regretted it.", by: "A physio, 4 years ahead" },
            kate: "Of 14,300 physios before you, 81% stayed conventioned at the start. The most common regret was not claiming the social-statute allowance in year one.",
          },
          {
            id: "register", title: "Register as self-employed on the side", when: "Month 0",
            detail: "Keep your hospital job and start an eenmanszaak as a side activity. Join a social insurance fund before your first patient and get your company number at a business counter.",
            todo: ["Join a social insurance fund", "Get your KBO company number", "Keep your employment contract as your main job"],
            partners: ["social-fund", "counter"],
            crowd: { share: 0.68, label: "started as a side activity next to a salaried job" },
            kate: "68% started on the side. They kept the security of a salary and their social rights through their job while their patient list grew.",
          },
          {
            id: "account", title: "Separate practice money from day one", when: "Month 0",
            detail: "A separate account for practice income and costs makes bookkeeping, tax and contributions far simpler.",
            todo: ["Open a business account", "Set up card or payment-link payments for patients", "Park part of every payment automatically"],
            partners: ["kbc"],
            crowd: { share: 0.72, label: "used a separate account from the first patient" },
            kate: "People who mixed practice and private money spent the most hours with their accountant in year one.",
          },
        ],
      },
      {
        id: "side-year", title: "First year as a practice", form: "side", when: "Month 1 to 18",
        steps: [
          {
            id: "vat", title: "Check VAT: treatments are exempt", when: "Month 1",
            detail: "Physiotherapy treatments are exempt from VAT. Selling products or non-medical sessions such as sports coaching can bring VAT obligations.",
            todo: ["List what you sell besides treatments", "Ask your accountant whether you need a VAT registration", "Keep treatment and other income apart in your books"],
            partners: ["vat", "accountant"],
            crowd: { share: 0.34, label: "had some VAT-able income by year two" },
            kate: "A third of physios ended up selling something VAT-able, often insoles, tape or group sessions. The ones who checked early avoided a correction later.",
          },
          {
            id: "cover", title: "Insure your liability and your income", when: "Month 1",
            detail: "Professional liability is a must. A guaranteed-income insurance pays when you cannot work, which matters once the practice becomes your main income.",
            todo: ["Professional liability insurance", "Compare guaranteed-income cover", "Look at a VAPZ (supplementary pension for the self-employed)"],
            partners: ["insurer", "accountant"],
            crowd: { share: 0.57, label: "took guaranteed-income cover before going full-time" },
            kate: "57% took income cover before going full-time. The others mostly did it after their first injury scare.",
          },
          {
            id: "aside", title: "Put money aside for tax and contributions", when: "Every month",
            detail: "Social contributions are provisional at first and recalculated on your real income later. Tax comes on top.",
            todo: ["Park 35 to 40% of practice income", "Plan tax prepayments", "Expect the regularisation letter"],
            partners: ["accountant", "social-fund", "kbc"],
            crowd: { share: 0.49, label: "had a regularisation of contributions they had not saved for" },
            quote: { text: "Every patient payment, 35% to the reserve. Boring, and it saved me twice.", by: "A physio, 3 years ahead" },
            kate: "Half the physios before you were caught by the regularisation. The ones who were not had an automatic transfer on every payment.",
          },
        ],
      },
      {
        id: "main", title: "Own practice, full-time", form: "sole", when: "Month 18 to 48",
        steps: [
          {
            id: "switch-main", title: "Switch to self-employed as main job", when: "Month 18",
            detail: "When the practice becomes your main income, tell your social insurance fund. Your contributions rise to the main-occupation level.",
            todo: ["Tell your social insurance fund the date", "Recalculate your provisional contributions", "End or reduce your salaried job"],
            partners: ["social-fund", "accountant"],
            crowd: { share: 0.62, label: "went full-time within two years" },
            kate: "The median physio went full-time after 18 months, usually once the patient list covered their salary for three months in a row.",
          },
          {
            id: "fit-out", title: "Fit out your own practice", when: "Month 20",
            detail: "Treatment tables, equipment and a lease or purchase of a practice space. Investments are depreciated over several years.",
            todo: ["Budget the fit-out", "Compare investment credit or leasing", "Agree depreciation with your accountant"],
            partners: ["kbc", "accountant", "lawyer"],
            crowd: { share: 0.44, label: "financed their fit-out with an investment credit" },
            kate: "People who shared a practice with one or two others spent less on fit-out and said they felt less alone. Have the lease or association agreement checked.",
          },
        ],
      },
      { id: "bv", title: "Practice becomes a BV", form: "bv", when: "Around month 54", steps: bvSteps(14_300, "physio") },
    ],
    fork: {
      after: "main", title: "Stay an eenmanszaak, or start a BV?",
      intro: "Asked by almost every physio once profit grows. What the two groups said later.",
      branches: [
        { id: "sole", label: "Stayed eenmanszaak", share: 0.57, line: "Simple and cheap while profit stays moderate.", quote: "I looked at it twice. For my income the BV wasn't worth the admin yet." },
        { id: "bv", label: "Started a BV", share: 0.43, line: "Most switched when profit passed about €70,000 a year.", quote: "Lower tax on what I leave in the company, and my house is separate from the practice." },
      ],
      kate: "Physios who switched did so at a median profit of about €70,000. Below that, most stayed an eenmanszaak and were happy with it. Ask your accountant to compare both for your numbers.",
    },
  },
  {
    id: "lawyer", job: "Lawyer", name: "Jonas", age: 26, city: "Leuven", hue: "#B7A6F2",
    headline: "Trainee → own practice → lawyer's BV",
    noticed: "Fees from a law firm and a bar membership payment",
    crowd: 6_800, forms: ["sole", "bv"], now: "trainee",
    phases: [
      {
        id: "trainee-start", title: "Join the bar", form: "sole", when: "Month −2 to 0",
        steps: [
          {
            id: "bar", title: "Register at the bar as a trainee", when: "Month −2",
            detail: "Your traineeship (stage) starts with registration on the list of trainees. Almost all trainees work self-employed from day one.",
            todo: ["Find a supervising lawyer (patroon)", "Register on the trainee list", "Plan the training courses of the traineeship"],
            partners: ["bar"],
            crowd: { share: 0.96, label: "were self-employed from the first day of their traineeship" },
            kate: "Almost every trainee before you started self-employed. The biggest surprise for most: you are a business from day one, with your own contributions and VAT.",
          },
          {
            id: "register", title: "Company number, social insurance fund and VAT", when: "Month 0",
            detail: "Lawyers' services are subject to 21% VAT. Register in the KBO, activate your VAT number and join a social insurance fund before you start.",
            todo: ["Join a social insurance fund", "Get your KBO company number", "Activate your VAT number"],
            partners: ["counter", "social-fund", "vat"],
            crowd: { share: 0.83, label: "used an accountant from their first VAT return" },
            kate: "83% hired an accountant before their first quarterly VAT return. Those who tried it alone mostly switched within a year.",
          },
          {
            id: "third-party", title: "Open a third-party account", when: "Month 0",
            detail: "Money you receive for clients must go through a dedicated third-party account (derdenrekening), separate from your own fees.",
            todo: ["Open a third-party account", "Open a separate account for your own fees", "Report the account to the bar"],
            partners: ["kbc", "bar"],
            crowd: { share: 0.91, label: "opened their third-party account at the same bank as their fees account" },
            kate: "Keeping both accounts at one bank made reconciliation easiest, according to the lawyers before you.",
          },
        ],
      },
      {
        id: "trainee", title: "Traineeship years", form: "sole", when: "Year 1 to 3",
        steps: [
          {
            id: "fee", title: "Agree your trainee fee and your own clients", when: "Month 1",
            detail: "Your supervising firm pays you a fee as a self-employed trainee. Many trainees also build a few own clients.",
            todo: ["Agree the fee in writing", "Agree whether you may take own clients", "Invoice with VAT every month"],
            partners: ["bar", "accountant"],
            crowd: { share: 0.48, label: "had their own clients by the end of year two" },
            kate: "About half had their own clients by year two. They said the experience counted as much as the extra income.",
          },
          {
            id: "cover", title: "Top up your cover", when: "Month 2",
            detail: "Your bar provides a collective professional liability cover. Income cover when you are ill is your own responsibility.",
            todo: ["Check what the collective cover includes", "Compare guaranteed-income insurance", "Start a VAPZ when income allows"],
            partners: ["insurer", "bar"],
            crowd: { share: 0.39, label: "took guaranteed-income cover during the traineeship" },
            kate: "Fewer than 4 in 10 took income cover as trainees. Those who waited paid more later because premiums rise with age.",
          },
          {
            id: "aside", title: "Reserve for tax, VAT and the regularisation", when: "Every month",
            detail: "VAT is not your money, contributions get recalculated, and income tax comes a year later.",
            todo: ["Park the VAT immediately", "Park 35 to 40% of your fee", "Plan tax prepayments"],
            partners: ["accountant", "social-fund", "kbc"],
            crowd: { share: 0.53, label: "were surprised by their first tax bill" },
            quote: { text: "Three accounts: VAT, tax, me. It sounds strict; it is what made year two calm.", by: "A lawyer, 5 years ahead" },
            kate: "53% were surprised by their first tax bill. The ones who weren't had separate pots for VAT and tax from the first invoice.",
          },
        ],
      },
      {
        id: "own", title: "Own practice", form: "sole", when: "Year 3 to 6",
        steps: [
          {
            id: "office", title: "Open your office or join an association", when: "Year 3",
            detail: "After the traineeship, choose between staying as associate, starting alone or joining an association of lawyers.",
            todo: ["Compare associate, solo and association", "Have the association agreement checked", "Budget office, software and library"],
            partners: ["lawyer", "bar", "kbc"],
            crowd: { share: 0.46, label: "joined an association rather than starting alone" },
            kate: "46% joined an association. They valued shared costs and cover during holidays; the solo starters valued freedom of clients.",
          },
        ],
      },
      { id: "bv", title: "Practice becomes a lawyer's BV", form: "bv", when: "Around year 6", steps: [
        {
          id: "bar-rules", title: "Check the bar's rules for a lawyer's company", when: "3 months before",
          detail: "A lawyer's BV must respect the bar's deontological rules on shareholders, purpose and independence.",
          todo: ["Ask your bar for the rules on lawyer companies", "Align the company purpose", "Inform the bar of the incorporation"],
          partners: ["bar", "lawyer"],
          crowd: { share: 0.77, label: "asked the bar before drafting the articles" },
          kate: "Lawyers who checked the bar's rules first never had to amend their articles afterwards.",
        },
        ...bvSteps(6_800, "lawyer"),
      ] },
    ],
    fork: {
      after: "own", title: "Stay an eenmanszaak, or start a lawyer's BV?",
      intro: "Most lawyers face this once fees grow. What the two groups said later.",
      branches: [
        { id: "sole", label: "Stayed eenmanszaak", share: 0.48, line: "Simpler, and fine at moderate income.", quote: "My practice is small and stable. The company would only add admin." },
        { id: "bv", label: "Started a lawyer's BV", share: 0.52, line: "Most switched in year 5 or 6 of practice.", quote: "Once fees passed a certain level, the BV clearly paid off." },
      ],
      kate: "Slightly more than half of lawyers before you switched to a BV, usually in year 5 or 6. Their accountant compared both options first.",
    },
  },
  {
    id: "student", job: "Student entrepreneur", name: "Amira", age: 21, city: "Antwerpen", hue: "#F2B880",
    headline: "Student webshop → side business → own company",
    noticed: "Regular webshop payouts on a student account",
    crowd: 21_500, forms: ["side", "sole"], now: "student",
    phases: [
      {
        id: "test", title: "Test the idea", form: "side", when: "Now",
        steps: [
          {
            id: "hobby", title: "Is it still a hobby?", when: "Now",
            detail: "Selling things regularly to make a profit is a business activity, not occasional income. Regular sales mean it is time to register.",
            todo: ["Count your sales over the last 6 months", "Note your costs", "Talk it through with Kate or an adviser"],
            partners: ["kbc", "vlaio"],
            crowd: { share: 0.64, label: "registered within six months of regular sales" },
            kate: "64% of student founders before you registered within six months of regular sales. Those who waited longer usually had to correct taxes afterwards.",
          },
          {
            id: "pocket", title: "Keep business money separate", when: "Now",
            detail: "A separate pocket for sales and costs shows you what the business really earns.",
            todo: ["Open a separate pocket", "Route webshop payouts to it", "Pay business costs only from it"],
            partners: ["kbc"],
            crowd: { share: 0.71, label: "used a separate account before registering" },
            kate: "People who separated their money early could show their real profit in one tap when their parents, an accountant or a bank asked.",
          },
        ],
      },
      {
        id: "student", title: "Student-entrepreneur status", form: "side", when: "Month 0 to graduation",
        steps: [
          {
            id: "status", title: "Register as a student-entrepreneur", when: "Month 0",
            detail: "Between 18 and 25 you can be self-employed with the student-entrepreneur status: reduced or no social contributions below an income threshold.",
            todo: ["Join a social insurance fund and ask for the student status", "Get your KBO company number", "Keep proof of enrolment"],
            partners: ["social-fund", "counter"],
            crowd: { share: 0.58, label: "paid no or reduced contributions in their first year" },
            kate: "58% paid little or no contributions in year one thanks to the student status. Ask your fund for the current income threshold.",
          },
          {
            id: "dependent", title: "Watch your parents' tax and child benefit", when: "Month 1",
            detail: "Your net income can affect whether you stay fiscally dependent on your parents and your child benefit (Groeipakket).",
            todo: ["Estimate your yearly net income", "Check the dependency limits with an accountant", "Tell your parents before it matters"],
            partners: ["accountant"],
            crowd: { share: 0.27, label: "lost dependent status for a year without expecting it" },
            quote: { text: "My shop did well and my parents' tax went up. Talk about it at the kitchen table first.", by: "A student founder, 2 years ahead" },
            kate: "More than 1 in 4 lost dependent status for a year unexpectedly. The fix most used: planning bigger purchases in the same year as bigger sales.",
          },
          {
            id: "vat", title: "Choose the small-business VAT exemption", when: "Month 0",
            detail: "Below €25,000 turnover a year you can use the small-business VAT exemption: no VAT on your sales, but no VAT deduction on your costs either.",
            todo: ["Estimate turnover for the year", "Choose exemption or normal VAT", "Keep track as you approach the limit"],
            partners: ["vat", "accountant"],
            crowd: { share: 0.76, label: "used the small-business exemption in year one" },
            kate: "76% started with the exemption. The ones who sold to other businesses or had big startup costs often chose normal VAT instead.",
          },
          {
            id: "webshop", title: "Get your webshop rules right", when: "Month 1",
            detail: "Consumers have a 14-day right of withdrawal online. You need clear terms and conditions and a privacy policy.",
            todo: ["Publish terms and conditions", "Explain the 14-day withdrawal right", "Add a privacy policy"],
            partners: ["lawyer"],
            crowd: { share: 0.52, label: "used lawyer-checked templates for their terms" },
            kate: "Half used checked templates. The most common customer dispute before you was about returns, so put the return rules where people can see them.",
          },
        ],
      },
      {
        id: "graduate", title: "After graduation", form: "sole", when: "From graduation",
        steps: [
          {
            id: "after-status", title: "Choose your status after your studies", when: "At graduation",
            detail: "The student status ends. You continue as a side activity next to a job, or as self-employed main occupation.",
            todo: ["Tell your social insurance fund the date", "Recalculate provisional contributions", "Look at starter support"],
            partners: ["social-fund", "vlaio", "accountant"],
            crowd: { share: 0.42, label: "went full-time on their business after graduating" },
            kate: "42% went full-time straight away. The rest kept it on the side next to a first job and decided again two years later.",
          },
          {
            id: "grow", title: "Fund your growth", when: "Year 1 after",
            detail: "Stock, a better website or equipment. Look at starter credit and subsidies for advice and training.",
            todo: ["Make a 12-month budget", "Ask about a starter credit", "Check the KMO-portefeuille"],
            partners: ["kbc", "vlaio"],
            crowd: { share: 0.33, label: "used a starter credit in their first year after graduating" },
            kate: "A third used a starter credit. Their advice: borrow for things that earn money, like stock, not for running costs.",
          },
        ],
      },
    ],
    fork: {
      after: "student", title: "Keep it on the side, or go full-time?",
      intro: "The question at graduation. What the two groups said later.",
      branches: [
        { id: "side", label: "First job, business on the side", share: 0.58, line: "A salary and social rights while the business grows.", quote: "My job paid the rent, my shop paid my dreams." },
        { id: "full", label: "Full-time on the business", share: 0.42, line: "Most had at least a year of steady sales first.", quote: "I had a year of sales behind me. That made the jump feel safe." },
      ],
      kate: "Student founders who went full-time usually had a year of steady sales and a three-month buffer first. Without both, most chose a job and kept the shop on the side.",
    },
  },
  {
    id: "freelancer", job: "Freelance designer", name: "Karim", age: 45, city: "Antwerpen", hue: "#9FD3B0",
    headline: "Eenmanszaak → BV",
    noticed: "Client invoices since early 2025 and a growing tax reserve",
    crowd: 38_900, forms: ["sole", "bv"], now: "sole-years",
    phases: [
      {
        id: "start", title: "Start your eenmanszaak", form: "sole", when: "Month 0",
        steps: [
          {
            id: "register", title: "Company number, social insurance fund and VAT", when: "Month 0",
            detail: "Register in the KBO, join a social insurance fund before your first invoice and activate your VAT number.",
            todo: ["Join a social insurance fund", "Get your KBO company number", "Activate VAT or choose the small-business exemption"],
            partners: ["counter", "social-fund", "vat"],
            crowd: { share: 0.79, label: "did all three registrations in the same week" },
            kate: "79% did all registrations in one week, mostly through their social insurance fund's counter.",
          },
          {
            id: "account", title: "Separate account and invoice reminders", when: "Month 0",
            detail: "A business account and automatic reminders for unpaid invoices.",
            todo: ["Open a business account", "Put the payment term on the first line of your invoice", "Turn on invoice reminders"],
            partners: ["kbc", "accountant"],
            crowd: { share: 0.46, label: "had a client pay more than 60 days late in year one" },
            kate: "Almost half had a late payer in year one. A three-month buffer turned it from a crisis into an annoyance.",
          },
        ],
      },
      {
        id: "sole-years", title: "The first two years", form: "sole", when: "Month 1 to 24",
        steps: [
          {
            id: "aside", title: "Park 40% of every invoice", when: "Every invoice",
            detail: "Your first social contributions and taxes arrive later than your income. The regularisation comes years after.",
            todo: ["Auto-park 40% of invoices", "Plan tax prepayments", "Raise provisional contributions when income rises"],
            partners: ["accountant", "social-fund", "kbc"],
            crowd: { share: 0.38, label: "made tax prepayments in year one" },
            quote: { text: "Every invoice: 40% goes to another account the same day. No exceptions.", by: "Drove this road in 2022" },
            kate: "Only 38% made tax prepayments in year one. The rest paid a surcharge they could have avoided.",
          },
          {
            id: "cover", title: "Cover your income", when: "Month 6",
            detail: "Nothing pays you if you are ill for months. Most freelancers looked at income cover and a VAPZ in their first years.",
            todo: ["Compare guaranteed-income insurance", "Start a VAPZ", "Check your hospital cover"],
            partners: ["insurer", "kbc"],
            crowd: { share: 0.51, label: "took income cover in their first two years" },
            kate: "About half took income cover early. The other half mostly did it after a long illness of someone they knew.",
          },
        ],
      },
      { id: "bv", title: "Switch to a BV", form: "bv", when: "Around month 30", steps: [
        ...bvSteps(38_900, "freelancer").slice(0, 3),
        {
          id: "transfer", title: "Move your eenmanszaak into the BV", when: "Switch day",
          detail: "Clients, contracts, equipment and subscriptions move to the BV. Your eenmanszaak's activity stops or changes.",
          todo: ["Contribute or sell your equipment to the BV", "Move client contracts and subscriptions", "Stop or adapt your eenmanszaak in the KBO"],
          partners: ["accountant", "counter", "lawyer"],
          crowd: { share: 0.69, label: "moved everything in the same quarter as the deed" },
          kate: "Doing it all in one quarter kept the books simple. The usual stragglers were software subscriptions and the car.",
        },
        bvSteps(38_900, "freelancer")[3],
      ] },
    ],
    fork: {
      after: "sole-years", title: "Stay an eenmanszaak, or start a BV?",
      intro: "Usually asked when income grows. What the two groups said later.",
      branches: [
        { id: "sole", label: "Stayed eenmanszaak", share: 0.61, line: "Simple and cheap.", quote: "Simple and cheap. When income jumped, I regretted waiting." },
        { id: "bv", label: "Started a BV", share: 0.39, line: "Most switched around month 24 to 30.", quote: "Year one was paperwork. By year three it clearly paid off." },
      ],
      kate: "39% of freelancers switched, mostly between month 24 and 30. By year three the BV group was more likely to say they would do it again.",
    },
  },
  {
    id: "employer", job: "Bakery owner", name: "Wouter", age: 38, city: "Hasselt", hue: "#F29BA6",
    headline: "BV → first employee",
    noticed: "Sales growing 4 quarters in a row and long Saturday hours",
    crowd: 27_400, forms: ["bv", "employer"], now: "prepare-hire",
    phases: [
      {
        id: "prepare-hire", title: "Before you hire", form: "bv", when: "Month −3",
        steps: [
          {
            id: "cost", title: "Budget the full cost, not the gross salary", when: "Month −3",
            detail: "On top of the gross salary come employer social contributions, holiday pay, an end-of-year bonus in many sectors, insurance and payroll fees.",
            todo: ["Ask your social secretariat for a full cost simulation", "Check the reduction for your first hires", "Test it against your slowest month"],
            partners: ["social-secretariat", "accountant"],
            crowd: { share: 0.41, label: "underestimated the real cost of their first employee" },
            quote: { text: "I budgeted the gross salary. The holiday pay in May was my wake-up call.", by: "A shop owner, 2 years ahead" },
            kate: "41% underestimated the cost. Belgium reduces employer contributions for your first hires; your social secretariat knows the current amount.",
          },
          {
            id: "secretariat", title: "Choose a social secretariat", when: "Month −2",
            detail: "It registers you as an employer with the RSZ, finds your joint committee (paritair comité) and runs payroll.",
            todo: ["Compare two or three secretariats", "Find your joint committee and its wage scales", "Register as an employer"],
            partners: ["social-secretariat"],
            crowd: { share: 0.63, label: "chose a large social secretariat" },
            kate: "Most chose a large secretariat for the legal updates. Owners who already had a good accountant often chose the secretariat their accountant works with.",
          },
          {
            id: "find", title: "Find the right person", when: "Month −2",
            detail: "Post the vacancy, or train someone on the job through a VDAB route.",
            todo: ["Write the job description", "Post the vacancy", "Ask about on-the-job training routes"],
            partners: ["vdab"],
            crowd: { share: 0.29, label: "hired through an on-the-job training route" },
            kate: "29% hired through an on-the-job training route. They said it lowered the risk of a wrong hire.",
          },
        ],
      },
      {
        id: "day-one", title: "Before day one", form: "employer", when: "Month −1 to 0",
        steps: [
          {
            id: "insurance", title: "Workplace accident insurance", when: "Before day one",
            detail: "Mandatory from the first employee, before they start.",
            todo: ["Take workplace accident insurance", "Check your liability cover for staff", "Add staff to your fire and theft cover"],
            partners: ["insurer"],
            crowd: { share: 0.88, label: "arranged it through their existing insurer" },
            kate: "Almost 9 in 10 used their existing insurer. It is usually one call.",
          },
          {
            id: "prevention", title: "Join an external prevention service", when: "Before day one",
            detail: "Every employer needs one: risk analysis of the workplace and health checks where needed.",
            todo: ["Join an external prevention service", "Do the risk analysis", "Plan the health check if required"],
            partners: ["prevention"],
            crowd: { share: 0.57, label: "had never heard of it before their first hire" },
            kate: "More than half had never heard of it. Your social secretariat can point you to one.",
          },
          {
            id: "contract", title: "Contract, work regulations and Dimona", when: "Before day one",
            detail: "A written contract, work regulations (arbeidsreglement) and the Dimona declaration before the first working day.",
            todo: ["Draft the employment contract", "Write the work regulations", "File the Dimona before day one"],
            partners: ["social-secretariat", "lawyer"],
            crowd: { share: 0.82, label: "let their social secretariat file the Dimona" },
            kate: "82% let the social secretariat file the Dimona and used its contract templates. Have a lawyer check anything unusual, like a non-compete.",
          },
        ],
      },
      {
        id: "first-year", title: "Your first year as employer", form: "employer", when: "Month 1 to 12",
        steps: [
          {
            id: "payroll", title: "Run payroll every month", when: "Every month",
            detail: "Salary, withholding tax and social contributions go out every month; holiday pay and the end-of-year bonus come once a year.",
            todo: ["Fixed payroll date", "Reserve monthly for holiday pay and the end-of-year bonus", "Link payroll to your business account"],
            partners: ["social-secretariat", "kbc"],
            crowd: { share: 0.48, label: "built a monthly reserve for holiday pay" },
            kate: "Owners who reserved monthly for holiday pay and the end-of-year bonus said May and December felt like normal months.",
          },
          {
            id: "review", title: "Review after six months", when: "Month 6",
            detail: "Did the hire free your time and grow sales? That is the moment most owners decided on a second hire.",
            todo: ["Compare sales and hours before and after", "Talk with your employee", "Decide on a second hire or not"],
            partners: ["accountant", "kbc"],
            crowd: { share: 0.37, label: "hired a second employee within 18 months" },
            kate: "37% hired a second person within 18 months. Most said the first hire gave them back their Saturdays before it gave them extra profit.",
          },
        ],
      },
    ],
    fork: {
      after: "prepare-hire", title: "Hire an employee, or work with freelancers?",
      intro: "The first question when the work outgrows you. What the two groups said later.",
      branches: [
        { id: "employee", label: "Hired an employee", share: 0.66, line: "Steady help and a team, with fixed costs.", quote: "Someone who knows the shop as well as I do. Worth every euro." },
        { id: "freelance", label: "Worked with freelancers", share: 0.34, line: "Flexible, but hard for daily shop work.", quote: "Fine for peak weeks. For every Saturday I needed someone on the payroll." },
      ],
      kate: "Two thirds hired an employee. For daily, fixed work such as a shop, owners preferred an employee; freelancers were used for peaks and specialist work.",
    },
  },
];

export const profileById = (id: string) => PROFILES.find((p) => p.id === id);

/** KBC knows your job: map a demo customer to the business road their transactions point to. */
const DETECTED: Record<string, string> = { karim: "freelancer" };
export const detectedProfile = (personKey?: string) => (personKey ? DETECTED[personKey] : undefined);

export const BUSINESS_QUERY = /\b(business|ondernem\w*|eenmanszaak|bv|company|vennootschap|freelanc\w*|zelfstandig\w*|self[- ]employed|start(?:ing)? (?:a |my )?(?:business|company|practice)|hire|employee|werknemer|personeel|student|physio|kine\w*|lawyer|advoca\w*)\b/i;

export const stepsOf = (profile: BizProfile) => profile.phases.flatMap((phase) => phase.steps.map((step) => ({ phase, step })));
export const partnersOf = (profile: BizProfile): Partner[] => {
  const ids = new Set(stepsOf(profile).flatMap(({ step }) => step.partners));
  return [...ids].map((id) => PARTNERS[id]);
};
/** Which steps and phase each partner first appears in: "when you need them". */
export const firstNeed = (profile: BizProfile, id: PartnerId) => stepsOf(profile).find(({ step }) => step.partners.includes(id));
export const crowdFor = (profile: BizProfile, share: number) => Math.round(profile.crowd * share);
