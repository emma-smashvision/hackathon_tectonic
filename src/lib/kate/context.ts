import { getPersona, PERSONAS } from "../engine/personas";
import { bubbleMetric, recentTransactions } from "../engine/present";
import { runEngine, WIDGET_RULES } from "../engine/rank";
import { getInjection, INJECTIONS } from "../engine/signals";
import {
  type AdaptiveWidgetId,
  type Decisions,
  EMPTY_DECISIONS,
  type Profile,
} from "../engine/types";
import { formatEur } from "../format";

export const MAX_MESSAGE = 600;
export const MAX_PAYLOAD = 16_384;
export interface KateRequest {
  message: string;
  personaId: string;
  signals: string[];
  decisions: Decisions;
}
export interface KateReply {
  text: string;
  open?: AdaptiveWidgetId;
  source: "offline" | "claude";
}
const NEED_IDS = [
  "homeBuying",
  "moving",
  "travel",
  "taxReserve",
  "investor",
  "simpleUi",
  "retirement",
  "newFixedCosts",
  "paymentSafety",
  "windfall",
];
export function isWidgetId(value: unknown): value is AdaptiveWidgetId {
  return typeof value === "string" && Object.hasOwn(WIDGET_RULES, value);
}

export function parseKateRequest(value: unknown): KateRequest | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.message !== "string" ||
    !v.message.trim() ||
    v.message.length > MAX_MESSAGE ||
    !PERSONAS.some((p) => p.id === v.personaId)
  )
    return null;
  if (
    !Array.isArray(v.signals) ||
    v.signals.length > 100 ||
    !v.signals.every((id) => INJECTIONS.some((i) => i.id === id))
  )
    return null;
  const d = v.decisions as Decisions | undefined;
  if (
    !d ||
    !["pinned", "hidden", "declared", "dismissed"].every((key) => {
      const list = d[key as keyof Decisions];
      return (
        Array.isArray(list) &&
        list.length <= 10 &&
        list.every((id) =>
          key === "pinned" || key === "hidden"
            ? isWidgetId(id)
            : NEED_IDS.includes(id),
        )
      );
    })
  )
    return null;
  return {
    message: v.message.trim(),
    personaId: v.personaId as string,
    signals: v.signals as string[],
    decisions: {
      pinned: [...d.pinned],
      hidden: [...d.hidden],
      declared: [...d.declared],
      dismissed: [...d.dismissed],
    },
  };
}

/** Only allowlisted demo events are replayed; client-supplied balances are never used. */
export function reconstructProfile(request: KateRequest): Profile {
  return request.signals.reduce(
    (profile, id) => getInjection(id).apply(profile),
    getPersona(request.personaId).profile,
  );
}

export function buildKateContext(
  profile: Profile,
  decisions: Decisions = EMPTY_DECISIONS,
) {
  const { needs, config } = runEngine(profile, decisions);
  const recent = recentTransactions(profile);
  const previous = recentTransactions(profile, 60).filter(
    (t) => !recent.some((r) => r.id === t.id),
  );
  const spent = (txs: typeof recent) =>
    txs.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  return {
    synthetic: true,
    profile: profile.customer,
    today: profile.today,
    needs: needs.map(({ id, status, confidence, reasons }) => ({
      id,
      status,
      confidence,
      reasons,
    })),
    recentTransactions: recent,
    figures: {
      balance: formatEur(profile.customer.balance, true),
      savings: formatEur(profile.customer.savings),
      income: formatEur(profile.customer.monthlyNetIncome),
      portfolio: formatEur(profile.customer.portfolioValue),
      spent: formatEur(spent(recent)),
      previousSpent: formatEur(spent(previous)),
      houseSaved: formatEur(
        profile.customer.savingsGoals.find((g) => g.kind === "house")?.saved ??
          profile.customer.savings,
      ),
    },
    widgets: config.scores
      .filter((s) => !s.hidden)
      .map((s) => ({ id: s.id, ...bubbleMetric(s.id, profile) })),
    tone: config.tone,
  };
}
export type KateContext = ReturnType<typeof buildKateContext>;

export function fallbackReply(
  message: string,
  context: KateContext,
): KateReply {
  const q = message.toLowerCase();
  const { figures: f, profile: p } = context;
  const reply = (text: string, open?: AdaptiveWidgetId): KateReply => ({
    text,
    source: "offline",
    ...(open && context.widgets.some((w) => w.id === open) ? { open } : {}),
  });
  if (/prize|10k|10,000|10\.000|won|windfall|what can we do/.test(q)) {
    const prize = context.recentTransactions.find(
      (t) => t.category === "prize",
    );
    return reply(
      prize
        ? `Congratulations! ${formatEur(prize.amount)} came in from ${prize.merchant}. There is no rush. You could set part aside for a holiday, top up your buffer, or explore investing with ${p.advisorName}. I cannot recommend investments; the split is yours to choose.`
        : "There is no recent one-off prize in the available data.",
      "windfall",
    );
  }
  if (/invest|portfolio|stock|buy.*shares|sell|crypto/.test(q))
    return reply(
      `Your portfolio value is ${f.portfolio}. I can explain your overview, but cannot recommend investments or buying or selling. Talk to ${p.advisorName} for investment decisions.`,
      "investments",
    );
  if (/house|home|mortgage|afford/.test(q))
    return reply(
      `You have ${f.houseSaved} saved towards a home and ${f.income} in monthly net income. These figures alone cannot establish affordability. Explore the illustrative mortgage planner, then talk to ${p.advisorName} about costs, other commitments and a mortgage decision.`,
      "homeBuying",
    );
  if (/safe|scam|fraud|payment/.test(q)) {
    const flagged = context.recentTransactions.find(
      (t) =>
        t.newPayee &&
        t.amount <= -1000 &&
        t.category === "transfer" &&
        (Date.parse(context.today) - Date.parse(t.date)) / 86_400_000 <= 7,
    );
    return reply(
      flagged
        ? `The data shows ${formatEur(-flagged.amount)} to ${flagged.merchant}, a new payee. That is a reason to review it, not proof of fraud. I cannot verify or stop a payment. Check the details with your advisor through a known contact channel.`
        : "There is no flagged new-payee transfer in this demo data. That does not establish that a payment is safe. Check the payee through a known contact channel; I cannot verify or stop payments.",
      "paymentCheck",
    );
  }
  if (/changed|month|spend|spent|budget/.test(q))
    return reply(
      `Recorded spending in the last 30 days is ${f.spent}; in the preceding 30 days it was ${f.previousSpent}. This is a comparison of the available synthetic transactions, not a complete statement.`,
      "budget",
    );
  if (/advisor|call|human|meeting/.test(q))
    return reply(
      `Your advisor is ${p.advisorName}. Open their contact card to explore the demo. I cannot place a call or book a meeting.`,
      "advisor",
    );
  if (/trip|travel|flight/.test(q)) {
    const flight = context.recentTransactions.find(
      (t) => t.category === "flight",
    );
    return reply(
      flight
        ? `Your recent booking is ${flight.merchant} for ${formatEur(-flight.amount)}. You can review the travel checklist and card settings.`
        : "There is no recent flight booking in the available data. You can still explore travel settings.",
      "travel",
    );
  }
  if (/balance|saving|money/.test(q))
    return reply(
      `Your current account balance is ${f.balance}, and your savings are ${f.savings}.`,
    );
  if (/mov/.test(q))
    return reply(
      "You can review your moving checklist and recorded moving costs. Any inferred need is a suggestion you can dismiss.",
      "moving",
    );
  return reply(
    "I’m Kate. I can explain your balance, recorded spending, house savings, travel or payment checks. For mortgage and investment decisions, talk to your advisor.",
  );
}
