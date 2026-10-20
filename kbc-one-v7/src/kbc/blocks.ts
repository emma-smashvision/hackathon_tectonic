import {
  day,
  daysBetween,
  eur,
  gbp,
  monthName,
  round2,
  weekday,
} from "./format";
import type { BlockView, Customer, Persona, TrackerSpec, Tx } from "./types";

// ---------- Derived facts (code computes every number; models never do) ----------

const SPEND_SKIP = new Set([
  "salary",
  "pension",
  "transfer_in",
  "invoice_paid",
  "savings",
  "app",
  "refund",
]);

export function monthTx(p: Persona, monthsBack = 0): Tx[] {
  const now = new Date(p.now);
  const m = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return p.transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  });
}

export function spendOf(list: Tx[]): number {
  return round2(
    list
      .filter(
        (t) =>
          t.amount < 0 &&
          !SPEND_SKIP.has(t.category) &&
          (t.currency ?? "EUR") === "EUR",
      )
      .reduce((s, t) => s - t.amount, 0),
  );
}

export function spendByCategory(list: Tx[]): { cat: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const t of list) {
    if (
      t.amount >= 0 ||
      SPEND_SKIP.has(t.category) ||
      (t.currency ?? "EUR") !== "EUR"
    )
      continue;
    m.set(t.category, (m.get(t.category) ?? 0) - t.amount);
  }
  return [...m.entries()]
    .map(([cat, amount]) => ({ cat, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export function nextPayday(
  p: Persona,
): { date: string; label: string; amount: number } | null {
  if (p.salary) {
    const now = new Date(p.now);
    let d = new Date(now.getFullYear(), now.getMonth(), p.salary.day, 12);
    if (d.getTime() < now.getTime())
      d = new Date(now.getFullYear(), now.getMonth() + 1, p.salary.day, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: iso, label: "salary", amount: p.salary.amount };
  }
  if (p.pension)
    return { date: p.pension.next, label: "pension", amount: p.pension.amount };
  return null;
}

export function upcoming(p: Persona, untilISO?: string) {
  const until = untilISO ?? "2099-01-01";
  return p.debits
    .filter(
      (d) => daysBetween(p.now, d.due) >= 0 && daysBetween(d.due, until) >= 0,
    )
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function leftUntilPayday(p: Persona) {
  const pay = nextPayday(p);
  if (!pay) return null;
  const bills = upcoming(p, pay.date);
  const billsSum = round2(bills.reduce((s, d) => s + d.amount, 0));
  const left = round2(p.accounts.current - billsSum);
  const days = Math.max(1, daysBetween(p.now, pay.date));
  return { left, days, bills, billsSum, pay, perDay: round2(left / days) };
}

export function duplicates(p: Persona) {
  const out: { merchant: string; amount: number; dates: string[] }[] = [];
  const debitsOut = p.transactions.filter(
    (t) => t.amount < 0 && t.category === "energy",
  );
  for (let i = 0; i < debitsOut.length; i++) {
    for (let j = i + 1; j < debitsOut.length; j++) {
      const a = debitsOut[i];
      const b = debitsOut[j];
      if (
        a.merchant === b.merchant &&
        a.amount === b.amount &&
        Math.abs(daysBetween(a.date, b.date)) <= 3
      ) {
        const refunded = p.transactions.some(
          (t) => t.category === "refund" && t.merchant.includes(a.merchant),
        );
        if (!refunded)
          out.push({
            merchant: a.merchant,
            amount: -a.amount,
            dates: [b.date, a.date].sort(),
          });
      }
    }
  }
  return out;
}

export function subscriptionChanges(p: Persona) {
  return p.debits.filter(
    (d) =>
      (d.previous !== undefined && d.amount > d.previous) ||
      (d.lastUsed && daysBetween(d.lastUsed, p.now) > 45),
  );
}

export function trackerValue(p: Persona, spec: TrackerSpec) {
  const now = new Date(p.now);
  const inPeriod = (t: Tx) => {
    const d = new Date(t.date);
    if (spec.period === "month")
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    return daysBetween(t.date, p.now) < 7 && daysBetween(t.date, p.now) >= 0;
  };
  const kw = spec.keywords.map((k) => k.toLowerCase());
  const matches = p.transactions.filter(
    (t) =>
      t.amount < 0 &&
      (spec.categories.includes(t.category) ||
        kw.some((k) => t.merchant.toLowerCase().includes(k))),
  );
  const cur = matches.filter(inPeriod);
  const total = round2(cur.reduce((s, t) => s - t.amount, 0));
  // weekly buckets for the current month, for the mini chart
  const bars = [0, 0, 0, 0, 0];
  for (const t of cur)
    bars[Math.min(4, Math.floor((new Date(t.date).getDate() - 1) / 7))] +=
      -t.amount;
  const prevMonth = matches.filter(
    (t) => new Date(t.date).getMonth() === (now.getMonth() + 11) % 12,
  );
  const prevTotal = round2(prevMonth.reduce((s, t) => s - t.amount, 0));
  return {
    total,
    count: cur.length,
    bars: bars.map(round2),
    prevTotal,
    merchants: [...new Set(cur.map((t) => t.merchant))],
  };
}

// ---------- Block catalogue ----------

type Def = {
  id: string;
  group:
    | "everyday"
    | "protection"
    | "goals"
    | "life"
    | "travel"
    | "income"
    | "wealth"
    | "time"
    | "people"
    | "kate";
  title: string;
  about: string; // for the model: when this block is useful
  protection?: boolean;
  view: (c: Customer) => BlockView | null; // null = not eligible
};

const CAT_LABEL: Record<string, string> = {
  restaurant: "Eating out",
  groceries: "Groceries",
  moving: "Moving",
  furniture: "Furniture",
  rent: "Rent",
  coffee: "Coffee",
  transport: "Transport",
  travel: "Travel",
  energy: "Energy",
  software: "Software",
  equipment: "Equipment",
  housing: "Housing",
  family: "Family",
  shopping: "Shopping",
  other: "Other",
};
export const catLabel = (c: string) => CAT_LABEL[c] ?? c;

export const BLOCKS: Def[] = [
  {
    id: "spending_month",
    group: "everyday",
    title: "Spending this month",
    about:
      "Default overview of what went out this month; useful for most people.",
    view: ({ persona: p }) => {
      const cur = monthTx(p);
      const total = spendOf(cur);
      const prev = spendOf(monthTx(p, 1));
      const cats = spendByCategory(cur).slice(0, 4);
      const diff = round2(total - prev);
      return {
        id: "spending_month",
        title: `Spent in ${monthName(p.now)}`,
        value: eur(total, { cents: false }),
        sub: prev
          ? `${eur(Math.abs(diff), { cents: false })} ${diff <= 0 ? "less" : "more"} than last month`
          : undefined,
        icon: "bars",
        tone: "normal",
        list: cats.map((c) => ({
          left: catLabel(c.cat),
          right: eur(c.amount, { cents: false }),
        })),
        bars: cats.map((c) => c.amount),
        sentence: `You spent ${eur(total, { cents: false })} this month.`,
        facts: [
          `${cur.length} ${cur.length === 1 ? "payment" : "payments"} so far in ${monthName(p.now)}`,
          ...cats
            .slice(0, 2)
            .map(
              (c) => `${catLabel(c.cat)}: ${eur(c.amount, { cents: false })}`,
            ),
        ],
      };
    },
  },
  {
    id: "left_until_payday",
    group: "everyday",
    title: "Left until payday",
    about:
      "Money left after known bills until the next salary or pension. Raise when the buffer is thin.",
    view: ({ persona: p }) => {
      const l = leftUntilPayday(p);
      if (!l) return null;
      return {
        id: "left_until_payday",
        title: `Left until ${l.pay.label === "salary" ? "payday" : "your pension"}`,
        value: eur(l.left, { cents: false }),
        sub: `${l.days} days · about ${eur(l.perDay, { cents: false })} a day`,
        icon: "clock",
        tone: l.left < 300 ? "warn" : "normal",
        list: l.bills.slice(0, 3).map((b) => ({
          left: `${b.payee} · ${day(b.due)}`,
          right: eur(b.amount),
        })),
        sentence: `You have ${eur(l.left, { cents: false })} to spend until ${weekday(l.pay.date)} ${day(l.pay.date)}.`,
        facts: [
          `Current account: ${eur(p.accounts.current)}`,
          `Bills before ${l.pay.label}: ${eur(l.billsSum)}`,
          `${l.pay.label === "salary" ? "Salary" : "Pension"} expected ${day(l.pay.date)}`,
        ],
      };
    },
  },
  {
    id: "upcoming_payments",
    group: "everyday",
    title: "Upcoming payments",
    about: "Direct debits and standing orders due in the next two weeks.",
    view: ({ persona: p }) => {
      const list = upcoming(p).filter((d) => daysBetween(p.now, d.due) <= 16);
      if (!list.length) return null;
      const sum = round2(list.reduce((s, d) => s + d.amount, 0));
      return {
        id: "upcoming_payments",
        title: "Coming up",
        value: `${list.length} ${list.length === 1 ? "payment" : "payments"}`,
        sub: `${eur(sum)} in the next two weeks`,
        icon: "list",
        tone: "normal",
        list: list.slice(0, 4).map((d) => ({
          left: `${d.payee} · ${day(d.due)}`,
          right: eur(d.amount),
        })),
        sentence: `${list.length} ${list.length === 1 ? "payment is" : "payments are"} due soon, ${eur(sum)} in total.`,
        facts: list
          .slice(0, 3)
          .map((d) => `${d.payee} ${eur(d.amount)} on ${day(d.due)}`),
      };
    },
  },
  {
    id: "recent_activity",
    group: "everyday",
    title: "Recent activity",
    about: "Latest payments. Fallback block.",
    view: ({ persona: p }) => {
      const list = [...p.transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4);
      const first = list[0];
      return {
        id: "recent_activity",
        title: "Recent",
        value: first ? first.merchant : "No payments",
        sub: first
          ? `${first.currency === "GBP" ? gbp(first.amount) : eur(first.amount)} · ${day(first.date)}`
          : undefined,
        icon: "activity",
        tone: "normal",
        list: list.map((t) => ({
          left: t.merchant,
          right:
            t.currency === "GBP"
              ? `− ${gbp(t.amount)}`
              : eur(t.amount, { sign: true }),
          tone: t.amount > 0 ? "good" : undefined,
        })),
        sentence: first
          ? `Last payment: ${first.merchant}, ${eur(Math.abs(first.amount))}.`
          : "No recent payments.",
        facts: ["Your latest card payments and transfers"],
      };
    },
  },
  {
    id: "subscriptions",
    group: "everyday",
    title: "Subscriptions & price changes",
    about: "A recurring payment went up, or one has not been used for a while.",
    view: ({ persona: p }) => {
      const ch = subscriptionChanges(p);
      if (!ch.length) return null;
      const up = ch.find(
        (d) => d.previous !== undefined && d.amount > d.previous,
      );
      const unused = ch.find(
        (d) => d.lastUsed && daysBetween(d.lastUsed, p.now) > 45,
      );
      const lead = up ?? unused;
      if (!lead) return null;
      const leadText = up
        ? `${up.payee} went up ${eur(round2(up.amount - (up.previous ?? 0)))}`
        : `${unused?.payee} unused for ${Math.round(daysBetween(unused?.lastUsed ?? p.now, p.now) / 30)} months`;
      return {
        id: "subscriptions",
        title: "Subscriptions",
        value: up
          ? `${eur(up.previous ?? 0)} → ${eur(up.amount)}`
          : eur(unused?.amount ?? 0),
        sub: leadText,
        icon: "repeat",
        tone: "warn",
        list: ch.map((d) => ({
          left: d.payee,
          right:
            d.previous !== undefined && d.amount > d.previous
              ? `${eur(d.amount)} ▲`
              : `${eur(d.amount)} · unused`,
          tone: "warn",
        })),
        sentence: up
          ? `${up.payee} now costs ${eur(round2(up.amount - (up.previous ?? 0)))} more each month.`
          : `You haven't used ${unused?.payee} for a while.`,
        action: unused
          ? { id: "stop_subscription", label: `Stop ${unused.payee}` }
          : undefined,
        facts: ch.map((d) =>
          d.previous !== undefined && d.amount > d.previous
            ? `${d.payee}: ${eur(d.previous)} last month, ${eur(d.amount)} now`
            : `${d.payee}: last used ${day(d.lastUsed ?? p.now)}`,
        ),
      };
    },
  },
  {
    id: "paid_twice",
    group: "protection",
    title: "Paid twice?",
    about: "PROTECTION. The same direct debit was collected twice.",
    protection: true,
    view: ({ persona: p }) => {
      const d = duplicates(p)[0];
      if (!d) return null;
      return {
        id: "paid_twice",
        title: "Paid twice?",
        value: eur(d.amount),
        sub: `${d.merchant} took it on ${d.dates.map(day).join(" and ")}`,
        icon: "alert",
        tone: "warn",
        sentence: `${d.merchant} took ${eur(d.amount)} two times.`,
        action: { id: "refund_duplicate", label: "Get it back" },
        protection: true,
        facts: [
          `${d.merchant} ${eur(d.amount)} on ${day(d.dates[0])}`,
          `${d.merchant} ${eur(d.amount)} again on ${day(d.dates[1])}`,
          "Usually collected once a month",
        ],
      };
    },
  },
  {
    id: "card_status",
    group: "protection",
    title: "Card status",
    about:
      "Card abroad, frozen, or regions. Useful when travelling or after a card problem.",
    view: ({ persona: p }) => {
      const abroad = p.abroad;
      return {
        id: "card_status",
        title: `Debit card •• ${p.card.last4}`,
        value: p.card.frozen
          ? "Frozen"
          : abroad
            ? `Works in the ${abroad.country}`
            : "Active",
        sub: p.card.frozen
          ? "Unfreeze any time"
          : `Allowed: ${p.card.regions.join(", ")}`,
        icon: "card",
        tone: p.card.frozen ? "warn" : "normal",
        sentence: p.card.frozen
          ? "Your card is frozen."
          : abroad
            ? `Your card works in the ${abroad.country}.`
            : "Your card is active.",
        action: {
          id: "freeze_card",
          label: p.card.frozen ? "Unfreeze card" : "Freeze card",
        },
        facts: [
          abroad
            ? `You are in ${abroad.city} until ${day(abroad.until)}`
            : `Card regions: ${p.card.regions.join(", ")}`,
        ],
      };
    },
  },
  {
    id: "savings_goal",
    group: "goals",
    title: "Savings goal",
    about: "The customer's own savings goal and progress.",
    view: ({ persona: p }) => {
      const g = p.goals[0];
      if (!g) return null;
      const pct = g.saved / g.target;
      return {
        id: "savings_goal",
        title: g.name,
        value: `${Math.round(pct * 100)}%`,
        sub: `${eur(g.saved, { cents: false })} of ${eur(g.target, { cents: false })}`,
        icon: "target",
        tone: "normal",
        progress: pct,
        sentence: `${eur(g.target - g.saved, { cents: false })} to go for ${g.name.toLowerCase()}.`,
        action: {
          id: "save_to_goal",
          label: `Add ${eur(g.monthly ?? 100, { cents: false })}`,
          params: { amount: g.monthly ?? 100 },
        },
        facts: [
          `Saved ${eur(g.saved, { cents: false })} of ${eur(g.target, { cents: false })}`,
          g.monthly
            ? `You usually add ${eur(g.monthly, { cents: false })} a month`
            : "Your own goal",
        ],
      };
    },
  },
  {
    id: "moving_plan",
    group: "life",
    title: "Moving plan",
    about:
      "Only when the customer confirmed a move. Checklist plus moving budget.",
    view: ({ persona: p }) => {
      const m = p.moving;
      if (!m) return null;
      const done = m.steps.filter((s) => s.done).length;
      const spent = spendOf(
        p.transactions.filter((t) =>
          ["moving", "furniture"].includes(t.category),
        ),
      );
      const next = m.steps.find((s) => !s.done);
      return {
        id: "moving_plan",
        title: `Moving to ${m.to}`,
        value: `${done} of ${m.steps.length}`,
        sub: next ? `Next: ${next.label}` : "All done",
        icon: "box",
        tone: "normal",
        progress: done / m.steps.length,
        list: m.steps.map((s) => ({
          left: `${s.done ? "✓" : "○"} ${s.label}`,
          right: "",
        })),
        sentence: next
          ? `Next step: ${next.label.charAt(0).toLowerCase()}${next.label.slice(1)}.`
          : "Your move is all set.",
        facts: [
          `You confirmed the move to ${m.to} on ${day(m.date)}`,
          `Moving costs so far: ${eur(spent, { cents: false })} of ${eur(m.budget, { cents: false })}`,
        ],
      };
    },
  },
  {
    id: "home_buying",
    group: "life",
    title: "Buying a home",
    about:
      "Only when the customer has a house fund or used the mortgage simulator.",
    view: ({ persona: p }) => {
      const h = p.home;
      if (!h) return null;
      return {
        id: "home_buying",
        title: "Our first home",
        value: `${Math.round((h.fund / h.target) * 100)}%`,
        sub: `${eur(h.fund, { cents: false })} of ${eur(h.target, { cents: false })} · ${h.nextAppointment}`,
        icon: "home",
        tone: "normal",
        progress: h.fund / h.target,
        sentence: `${eur(h.target - h.fund, { cents: false })} to go for your first home.`,
        facts: [
          `House fund: ${eur(h.fund, { cents: false })}`,
          `You used the mortgage simulator this week`,
          `Appointment: ${h.nextAppointment}`,
        ],
      };
    },
  },
  {
    id: "trip_ready",
    group: "travel",
    title: "Trip ready",
    about: "Customer is abroad or has booked a trip.",
    view: ({ persona: p }) => {
      const a = p.abroad;
      if (!a) return null;
      const spent = round2(
        p.transactions
          .filter((t) => t.currency === "GBP" && t.amount < 0)
          .reduce((s, t) => s - t.amount, 0),
      );
      return {
        id: "trip_ready",
        title: `${a.city} trip`,
        value: gbp(spent),
        sub: `spent · home ${weekday(a.until)} ${day(a.until)}`,
        icon: "plane",
        tone: "normal",
        list: [
          { left: "✓ Card works here", right: "" },
          {
            left: p.esim
              ? `${p.esim.leftGB} GB data left`
              : "No travel data plan",
            right: "",
            tone: "warn",
          },
        ],
        sentence: `${a.city} until ${weekday(a.until)}. Your card works here.`,
        facts: [
          `Card payments in ${a.city} since ${day(
            p.transactions
              .filter((t) => t.city === a.city)
              .map((t) => t.date)
              .sort()[0] ?? p.now,
          )}`,
          `Trip ends ${day(a.until)}`,
        ],
      };
    },
  },
  {
    id: "currency_pockets",
    group: "travel",
    title: "Currency pockets",
    about: "Foreign currency balances, useful abroad.",
    view: ({ persona: p }) => {
      if (p.accounts.pocketGBP === undefined) return null;
      return {
        id: "currency_pockets",
        title: "Pound pocket",
        value: gbp(p.accounts.pocketGBP),
        sub: p.abroad
          ? `about £ ${p.abroad.dailySpend} a day here`
          : "€ 1 = £ 0,85",
        icon: "swap",
        tone:
          p.abroad && p.accounts.pocketGBP < p.abroad.dailySpend
            ? "warn"
            : "normal",
        sentence: `You have ${gbp(p.accounts.pocketGBP)} in your pound pocket.`,
        action: {
          id: "exchange_pocket",
          label: "Top up",
          params: { amount: 150 },
        },
        facts: [
          `Pocket balance: ${gbp(p.accounts.pocketGBP)}`,
          "Rate € 1 = £ 0,85, no fee",
        ],
      };
    },
  },
  {
    id: "money_in",
    group: "income",
    title: "Money in",
    about: "Salary, pension or a client payment arriving.",
    view: ({ persona: p }) => {
      const last = [...p.transactions]
        .filter((t) => t.amount > 100)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const pay = nextPayday(p);
      if (!last && !pay) return null;
      const recent = last && daysBetween(last.date, p.now) <= 2;
      return {
        id: "money_in",
        title: recent
          ? `${last.merchant} paid`
          : `Next ${pay?.label ?? "income"}`,
        value: recent
          ? eur(last.amount, { sign: true })
          : eur(pay?.amount ?? 0, { cents: false }),
        sub: recent
          ? day(last.date)
          : pay
            ? `${weekday(pay.date)} ${day(pay.date)}`
            : undefined,
        icon: "in",
        tone: "good",
        sentence: recent
          ? `${last.merchant} paid you ${eur(last.amount)}.`
          : `Your ${pay?.label} of ${eur(pay?.amount ?? 0)} arrives ${day(pay?.date ?? p.now)}.`,
        facts: recent
          ? [`${last.merchant} ${eur(last.amount)} on ${day(last.date)}`]
          : [`Usually on day ${p.salary?.day ?? ""} of the month`],
      };
    },
  },
  {
    id: "tax_reserve",
    group: "income",
    title: "Tax reserve & invoices",
    about: "Self-employed: VAT/tax set aside and open invoices.",
    view: ({ persona: p }) => {
      const t = p.taxReserve;
      if (!t) return null;
      const open = (p.invoices ?? []).filter((i) => !i.paid);
      return {
        id: "tax_reserve",
        title: "Tax reserve",
        value: eur(t.saved, { cents: false }),
        sub: `of ${eur(t.target, { cents: false })} · VAT due ${day(t.vatDue)}`,
        icon: "receipt",
        tone: "normal",
        progress: t.saved / t.target,
        list: open.map((i) => ({
          left: i.client,
          right: `${eur(i.amount, { cents: false })} · ${daysBetween(i.due, p.now) > 0 ? `${daysBetween(i.due, p.now)}d late` : day(i.due)}`,
          tone: daysBetween(i.due, p.now) > 0 ? "warn" : undefined,
        })),
        sentence: `${eur(t.target - t.saved, { cents: false })} still to set aside for tax.`,
        facts: [
          `Reserve ${eur(t.saved, { cents: false })} of ${eur(t.target, { cents: false })}`,
          `${open.length} open invoices`,
        ],
      };
    },
  },
  {
    id: "portfolio",
    group: "wealth",
    title: "Portfolio",
    about:
      "Investments, information only, never buy/sell advice. Detailed for people who check often.",
    view: ({ persona: p }) => {
      const pf = p.portfolio;
      if (!pf) return null;
      const total = pf.holdings.reduce((s, h) => s + h.value, 0);
      return {
        id: "portfolio",
        title: "Investments",
        value: eur(total, { cents: false }),
        sub: `${pf.weekPct >= 0 ? "+" : ""}${pf.weekPct}% this week`,
        icon: "chart",
        tone: pf.weekPct >= 0 ? "good" : "normal",
        bars: [28, 26, 30, 20, 22, 14, 16, 8].map((v) => 32 - v),
        list: pf.holdings.map((h) => ({
          left: h.name,
          right: `${eur(h.value, { cents: false })} ${h.changePct >= 0 ? "+" : ""}${h.changePct}%`,
          tone: h.changePct >= 0 ? "good" : "warn",
        })),
        sentence: `Your investments are worth ${eur(total, { cents: false })}.`,
        facts: [
          `You checked your portfolio ${pf.checksPerWeek} times last week`,
          "Information only, not advice",
        ],
      };
    },
  },
  {
    id: "pension_saving",
    group: "wealth",
    title: "Pension saving",
    about:
      "Existing pension saving plan; Q4: top up before 31 Dec for the tax benefit.",
    view: ({ persona: p }) => {
      const ps = p.pensionSaving;
      if (!ps) return null;
      const left = round2(ps.limit - ps.paid);
      return {
        id: "pension_saving",
        title: "Pension saving 2026",
        value: eur(ps.paid, { cents: false }),
        sub: `of ${eur(ps.limit, { cents: false })} · ${daysBetween(p.now, "2026-12-31")} days left`,
        icon: "shield",
        tone: "normal",
        progress: ps.paid / ps.limit,
        sentence: `Add ${eur(left, { cents: false })} before 31 December to use your tax benefit.`,
        action:
          left > 0
            ? {
                id: "pension_topup",
                label: `Top up ${eur(left, { cents: false })}`,
                params: { amount: left },
              }
            : undefined,
        facts: [
          `Paid ${eur(ps.paid, { cents: false })} this year`,
          `Limit used for the tax benefit: ${eur(ps.limit, { cents: false })} (check 2026 amount)`,
        ],
      };
    },
  },
  {
    id: "coming_up",
    group: "time",
    title: "Coming up",
    about: "Money calendar: renewals, salary, deadlines.",
    view: ({ persona: p }) => {
      const list = p.calendar
        .filter((c) => daysBetween(p.now, c.date) >= 0)
        .slice(0, 4);
      if (!list.length) return null;
      return {
        id: "coming_up",
        title: "Coming up",
        value: day(list[0].date),
        sub: list[0].label,
        icon: "calendar",
        tone: "normal",
        list: list.map((c) => ({
          left: `${day(c.date)} · ${c.label}`,
          right: c.amount ? eur(c.amount, { sign: true, cents: false }) : "",
        })),
        sentence: `Next: ${list[0].label} on ${day(list[0].date)}.`,
        facts: list.map((c) => `${day(c.date)}: ${c.label}`),
      };
    },
  },
  {
    id: "advisor",
    group: "people",
    title: "My advisor",
    about:
      "Named advisor. Raise for big decisions, simple style, or when the customer struggles.",
    view: ({ persona: p }) => ({
      id: "advisor",
      title: "Your advisor",
      value: p.advisor.name,
      sub: `${p.advisor.office} · free ${p.advisor.nextSlot}`,
      icon: "phone",
      tone: "normal",
      sentence: `Call ${p.advisor.name}, your advisor.`,
      facts: [`${p.advisor.name} at ${p.advisor.office}`],
    }),
  },
  {
    id: "ask_kate",
    group: "kate",
    title: "Ask Kate",
    about: "Entry to the assistant with three situation-aware prompts.",
    view: () => ({
      id: "ask_kate",
      title: "Ask Kate",
      value: "Ask Kate",
      sub: "Questions, changes, new blocks",
      icon: "kate",
      tone: "normal",
      sentence: "Ask Kate a question.",
      facts: ["Always available"],
    }),
  },
];

export function blockDef(id: string) {
  return BLOCKS.find((b) => b.id === id);
}

export function trackerBlock(c: Customer, spec: TrackerSpec): BlockView {
  const v = trackerValue(c.persona, spec);
  const main = spec.metric === "sum" ? eur(v.total) : `${v.count}×`;
  const diff =
    spec.metric === "sum" && v.prevTotal ? round2(v.total - v.prevTotal) : null;
  return {
    id: spec.id,
    title: `${spec.title} · ${spec.period === "month" ? monthName(c.persona.now) : "this week"}`,
    value: main,
    sub: `${v.count} ${v.count === 1 ? "payment" : "payments"}${diff !== null ? ` · ${eur(Math.abs(diff))} ${diff <= 0 ? "less" : "more"} than last month` : ""}`,
    icon: "spark",
    tone: "normal",
    bars: v.bars.filter((_, i) => i < 4),
    list: v.merchants.slice(0, 3).map((m) => ({ left: m, right: "" })),
    sentence: `You spent ${eur(v.total)} on ${spec.title.toLowerCase()} this ${spec.period}.`,
    facts: [
      `Matches: ${[...spec.keywords, ...spec.categories].join(", ")}`,
      `${v.count} ${v.count === 1 ? "payment" : "payments"} this ${spec.period}`,
    ],
    custom: true,
  };
}

/** Every block this customer could see right now, with its computed view. */
export function eligibleBlocks(c: Customer): BlockView[] {
  const out: BlockView[] = [];
  for (const d of BLOCKS) {
    const v = d.view(c);
    if (v) out.push(v);
  }
  for (const t of c.trackers) out.push(trackerBlock(c, t));
  return out;
}

/** Existing block components that describe a life journey, not an everyday balance. */
export const isJourneyBlock = (id: string) =>
  ["moving_plan", "home_buying", "trip_ready", "coming_up"].includes(id);
