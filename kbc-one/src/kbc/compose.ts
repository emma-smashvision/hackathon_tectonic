import { intentCandidates, suggestedActions } from "./actions";
import { eligibleBlocks } from "./blocks";
import { eur, gbp } from "./format";
import type {
  ActionView,
  BlockView,
  Customer,
  HomeModel,
  Placed,
  Score,
  Size,
  StyleId,
} from "./types";

// The composer: code decides what is possible, the model (Claude for now; Jev/Laya
// later) decides what matters and writes the words, code validates the result.

export const STYLE_LIMIT: Record<StyleId, number> = {
  calm: 5,
  cards: 8,
  dense: 10,
  large: 3,
};
const STYLES: StyleId[] = ["calm", "cards", "dense", "large"];
const SIZES: Size[] = ["s", "m", "l"];
const SCORES: Score[] = ["later", "now", "urgent"];

export type ComposeReply = {
  style?: string;
  headline?: string;
  intent?: { id?: string; reason?: string } | null;
  actions?: { id?: string; reason?: string }[];
  blocks?: { id?: string; size?: string; score?: string; reason?: string }[];
};

export type Candidates = {
  blocks: BlockView[];
  actions: ActionView[];
  intents: ReturnType<typeof intentCandidates>;
};

// KBC One: on a care road (a hard moment the customer told us about) the home stays calm:
// no quick actions, no open-intent, no products; only the basics and a person.
const CARE_BLOCKS = new Set([
  "upcoming_payments",
  "left_until_payday",
  "recent_activity",
  "advisor",
  "ask_kate",
]);

export function candidates(c: Customer): Candidates {
  const muted = new Set(c.muted);
  if (c.persona.care)
    return {
      blocks: eligibleBlocks(c).filter(
        (b) => b.protection || (CARE_BLOCKS.has(b.id) && !b.product),
      ),
      actions: [],
      intents: [],
    };
  return {
    blocks: eligibleBlocks(c).filter((b) => b.protection || !muted.has(b.id)),
    actions: suggestedActions(c),
    intents: intentCandidates(c),
  };
}

export const COMPOSE_SYSTEM = `You are the layout brain of KBC's banking app home screen ("Kate").
You receive a fact sheet about ONE synthetic customer and lists of candidate blocks, quick actions and open-intents that code has already computed and checked.
Decide what this customer needs right now and return ONLY a JSON object, no prose.

Rules:
- Use only ids from the candidate lists. Never invent ids, numbers, dates or names.
- Protection blocks (protection: true) must be included with score "urgent".
- Behaviour decides the style, never age: large text, frequent zooming or mis-taps → "large"; frequent portfolio checking or many accounts → "dense"; otherwise "calm" or "cards".
- Style limits: calm max 5 blocks, cards max 8, dense max 10, large max 3. Fewer is better: only what matters now, then 1–2 everyday basics.
- Size: "l" for the one most important block, "m" for important, "s" for the rest.
- Quick actions: at most 3, only when clearly useful now. Open-intent: pick one only if it fits the moment, else null.
- Reasons: one short sentence each, plain friendly English, addressed to the customer ("you"), based only on the given facts. No sales language, no advice on what to buy or invest in.
- headline: max 12 words, warm and calm, about their bigger picture today (the move, the trip, the goal). It must NOT repeat the open-intent or a quick action: those have their own cards right below it. No questions, no exclamation marks.
- Never infer or mention health, religion, politics, relationships or financial distress.
- If the fact sheet has "care": true, the customer is going through a hard time they told us about: style "calm", at most 4 blocks, put "advisor" first, no quick actions, no open-intent, and a gentle headline that asks nothing of them.

JSON shape:
{"style":"calm|cards|dense|large","headline":"...","intent":{"id":"...","reason":"..."}|null,
 "actions":[{"id":"...","reason":"..."}],
 "blocks":[{"id":"...","size":"s|m|l","score":"later|now|urgent","reason":"..."}]}`;

export const SUGGEST_SYSTEM = `You are Kate inside KBC's banking app. This customer arranged their own home screen; you never move their blocks.
From the candidate blocks NOT already on their home, pick at most the number allowed of suggestions that would really help right now (protection always counts), plus quick actions and an open-intent if they fit.
Return ONLY JSON: {"headline":"...","intent":{"id":"...","reason":"..."}|null,"actions":[{"id":"...","reason":"..."}],"blocks":[{"id":"...","size":"s|m","score":"later|now|urgent","reason":"..."}]}
Use only given ids and facts. Reasons: one short plain sentence to the customer. No sales language. headline: max 12 words about their bigger picture today; never repeat the intent or an action, no questions.`;

export function factSheet(c: Customer, cand: Candidates) {
  const p = c.persona;
  const custom = c.layout;
  return {
    ...(p.care ? { care: true } : {}),
    customer: {
      name: p.name,
      city: p.city,
      now: p.now,
      abroad: p.abroad ? `${p.abroad.city} until ${p.abroad.until}` : null,
    },
    money: {
      current: eur(p.accounts.current),
      savings: eur(p.accounts.savings),
      ...(p.accounts.business !== undefined
        ? { business: eur(p.accounts.business) }
        : {}),
      ...(p.accounts.pocketGBP !== undefined
        ? { poundPocket: gbp(p.accounts.pocketGBP) }
        : {}),
    },
    behaviour: {
      largeTextSetting: p.behaviour.largeText,
      zoomsPerWeek: p.behaviour.zoomsPerWeek,
      misTapRate: p.behaviour.misTapRate,
      appOpensPerWeek: p.behaviour.opensPerWeek,
      portfolioChecksPerWeek: p.portfolio?.checksPerWeek ?? 0,
    },
    customerSaid: p.beliefs.map(
      (b) => `${b.status === "said_no" ? "NO: " : ""}${b.text} (${b.source})`,
    ),
    mutedByCustomer: c.muted,
    ...(custom
      ? {
          ownLayout: {
            style: custom.style,
            blocks: custom.blocks.map((b) => b.id),
            suggestionsAllowed: Math.min(2, custom.suggestionsPerDay),
          },
        }
      : {}),
    candidateBlocks: cand.blocks.map((b) => ({
      id: b.id,
      title: b.title,
      shows: [b.value, b.sub].filter(Boolean).join(" · "),
      facts: b.facts,
      ...(b.protection ? { protection: true } : {}),
      ...(b.custom ? { madeByCustomer: true } : {}),
    })),
    candidateActions: cand.actions.map((a) => ({
      id: a.id,
      title: a.title,
      why: a.why,
      button: a.button,
      ...(a.product ? { kbcProduct: true } : {}),
    })),
    candidateIntents: cand.intents.map((i) => ({
      id: i.id,
      title: i.title,
      facts: i.facts,
    })),
  };
}

const clip = (s: unknown, n: number) =>
  typeof s === "string" ? s.trim().slice(0, n) : "";

/** Rules fallback (also the baseline the model is compared with). */
export function rulesStyle(c: Customer): StyleId {
  const b = c.persona.behaviour;
  if (b.largeText || b.zoomsPerWeek > 5 || b.misTapRate > 0.08) return "large";
  if (
    (c.persona.portfolio?.checksPerWeek ?? 0) > 8 ||
    c.persona.accounts.business !== undefined
  )
    return "dense";
  return "calm";
}

const RULE_RANK: Record<string, number> = {
  paid_twice: 100,
  currency_pockets: 80,
  moving_plan: 75,
  tax_reserve: 74,
  home_buying: 73,
  trip_ready: 70,
  left_until_payday: 60,
  portfolio: 58,
  savings_goal: 55,
  subscriptions: 45,
  upcoming_payments: 44,
  money_in: 40,
  spending_month: 38,
  pension_saving: 35,
  coming_up: 30,
  card_status: 25,
  advisor: 20,
  recent_activity: 15,
  ask_kate: 5,
};

function rulesPick(
  c: Customer,
  cand: Candidates,
  style: StyleId,
): ComposeReply {
  const rank = (id: string) =>
    c.persona.care && id === "advisor" ? 1000 : (RULE_RANK[id] ?? 50);
  const ranked = [...cand.blocks].sort((a, b) => rank(b.id) - rank(a.id));
  const limit = STYLE_LIMIT[style];
  let picked = ranked.slice(0, limit);
  if (style === "large" && !picked.some((b) => b.id === "advisor")) {
    const adv = ranked.find((b) => b.id === "advisor");
    if (adv) picked = [...picked.slice(0, limit - 1), adv];
  }
  return {
    style,
    headline: c.persona.care
      ? `Nothing you need to do today. ${c.persona.advisor.name} is there if you want to talk.`
      : `Here’s what matters today, ${c.persona.name}.`,
    intent: cand.intents[0]
      ? { id: cand.intents[0].id, reason: cand.intents[0].facts[0] }
      : null,
    actions: cand.actions.slice(0, 3).map((a) => ({ id: a.id, reason: a.why })),
    blocks: picked.map((b, i) => ({
      id: b.id,
      size: i === 0 ? "l" : i < 3 ? "m" : "s",
      score: b.protection ? "urgent" : i < 2 ? "now" : "later",
      reason: b.facts[0] ?? "",
    })),
  };
}

/** Validate a model reply against the candidates and the customer's own layout. */
export function finalize(
  c: Customer,
  cand: Candidates,
  reply: ComposeReply | null,
  meta: { source: "claude" | "rules"; ms: number; model?: string },
): HomeModel {
  const notes: string[] = [];
  const custom = c.layout;
  const byId = new Map(cand.blocks.map((b) => [b.id, b]));
  const fallbackStyle = rulesStyle(c);
  const r = reply ?? rulesPick(c, cand, fallbackStyle);

  let style: StyleId;
  if (custom) style = custom.style;
  else if (c.persona.care) style = "calm";
  else if (STYLES.includes(r.style as StyleId)) style = r.style as StyleId;
  else {
    style = fallbackStyle;
    if (reply) notes.push(`style "${r.style}" not allowed → ${style}`);
  }

  const place = (
    x: { id?: string; size?: string; score?: string; reason?: string },
    suggested = false,
  ): Placed | null => {
    const v = x.id ? byId.get(x.id) : undefined;
    if (!v) {
      if (x.id) notes.push(`dropped unknown block "${x.id}"`);
      return null;
    }
    return {
      ...v,
      size: SIZES.includes(x.size as Size) ? (x.size as Size) : "s",
      score: v.protection
        ? "urgent"
        : SCORES.includes(x.score as Score)
          ? (x.score as Score)
          : "later",
      reason: clip(x.reason, 160) || v.facts[0] || "",
      suggested,
    };
  };

  const seen = new Set<string>();
  const uniq = <T extends { id: string }>(list: (T | null)[]) =>
    list.filter((x): x is T => {
      if (!x || seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });

  let blocks: Placed[] = [];
  let forYou: Placed[] = [];
  const protection = cand.blocks.filter((b) => b.protection);

  if (custom) {
    blocks = uniq(
      custom.blocks.map((b) => {
        const v = byId.get(b.id);
        if (!v) {
          notes.push(
            `your block "${b.id}" has nothing to show for this customer, hidden`,
          );
          return null;
        }
        return {
          ...v,
          size: b.size,
          score: "later" as Score,
          reason: "You added this block.",
        };
      }),
    );
    const allowed = Math.min(2, custom.suggestionsPerDay);
    const picks = uniq((r.blocks ?? []).map((x) => place(x, true))).filter(
      (b) => !b.protection,
    );
    forYou = picks.slice(0, allowed);
    for (const pb of protection)
      if (!seen.has(pb.id)) {
        seen.add(pb.id);
        forYou.unshift({
          ...pb,
          size: "m",
          score: "urgent",
          reason: pb.facts[0] ?? "",
          suggested: true,
        });
        notes.push(`protection "${pb.id}" added by code`);
      }
  } else {
    blocks = uniq((r.blocks ?? []).map((x) => place(x)));
    for (const pb of protection)
      if (!blocks.some((b) => b.id === pb.id)) {
        blocks.unshift({
          ...pb,
          size: "m",
          score: "urgent",
          reason: pb.facts[0] ?? "",
        });
        seen.add(pb.id);
        notes.push(`protection "${pb.id}" added by code`);
      }
    // protection first, then the model's order
    blocks.sort(
      (a, b) => Number(Boolean(b.protection)) - Number(Boolean(a.protection)),
    );
    if (blocks.length > STYLE_LIMIT[style]) {
      notes.push(`trimmed to ${STYLE_LIMIT[style]} blocks for ${style}`);
      blocks = blocks.slice(0, STYLE_LIMIT[style]);
    }
    if (blocks.length < 2) {
      const fill = rulesPick(c, cand, style).blocks ?? [];
      for (const f of fill) {
        if (blocks.length >= Math.min(3, STYLE_LIMIT[style])) break;
        const pl = place(f);
        if (pl && !blocks.some((b) => b.id === pl.id)) blocks.push(pl);
      }
      notes.push("too few blocks → filled by rules");
    }
  }

  const actById = new Map(cand.actions.map((a) => [a.id, a]));
  const intent = r.intent?.id
    ? cand.intents.find((i) => i.id === r.intent?.id)
    : undefined;
  if (r.intent?.id && !intent)
    notes.push(`dropped unknown intent "${r.intent.id}"`);
  // A protection block already carries its own button; don't repeat it as a quick action.
  const onScreen = new Set(
    [...blocks, ...forYou]
      .filter((b) => b.protection && b.action)
      .map((b) => b.action?.id),
  );
  const actions = (r.actions ?? [])
    .map((a) => {
      const v = a.id ? actById.get(a.id) : undefined;
      if (!v && a.id) notes.push(`dropped unknown action "${a.id}"`);
      return v ? { ...v, reason: clip(a.reason, 160) || v.why } : null;
    })
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .filter(
      (a, i, all) =>
        all.findIndex((x) => x.id === a.id) === i &&
        a.id !== intent?.actionId &&
        !onScreen.has(a.id),
    )
    .slice(0, 3);

  return {
    persona: c.persona.id,
    style,
    customized: Boolean(custom),
    headline:
      clip(r.headline, 120) || `Here’s what matters today, ${c.persona.name}.`,
    intent: intent
      ? { ...intent, reason: clip(r.intent?.reason, 160) || intent.facts[0] }
      : null,
    actions,
    blocks,
    forYou,
    source: meta.source,
    ms: meta.ms,
    model: meta.model,
    notes,
    composedAt: new Date().toISOString(),
  };
}

export function composeWithRules(c: Customer): HomeModel {
  const t0 = Date.now();
  const cand = candidates(c);
  return finalize(c, cand, null, { source: "rules", ms: Date.now() - t0 });
}
