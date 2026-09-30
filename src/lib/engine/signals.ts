import type { Profile, Transaction } from "./types";

export type InjectionGroup = "Transactions" | "Behaviour";

export interface SignalInjection {
  id: string;
  label: string;
  group: InjectionGroup;
  apply: (profile: Profile) => Profile;
}

function otherCity(profile: Profile): string {
  return profile.customer.city === "Gent" ? "Antwerpen" : "Gent";
}

function addTx(
  profile: Profile,
  tx: Omit<Transaction, "id" | "date">,
): Profile {
  const id = `live-${profile.transactions.length + 1}-${tx.category}`;
  return {
    ...profile,
    transactions: [{ id, date: profile.today, ...tx }, ...profile.transactions],
  };
}

function behave(
  profile: Profile,
  patch: (b: Profile["behaviour"]) => Partial<Profile["behaviour"]>,
): Profile {
  return {
    ...profile,
    behaviour: { ...profile.behaviour, ...patch(profile.behaviour) },
  };
}

/** Live signals the demo can inject; each is a pure profile transform. */
export const INJECTIONS: SignalInjection[] = [
  {
    id: "ikea",
    label: "IKEA purchase",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "IKEA Zaventem",
        amount: -349,
        category: "furniture",
      }),
  },
  {
    id: "mover",
    label: "Moving company payment",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: `Verhuisfirma Snel (${otherCity(p)})`,
        amount: -680,
        category: "moving_company",
        city: otherCity(p),
      }),
  },
  {
    id: "rent",
    label: "Rent to new city",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: `Landlord Claeys (${otherCity(p)})`,
        amount: -875,
        category: "rent",
        city: otherCity(p),
      }),
  },
  {
    id: "agent",
    label: "Real-estate agent fee",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "Immo Dewaele — viewing deposit",
        amount: -250,
        category: "real_estate_agent",
      }),
  },
  {
    id: "flight",
    label: "Booked flight to Lisbon",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "TAP Air Portugal BRU → LIS",
        amount: -238,
        category: "flight",
      }),
  },
  {
    id: "abroad",
    label: "Card payment in Lisbon",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "Pastelaria Alfama, Lisboa",
        amount: -12.4,
        category: "foreign_card",
        city: "Lisboa",
        country: "PT",
      }),
  },
  {
    id: "invoice",
    label: "Irregular client invoice",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "Invoice — one-off client",
        amount: 1_150,
        category: "freelance_income",
      }),
  },
  {
    id: "prize",
    label: "€10,000 hackathon prize",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "Tectonic Hackathon — winners' prize",
        amount: 10_000,
        category: "prize",
      }),
  },
  {
    id: "duplicate",
    label: "Duplicate payment detected",
    group: "Transactions",
    apply: (p) => {
      const bill = p.transactions.find((t) => t.directDebit);
      if (!bill) return p;
      const next = new Date(`${bill.date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      return {
        ...p,
        transactions: [
          {
            ...bill,
            id: `live-${p.transactions.length + 1}-duplicate`,
            date: next.toISOString().slice(0, 10),
          },
          ...p.transactions,
        ],
      };
    },
  },
  {
    id: "newPayee",
    label: "€2,400 to a new payee",
    group: "Transactions",
    apply: (p) =>
      addTx(p, {
        merchant: "Unknown payee LT71 3250…",
        amount: -2_400,
        category: "transfer",
        newPayee: true,
      }),
  },
  {
    id: "mortgage",
    label: "Viewed mortgage simulator",
    group: "Behaviour",
    apply: (p) =>
      behave(p, (b) => ({
        pageViews: {
          ...b.pageViews,
          mortgageSimulator: (b.pageViews.mortgageSimulator ?? 0) + 1,
        },
      })),
  },
  {
    id: "portfolio",
    label: "Checked portfolio (+3/week)",
    group: "Behaviour",
    apply: (p) =>
      behave(p, (b) => ({
        portfolioViewsPerWeek: b.portfolioViewsPerWeek + 3,
      })),
  },
  {
    id: "largeText",
    label: "Enabled large text",
    group: "Behaviour",
    apply: (p) => behave(p, () => ({ largeTextEnabled: true })),
  },
  {
    id: "zoom",
    label: "Pinch-zoomed & mis-tapped",
    group: "Behaviour",
    apply: (p) =>
      behave(p, (b) => ({
        zoomUsage: Math.min(1, b.zoomUsage + 0.3),
        errorRate: Math.min(1, b.errorRate + 0.1),
      })),
  },
];

export function getInjection(id: string): SignalInjection {
  const injection = INJECTIONS.find((i) => i.id === id);
  if (!injection) throw new Error(`Unknown signal: ${id}`);
  return injection;
}
