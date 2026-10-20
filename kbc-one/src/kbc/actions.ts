import { duplicates, leftUntilPayday } from "./blocks";
import { day, daysBetween, eur, gbp, minutesBetween, round2 } from "./format";
import type { ActionView, Customer, IntentView, Persona } from "./types";

export const GBP_RATE = 0.85;

type ActionDef = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  /** Allowed params with [min, max]. Anything else is rejected. */
  params: Record<string, [number, number]>;
  /** Only offered when this customer actually has what the action needs. */
  available?: (c: Customer) => boolean;
  /** Needs a known contact as recipient (`to` = contact id). */
  needsContact?: boolean;
  /** Optional list of contacts (`to` = "id,id"); defaults to the usual split group. */
  pickContacts?: boolean;
  /** Proactive suggestion with pre-filled params, or null when not relevant now. */
  suggest?: (c: Customer) => ActionView | null;
  /** Human summary for a confirm sheet. */
  describe: (
    c: Customer,
    p: Record<string, number>,
    to?: string,
  ) => { title: string; rows: [string, string][] };
  run: (c: Customer, p: Record<string, number>, to?: string) => string;
};

const stamp = (p: Persona) => p.now;

function splitNames(c: Customer, to?: string): string[] {
  const ids = to ? to.split(",") : (c.persona.splitGroup ?? []);
  return ids
    .map((id) => c.persona.contacts.find((x) => x.id === id)?.name)
    .filter((x): x is string => Boolean(x));
}
let n = 0;
const txId = () => `x${Date.now().toString(36)}${++n}`;

export const ACTIONS: ActionDef[] = [
  {
    id: "exchange_pocket",
    level: 1,
    title: "Top up pound pocket",
    available: (c) => c.persona.accounts.pocketGBP !== undefined,
    params: { amount: [20, 1000] },
    suggest: ({ persona: p }) => {
      if (p.accounts.pocketGBP === undefined || !p.abroad) return null;
      if (p.accounts.pocketGBP >= p.abroad.dailySpend * 1.5) return null;
      return {
        id: "exchange_pocket",
        level: 1,
        title: "Pound pocket is low",
        why: `${gbp(p.accounts.pocketGBP)} left. You spend about £ ${p.abroad.dailySpend} a day here.`,
        button: `${gbp(150 * GBP_RATE)} for € 150`,
        params: { amount: 150 },
        icon: "swap",
        facts: [
          `Pocket: ${gbp(p.accounts.pocketGBP)}`,
          `About £ ${p.abroad.dailySpend} a day in ${p.abroad.city}`,
          `Trip until ${day(p.abroad.until)}`,
        ],
      };
    },
    describe: (_c, p) => ({
      title: "Top up your pound pocket",
      rows: [
        ["You pay", eur(p.amount)],
        ["You get", gbp(p.amount * GBP_RATE)],
        ["Rate", "€ 1 = £ 0,85"],
        ["Fee", "€ 0"],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      p.accounts.current = round2(p.accounts.current - amount);
      p.accounts.pocketGBP = round2(
        (p.accounts.pocketGBP ?? 0) + amount * GBP_RATE,
      );
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: "Exchange to GBP pocket",
        category: "savings",
        amount: -amount,
      });
      return `${gbp(amount * GBP_RATE)} added to your pound pocket.`;
    },
  },
  {
    id: "move_from_savings",
    level: 1,
    title: "Move money from savings",
    params: { amount: [50, 5000] },
    suggest: ({ persona: p }) => {
      const l = leftUntilPayday(p);
      if (!l || l.left > 150 || p.accounts.savings < 300) return null;
      const amount = Math.max(100, Math.ceil((300 - l.left) / 50) * 50);
      return {
        id: "move_from_savings",
        level: 1,
        title: "Bills before payday",
        why: `${eur(l.billsSum)} goes out before ${day(l.pay.date)}; you’d have ${eur(l.left)} left.`,
        button: `Move ${eur(amount, { cents: false })} from savings`,
        params: { amount },
        icon: "swap",
        facts: [
          `Bills before payday: ${eur(l.billsSum)}`,
          `Savings: ${eur(p.accounts.savings)}`,
        ],
      };
    },
    describe: (c, p) => ({
      title: "Move from savings",
      rows: [
        ["Amount", eur(p.amount)],
        ["From", `Savings · ${eur(c.persona.accounts.savings)}`],
        ["To", "Current account"],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      p.accounts.savings = round2(p.accounts.savings - amount);
      p.accounts.current = round2(p.accounts.current + amount);
      return `${eur(amount)} moved to your current account.`;
    },
  },
  {
    id: "save_to_goal",
    level: 1,
    title: "Add to savings goal",
    available: (c) => c.persona.goals.length > 0,
    params: { amount: [10, 5000] },
    describe: (c, p) => ({
      title: `Add to ${c.persona.goals[0]?.name ?? "your goal"}`,
      rows: [
        ["Amount", eur(p.amount)],
        ["From", "Current account"],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      const g = p.goals[0];
      if (!g) throw new Error("No goal");
      p.accounts.current = round2(p.accounts.current - amount);
      p.accounts.savings = round2(p.accounts.savings + amount);
      g.saved = round2(g.saved + amount);
      if (p.home && g.id === "g1" && p.id === "sofie") p.home.fund = g.saved;
      return `${eur(amount)} added to ${g.name}.`;
    },
  },
  {
    id: "refund_duplicate",
    level: 1,
    title: "Get a double payment back",
    available: (c) => duplicates(c.persona).length > 0,
    params: {},
    suggest: ({ persona: p }) => {
      const d = duplicates(p)[0];
      if (!d) return null;
      return {
        id: "refund_duplicate",
        level: 1,
        title: "Paid twice?",
        why: `${d.merchant} took ${eur(d.amount)} on ${d.dates.map(day).join(" and ")}.`,
        button: `Get ${eur(d.amount)} back`,
        params: {},
        icon: "alert",
        facts: [
          `${d.merchant} ${eur(d.amount)} twice in ${Math.abs(daysBetween(d.dates[0], d.dates[1]))} day(s)`,
          "Direct debits can be refunded",
        ],
      };
    },
    describe: (c) => {
      const d = duplicates(c.persona)[0];
      return {
        title: "Get your money back",
        rows: [
          ["Refund", d ? `${d.merchant} · ${eur(d.amount)}` : "—"],
          ["Back on", "Current account, today"],
        ],
      };
    },
    run: ({ persona: p }) => {
      const d = duplicates(p)[0];
      if (!d) throw new Error("Nothing to refund");
      p.accounts.current = round2(p.accounts.current + d.amount);
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: `Refund ${d.merchant}`,
        category: "refund",
        amount: d.amount,
      });
      return `${eur(d.amount)} is on its way back from ${d.merchant}.`;
    },
  },
  {
    id: "freeze_card",
    level: 1,
    title: "Freeze or unfreeze card",
    params: {},
    describe: (c) => ({
      title: c.persona.card.frozen ? "Unfreeze your card" : "Freeze your card",
      rows: [["Card", `•• ${c.persona.card.last4}`]],
    }),
    run: ({ persona: p }) => {
      p.card.frozen = !p.card.frozen;
      return p.card.frozen
        ? "Your card is frozen. Nobody can use it."
        : "Your card works again.";
    },
  },
  {
    id: "set_aside_tax",
    level: 1,
    title: "Set aside VAT",
    available: (c) =>
      Boolean(
        c.persona.taxReserve && c.persona.accounts.business !== undefined,
      ),
    params: { amount: [10, 20000] },
    suggest: ({ persona: p }) => {
      if (!p.taxReserve) return null;
      const paid = p.transactions.find(
        (t) =>
          t.category === "invoice_paid" &&
          minutesBetween(t.date, p.now) < 24 * 60,
      );
      if (
        !paid ||
        p.transactions.some(
          (t) => t.merchant === `VAT reserve · ${paid.merchant}`,
        )
      )
        return null;
      const amount = round2(paid.amount * p.taxReserve.rate);
      return {
        id: "set_aside_tax",
        level: 1,
        title: `${paid.merchant} paid ${eur(paid.amount, { cents: false })}`,
        why: `Set ${Math.round(p.taxReserve.rate * 100)}% aside for VAT before you spend it.`,
        button: `${eur(amount)} to tax reserve`,
        params: { amount },
        icon: "receipt",
        facts: [
          `${paid.merchant} paid ${eur(paid.amount)} today`,
          `Reserve now ${eur(p.taxReserve.saved, { cents: false })} of ${eur(p.taxReserve.target, { cents: false })}`,
        ],
      };
    },
    describe: (_c, p) => ({
      title: "Set aside for VAT",
      rows: [
        ["Amount", eur(p.amount)],
        ["From", "Business account"],
        ["To", "Tax reserve"],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      if (!p.taxReserve || p.accounts.business === undefined)
        throw new Error("No tax reserve");
      const paid = p.transactions.find(
        (t) =>
          t.category === "invoice_paid" &&
          minutesBetween(t.date, p.now) < 24 * 60,
      );
      p.accounts.business = round2(p.accounts.business - amount);
      p.taxReserve.saved = round2(p.taxReserve.saved + amount);
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: `VAT reserve · ${paid?.merchant ?? "invoice"}`,
        category: "savings",
        amount: -amount,
        account: "business",
      });
      return `${eur(amount)} is set aside. Reserve now ${eur(p.taxReserve.saved, { cents: false })}.`;
    },
  },
  {
    id: "send_pocket_money",
    level: 2,
    title: "Send pocket money",
    available: (c) => Boolean(c.persona.accounts.child),
    params: { amount: [1, 100] },
    suggest: ({ persona: p }) => {
      const ch = p.accounts.child;
      if (!ch || ch.balance >= 5) return null;
      return {
        id: "send_pocket_money",
        level: 2,
        title: `${ch.name}’s account: ${eur(ch.balance)}`,
        why: `Her weekly ${eur(ch.weekly, { cents: false })} is due ${ch.day}.`,
        button: `Send ${eur(ch.weekly, { cents: false })}`,
        params: { amount: ch.weekly },
        icon: "user",
        facts: [
          `${ch.name}’s balance: ${eur(ch.balance)}`,
          `You send ${eur(ch.weekly, { cents: false })} every ${ch.day}`,
        ],
      };
    },
    describe: (c, p) => ({
      title: `Pocket money for ${c.persona.accounts.child?.name}`,
      rows: [
        ["Amount", eur(p.amount)],
        ["To", `${c.persona.accounts.child?.name}’s account`],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      const ch = p.accounts.child;
      if (!ch) throw new Error("No child account");
      p.accounts.current = round2(p.accounts.current - amount);
      ch.balance = round2(ch.balance + amount);
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: `${ch.name} pocket money`,
        category: "family",
        amount: -amount,
      });
      return `${eur(amount)} sent to ${ch.name}.`;
    },
  },
  {
    id: "esim_data",
    level: 2,
    title: "Add travel data",
    available: (c) => Boolean(c.persona.esim),
    params: { gb: [1, 20] },
    suggest: ({ persona: p }) => {
      if (!p.esim || !p.abroad || p.esim.leftGB >= 1) return null;
      return {
        id: "esim_data",
        level: 2,
        title: "Mobile data almost gone",
        why: `${p.esim.leftGB} GB left on your ${p.esim.country} eSIM.`,
        button: "+5 GB · € 9",
        params: { gb: 5 },
        icon: "wifi",
        product: true,
        facts: [
          `${p.esim.leftGB} GB left`,
          `You are in ${p.abroad.city} until ${day(p.abroad.until)}`,
        ],
      };
    },
    describe: (_c, p) => ({
      title: "Add travel data",
      rows: [
        ["Data", `${p.gb} GB`],
        ["Price", eur(p.gb * 1.8)],
        ["Valid", "7 days"],
      ],
    }),
    run: ({ persona: p }, { gb }) => {
      if (!p.esim) throw new Error("No eSIM");
      p.esim.leftGB = round2(p.esim.leftGB + gb);
      p.accounts.current = round2(p.accounts.current - gb * 1.8);
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: "KBC travel eSIM",
        category: "travel",
        amount: -round2(gb * 1.8),
      });
      return `${gb} GB added. You now have ${p.esim.leftGB} GB.`;
    },
  },
  {
    id: "request_split",
    level: 2,
    title: "Ask friends to pay their share",
    available: (c) => Boolean(c.persona.splitGroup?.length),
    params: { total: [1, 5000], people: [2, 12] },
    pickContacts: true,
    describe: (c, p, to) => ({
      title: `Split ${eur(p.total)}`,
      rows: [
        ["Each pays", eur(round2(p.total / p.people))],
        ["Requests to", splitNames(c, to).join(", ")],
        ...(p.people > splitNames(c, to).length + 1
          ? ([
              [
                "Split",
                `${p.people} ways (you + ${splitNames(c, to).length} requests)`,
              ],
            ] as [string, string][])
          : []),
      ],
    }),
    run: (c, { total, people }, to) => {
      const each = round2(total / people);
      const names = splitNames(c, to);
      for (const name of names)
        c.requests.push({ id: txId(), name, amount: each, status: "sent" });
      return `Requests for ${eur(each)} sent to ${names.join(", ")}.`;
    },
  },
  {
    id: "stop_subscription",
    level: 2,
    title: "Stop an unused subscription",
    available: (c) =>
      c.persona.debits.some(
        (d) => d.lastUsed && daysBetween(d.lastUsed, c.persona.now) > 45,
      ),
    params: {},
    describe: (c) => {
      const s = c.persona.debits.find(
        (d) => d.lastUsed && daysBetween(d.lastUsed, c.persona.now) > 45,
      );
      return {
        title: `Stop ${s?.payee ?? "subscription"}`,
        rows: [
          ["Direct debit", s ? `${s.payee} · ${eur(s.amount)} a month` : "—"],
        ],
      };
    },
    run: ({ persona: p }) => {
      const i = p.debits.findIndex(
        (d) => d.lastUsed && daysBetween(d.lastUsed, p.now) > 45,
      );
      if (i < 0) throw new Error("Nothing to stop");
      const [s] = p.debits.splice(i, 1);
      return `${s.payee} won’t be collected any more.`;
    },
  },
  {
    id: "pension_topup",
    level: 2,
    title: "Top up pension saving",
    available: (c) => Boolean(c.persona.pensionSaving),
    params: { amount: [10, 2000] },
    describe: (_c, p) => ({
      title: "Top up pension saving",
      rows: [
        ["Amount", eur(p.amount)],
        ["Before", "31 December"],
      ],
    }),
    run: ({ persona: p }, { amount }) => {
      if (!p.pensionSaving) throw new Error("No plan");
      p.pensionSaving.paid = round2(p.pensionSaving.paid + amount);
      p.accounts.current = round2(p.accounts.current - amount);
      return `${eur(amount)} added to your pension saving.`;
    },
  },
  {
    id: "auto_exchange_rule",
    level: 1,
    title: "Automatic pocket top-up",
    available: (c) => c.persona.accounts.pocketGBP !== undefined,
    params: { amount: [20, 1000], below: [5, 500] },
    describe: (_c, p) => ({
      title: "Automatic top-up",
      rows: [
        ["When pocket is below", gbp(p.below)],
        ["Top up", `${eur(p.amount)} → ${gbp(p.amount * GBP_RATE)}`],
        ["Until", "end of your trip"],
      ],
    }),
    run: (c, { amount, below }) => {
      c.rules = c.rules.filter((r) => r.actionId !== "exchange_pocket");
      c.rules.push({
        id: txId(),
        text: `Top up ${eur(amount)} when the pound pocket drops below ${gbp(below)}`,
        actionId: "exchange_pocket",
        params: { amount, below },
      });
      const pocket = c.persona.accounts.pocketGBP ?? 0;
      if (pocket < below) {
        const done = actionDef("exchange_pocket")?.run(c, { amount });
        return `Rule saved. Your pocket was below ${gbp(below)}, so it ran now: ${done}`;
      }
      return "Rule saved. You can stop it any time.";
    },
  },
  {
    id: "send_to_contact",
    level: 2,
    title: "Send money to someone you know",
    params: { amount: [1, 2500] },
    needsContact: true,
    available: (c) => c.persona.contacts.length > 0,
    describe: (c, p, to) => {
      const who = c.persona.contacts.find((x) => x.id === to);
      return {
        title: `Send ${eur(p.amount)} to ${who?.name ?? "contact"}`,
        rows: [
          ["To", `${who?.name ?? "—"}${who?.kbc ? " · KBC" : ""}`],
          ["Amount", eur(p.amount)],
          ["From", `Current account · ${eur(c.persona.accounts.current)}`],
        ],
      };
    },
    run: ({ persona: p }, { amount }, to) => {
      const who = p.contacts.find((x) => x.id === to);
      if (!who) throw new Error("Unknown recipient");
      if (amount > p.accounts.current)
        throw new Error("Not enough on your current account");
      p.accounts.current = round2(p.accounts.current - amount);
      p.transactions.push({
        id: txId(),
        date: stamp(p),
        merchant: who.name,
        category: "transfer_out",
        amount: -amount,
      });
      return `${eur(amount)} sent to ${who.name}.`;
    },
  },
];

export const actionDef = (id: string) => ACTIONS.find((a) => a.id === id);

/** Validate a proposed action (from the UI or from Kate). Returns clean params or an error. */
export function checkAction(
  c: Customer,
  id: string,
  raw: unknown,
  toRaw?: unknown,
):
  | { ok: true; params: Record<string, number>; to?: string }
  | { ok: false; error: string } {
  const def = actionDef(id);
  if (!def) return { ok: false, error: "Unknown action" };
  if (def.available && !def.available(c))
    return {
      ok: false,
      error: `“${def.title}” isn’t available for this customer`,
    };
  const params: Record<string, number> = {};
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  for (const [k, [min, max]] of Object.entries(def.params)) {
    const v = Number(src[k]);
    if (!Number.isFinite(v) || v < min || v > max)
      return { ok: false, error: `${k} must be between ${min} and ${max}` };
    params[k] = round2(v);
  }
  let to: string | undefined;
  if (def.needsContact) {
    const want = String(toRaw ?? src.to ?? "")
      .trim()
      .toLowerCase();
    const who = c.persona.contacts.find(
      (x) => x.id === want || x.name.toLowerCase() === want,
    );
    if (!who)
      return {
        ok: false,
        error: "Recipient must be one of your known contacts",
      };
    to = who.id;
  }
  if (
    def.pickContacts &&
    (toRaw ?? src.to) !== undefined &&
    (toRaw ?? src.to) !== null &&
    (toRaw ?? src.to) !== ""
  ) {
    const raw = toRaw ?? src.to;
    const wanted = (Array.isArray(raw) ? raw : String(raw).split(","))
      .map((x) => String(x).trim().toLowerCase())
      .filter(Boolean);
    const ids: string[] = [];
    for (const w of wanted) {
      const who = c.persona.contacts.find(
        (x) => x.id === w || x.name.toLowerCase() === w,
      );
      if (!who)
        return {
          ok: false,
          error: "Requests can only go to your known contacts",
        };
      if (!ids.includes(who.id)) ids.push(who.id);
    }
    if (!ids.length || ids.length > 11)
      return { ok: false, error: "Pick between 1 and 11 people" };
    to = ids.join(",");
    // You always pay a share too.
    if (params.people !== undefined && params.people < ids.length + 1)
      params.people = ids.length + 1;
  }
  if (
    (params.amount ?? 0) >
    c.persona.accounts.current + c.persona.accounts.savings
  )
    return { ok: false, error: "Not enough money" };
  return { ok: true, params, to };
}

export function suggestedActions(c: Customer): ActionView[] {
  const out: ActionView[] = [];
  for (const a of ACTIONS) {
    if (!a.suggest || c.muted.includes(a.id)) continue;
    const v = a.suggest(c);
    if (v) out.push(v);
  }
  return out;
}

/** Why did the customer open the app right now? Candidate intents from recent context. */
export function intentCandidates(c: Customer): IntentView[] {
  const p = c.persona;
  const out: IntentView[] = [];
  // Last card payment: our own transfers, savings moves and top-ups don't count.
  const own = new Set(["transfer_out", "savings", "family", "refund"]);
  const last = [...p.transactions]
    .filter(
      (t) => t.amount < 0 && !own.has(t.category) && !/eSIM/.test(t.merchant),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (
    last &&
    last.category === "restaurant" &&
    p.splitGroup?.length &&
    minutesBetween(last.date, p.now) <= 30
  ) {
    const people = p.splitGroup
      .map((id) => p.contacts.find((x) => x.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const total = -last.amount;
    const each = round2(total / (people.length + 1));
    // Already split (any number of ways)?
    const already = c.requests.some((r) => {
      const ways = total / r.amount;
      return (
        ways >= 1.9 && ways <= 12.1 && Math.abs(ways - Math.round(ways)) < 0.01
      );
    });
    if (!already)
      out.push({
        id: "split_bill",
        kicker: `${last.merchant}, ${last.city ?? p.city} · ${minutesBetween(last.date, p.now)} min ago`,
        title: `Split the ${eur(total)}?`,
        detail: `${people.map((x) => x.name).join(", ")} · same group as your last dinners`,
        button: `Ask ${eur(each)} each`,
        actionId: "request_split",
        params: { total, people: people.length + 1 },
        people,
        facts: [
          `You paid ${eur(total)} at ${last.merchant} ${minutesBetween(last.date, p.now)} minutes ago`,
          `That’s more than you usually spend alone on dinner`,
          `Your last 3 dinners were split with ${people.map((x) => x.name).join(", ")}`,
        ],
      });
  }
  return out;
}
