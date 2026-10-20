import { unknownNumbers } from "../grounding";
import { actionDef, checkAction } from "../actions";
import { BLOCKS, trackerBlock } from "../blocks";
import {
  COMPOSE_SYSTEM,
  type ComposeReply,
  candidates,
  composeWithRules,
  factSheet,
  finalize,
  SUGGEST_SYSTEM,
} from "../compose";
import {
  KATE_SYSTEM,
  kateFacts,
  kateFallback,
  type Proposal,
  parseKateOutput,
  validateProposal,
} from "../kate";
import { PERSONAS } from "../personas";
import { validateTheme } from "../theme";
import type {
  ActionSheet,
  Customer,
  HomeModel,
  Size,
  Snapshot,
  TrackerSpec,
} from "../types";
import {
  aiEnabled,
  askClaude,
  logFallback,
  MODELS,
  streamClaude,
} from "./claude";
import {
  getCustomer,
  getHome,
  resetCustomer,
  saveCustomer,
  saveHome,
} from "./store";

export function snapshot(c: Customer): Snapshot {
  const p = c.persona;
  return {
    persona: {
      id: p.id,
      name: p.name,
      initial: p.initial,
      color: p.color,
      short: p.short,
      now: p.now,
      city: p.city,
      accounts: p.accounts,
      card: p.card,
      abroad: p.abroad,
      advisor: p.advisor,
      beliefs: p.beliefs,
    },
    personas: PERSONAS.map(({ id, name, initial, color, short }) => ({
      id,
      name,
      initial,
      color,
      short,
    })),
    layout: c.layout ?? null,
    theme: c.theme ?? null,
    trackers: c.trackers,
    muted: c.muted,
    rules: c.rules,
    requests: c.requests,
    log: c.log,
    catalog: [
      ...c.trackers.map((t) => ({
        id: t.id,
        title: t.title,
        group: "mine",
        view: trackerBlock(c, t),
      })),
      ...BLOCKS.map((d) => ({
        id: d.id,
        title: d.title,
        group: d.group,
        view: d.view(c),
      })),
    ],
    ai: {
      enabled: aiEnabled(),
      composeModel: MODELS.compose,
      kateModel: MODELS.kate,
    },
  };
}

const inflight = new Map<string, Promise<HomeModel>>();

export function cachedHome(id: string): HomeModel {
  return getHome(id) ?? composeWithRules(getCustomer(id));
}

/** Compose the home with Claude (or rules when AI is off or fails). One run per customer at a time. */
export function composeHome(id: string): Promise<HomeModel> {
  const running = inflight.get(id);
  if (running) return running;
  const job = (async () => {
    const c = getCustomer(id);
    const cand = candidates(c);
    let home: HomeModel;
    if (!aiEnabled()) home = composeWithRules(c);
    else {
      try {
        const res = await askClaude<ComposeReply>({
          label: `compose home · ${c.persona.name}${c.layout ? " (own layout → suggestions only)" : ""}`,
          model: MODELS.compose,
          system: c.layout ? SUGGEST_SYSTEM : COMPOSE_SYSTEM,
          prompt: JSON.stringify(factSheet(c, cand)),
        });
        home = finalize(c, cand, res.data, {
          source: "claude",
          ms: res.ms,
          model: res.model,
        });
        if (home.notes.length)
          console.log(`  \x1b[33mvalidator:\x1b[0m ${home.notes.join("; ")}`);
      } catch (e) {
        logFallback("compose", e);
        home = composeWithRules(c);
        home.notes.unshift(
          `Claude unavailable: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`,
        );
      }
    }
    saveHome(home);
    return home;
  })();
  inflight.set(id, job);
  job.finally(() => inflight.delete(id)).catch(() => {});
  return job;
}

export type KateTurn = { role: "user" | "kate"; text: string };

export type KateEvent =
  | { t: "delta"; text: string }
  | {
      t: "done";
      reply: string;
      proposal: Proposal | null;
      notes: string[];
      source: "claude" | "rules";
      ms: number;
    };

/** Kate, streamed: deltas of the visible reply, then the validated proposal. */
export async function askKate(
  id: string,
  message: string,
  history: KateTurn[],
  contextId: string | undefined,
  emit: (e: KateEvent) => void,
  signal?: AbortSignal,
) {
  const c = getCustomer(id);
  const notes: string[] = [];
  if (!aiEnabled()) {
    emit({
      t: "done",
      ...kateFallback(c, message),
      notes: ["AI is off (KBC_AI=off)"],
      source: "rules",
      ms: 0,
    });
    return;
  }
  const facts = kateFacts(c, contextId, currentLayout(id), getHome(id));
  const prompt = JSON.stringify({
    facts,
    conversation: history.slice(-10),
    customerSays: message,
  });
  let full = "";
  let sent = 0;
  const visible = () => {
    const cut = full.search(/\n\s*#{3}/);
    if (cut >= 0) return full.slice(0, cut);
    // hold back a few characters that could be the start of the ### separator
    return full.slice(0, Math.max(sent, full.length - 5));
  };
  try {
    const res = await streamClaude({
      label: `kate · ${c.persona.name}${contextId ? ` · about ${contextId}` : ""}: “${message.slice(0, 60)}”`,
      model: MODELS.kate,
      system: KATE_SYSTEM,
      prompt,
      signal,
      onText: (d) => {
        full += d;
        const v = visible();
        if (v.length > sent) {
          emit({ t: "delta", text: v.slice(sent) });
          sent = v.length;
        }
      },
    });
    const parsed = parseKateOutput(res.text);
    const proposal: Proposal | null = parsed.proposal
      ? validateProposal(c, parsed.proposal, notes, currentLayout(id), message)
      : null;
    // KBC One: amounts in Kate's words must come from her facts (or the customer's own words)
    let reply = parsed.reply.slice(0, 900);
    const unknown = unknownNumbers(reply, facts, message, history);
    if (unknown.length) {
      notes.push(`grounding: ${unknown.join(", ")} not in the facts → safe reply`);
      reply = proposal
        ? "I’ve prepared it below. Check the amounts on the card before you confirm."
        : kateFallback(c, message).reply;
    }
    if (notes.length)
      console.log(`  \x1b[33mvalidator:\x1b[0m ${notes.join("; ")}`);
    emit({
      t: "done",
      reply: reply || "Sorry, I lost my words there. Could you ask again?",
      proposal,
      notes,
      source: "claude",
      ms: res.ms,
    });
  } catch (e) {
    if (signal?.aborted) return;
    logFallback("kate", e);
    emit({
      t: "done",
      ...kateFallback(c, message),
      notes: ["Claude unavailable"],
      source: "rules",
      ms: 0,
    });
  }
}

export function actionSheet(
  id: string,
  actionId: string,
  params: unknown,
  to?: unknown,
): ActionSheet | { error: string } {
  const c = getCustomer(id);
  const def = actionDef(actionId);
  const chk = checkAction(c, actionId, params, to);
  if (!def || !chk.ok) return { error: chk.ok ? "Unknown action" : chk.error };
  const d = def.describe(c, chk.params, chk.to);
  return {
    id: actionId,
    params: chk.params,
    to: chk.to,
    title: d.title,
    rows: d.rows,
    level: def.level,
  };
}

/** All state changes go through here. Inputs are re-validated; nothing from the client is trusted. */
export function command(
  id: string,
  body: Record<string, unknown>,
): { message: string } | { error: string } {
  const c = getCustomer(id);
  const notes: string[] = [];
  switch (body.type) {
    case "action": {
      const actionId = String(body.id ?? "");
      const def = actionDef(actionId);
      const chk = checkAction(c, actionId, body.params, body.to);
      if (!def || !chk.ok)
        return { error: chk.ok ? "Unknown action" : chk.error };
      try {
        const message = def.run(c, chk.params, chk.to);
        saveCustomer(c, message);
        return { message };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Action failed" };
      }
    }
    case "layout": {
      const p = validateProposal(
        c,
        { type: "layout", style: body.style, blocks: body.blocks },
        notes,
      );
      if (p?.type !== "layout")
        return { error: notes.join("; ") || "Invalid layout" };
      if (typeof body.suggestionsPerDay === "number")
        p.layout.suggestionsPerDay = Math.max(
          0,
          Math.min(3, Math.round(body.suggestionsPerDay)),
        );
      c.layout = p.layout;
      saveCustomer(c, "Saved your own home layout");
      return { message: "Your home is saved." };
    }
    case "tracker": {
      const raw = body.spec as Partial<TrackerSpec> | undefined;
      const p = validateProposal(
        c,
        { type: "tracker", ...raw, size: body.size },
        notes,
      );
      if (p?.type !== "tracker")
        return { error: notes.join("; ") || "Invalid block" };
      c.trackers.push(p.spec);
      const base = c.layout ?? layoutFromHome(id);
      c.layout = {
        ...base,
        blocks: [
          { id: p.spec.id, size: p.size as Size },
          ...base.blocks.filter((b) => b.id !== p.spec.id),
        ],
      };
      saveCustomer(c, `Added your block “${p.spec.title}”`);
      return { message: `“${p.spec.title}” is on your home.` };
    }
    case "theme": {
      const chk = validateTheme(body.theme);
      if (!chk) return { error: "Invalid theme" };
      c.theme = chk.theme;
      saveCustomer(c, `Theme: ${chk.theme.name}`);
      return { message: `${chk.theme.name} is on.` };
    }
    case "theme_reset":
      c.theme = undefined;
      saveCustomer(c, "Back to the KBC look");
      return { message: "Back to the KBC look." };
    case "layout_reset":
      c.layout = undefined;
      saveCustomer(c, "Kate arranges your home again");
      return { message: "Kate will arrange your home again." };
    case "mute": {
      const target = String(body.id ?? "").slice(0, 60);
      if (!target) return { error: "Missing id" };
      if (!c.muted.includes(target)) c.muted.push(target);
      if (c.layout)
        c.layout.blocks = c.layout.blocks.filter((b) => b.id !== target);
      saveCustomer(c, `Won’t suggest ${target} again`);
      return { message: "Kate won’t suggest this again." };
    }
    case "unmute":
      c.muted = c.muted.filter((m) => m !== body.id);
      saveCustomer(c);
      return { message: "Back on." };
    case "belief": {
      const b = c.persona.beliefs.find((x) => x.id === body.id);
      if (!b) return { error: "Unknown item" };
      if (body.status === "remove")
        c.persona.beliefs = c.persona.beliefs.filter((x) => x !== b);
      else if (body.status === "said_no" || body.status === "told")
        b.status = body.status;
      else return { error: "Invalid status" };
      saveCustomer(c, `Updated: ${b.text}`);
      return { message: "Updated. Kate uses this from now on." };
    }
    case "stop_rule":
      c.rules = c.rules.filter((r) => r.id !== body.id);
      saveCustomer(c, "Stopped an automatic rule");
      return { message: "Rule stopped." };
    case "reset":
      resetCustomer(id);
      return { message: "Demo customer reset." };
    default:
      return { error: "Unknown command" };
  }
}

export function currentLayout(id: string) {
  return getCustomer(id).layout ?? layoutFromHome(id);
}

function layoutFromHome(id: string) {
  const h = cachedHome(id);
  return {
    style: h.style,
    blocks: h.blocks
      .filter((b) => !b.protection)
      .map((b) => ({ id: b.id, size: b.size })),
    suggestionsPerDay: 1,
  };
}
