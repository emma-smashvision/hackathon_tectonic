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
  MAX_YOURS, MAX_SUGGESTIONS, FIXED_IDS, plainKateCopy, rulesCustomization,
  kateFacts,
  kateFallback,
  type Proposal,
  parseKateOutput,
  validateProposal,
} from "../kate";
import { PERSONAS } from "../personas";
import { validateTheme, selectLook, rememberLook } from "../theme";
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
    looks: c.looks ?? [],
    activeLookId: c.activeLookId ?? "kbc",
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
  return limitHome(getHome(id) ?? composeWithRules(getCustomer(id)));
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
    if (getCustomer(id) !== c) home = composeWithRules(getCustomer(id));
    home = limitHome(home);
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

/** Kate: local rules first; generated replies are checked before reaching the phone. */
export async function askKate(
  id: string,
  message: string,
  history: KateTurn[],
  contextId: string | undefined,
  emit: (e: KateEvent) => void,
  signal?: AbortSignal,
  generate: typeof streamClaude = streamClaude,
) {
  const c = getCustomer(id);
  const notes: string[] = [];
  const local = rulesCustomization(c, message, currentLayout(id));
  if (local || !aiEnabled()) {
    emit({
      t: "done",
      ...(local ?? kateFallback(c, message, currentLayout(id))),
      notes: [local ? "Local customization rules" : "AI is off (KBC_AI=off)"],
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
  try {
    const res = await generate({
      label: `kate · ${c.persona.name}${contextId ? ` · about ${contextId}` : ""}: “${message.slice(0, 60)}”`,
      model: MODELS.kate,
      system: KATE_SYSTEM,
      prompt,
      signal,
      // Buffer generated words until grounding and language checks have passed.
      onText: () => {},
    });
    const parsed = parseKateOutput(res.text);
    const proposal: Proposal | null = parsed.proposal
      ? validateProposal(c, parsed.proposal, notes, currentLayout(id), message)
      : null;
    // KBC One: amounts in Kate's words must come from her facts (or the customer's own words)
    let reply = plainKateCopy(parsed.reply.slice(0, 900));
    const unknown = unknownNumbers(reply, facts, message, history);
    if (unknown.length) {
      notes.push(`grounding: ${unknown.join(", ")} not in the facts → safe reply`);
      reply = proposal
        ? "I’ve prepared it below. Check the amounts on the card before you confirm."
        : kateFallback(c, message, currentLayout(id)).reply;
    }
    if (parsed.proposal && !proposal) reply = notes.at(-1) ?? "I could not prepare that change. Try a smaller change.";
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
      ...kateFallback(c, message, currentLayout(id)),
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
): { message: string; undoToken?: string } | { error: string } {
  const c = getCustomer(id);
  const notes: string[] = [];
  // A later edit invalidates the previous Undo, so it cannot erase a newer choice.
  if (["layout", "tracker", "theme", "theme_reset", "layout_reset", "mute", "reset"].includes(String(body.type))) undoChanges.delete(id);
  switch (body.type) {
    case "kate_apply": {
      const raw = proposalInput(body.proposal);
      const p = validateProposal(c, raw, notes, currentLayout(id));
      if (!p || p.type === "action" || p.type === "drive") return { error: notes.join(" ") || "Invalid preview" };
      const next = structuredClone(c);
      const parts = p.type === "customization" ? p : p.type === "layout" ? { layout: p.layout } : p.type === "theme" ? { theme: p.theme } : { tracker: p };
      if ("layout" in parts && parts.layout) next.layout = parts.layout;
      if ("theme" in parts) selectLook(next, parts.theme ?? null);
      if ("tracker" in parts && parts.tracker) {
        const base = next.layout ?? layoutFromHome(id);
        if (base.blocks.length >= MAX_YOURS) return { error: "Your 6 blocks are kept. Remove a block before adding another." };
        const tracker = parts.tracker;
        next.trackers.push(tracker.spec);
        next.layout = { ...base, blocks: [{ id: tracker.spec.id, size: tracker.size }, ...base.blocks] };
      }
      const token = crypto.randomUUID();
      undoChanges.set(id, { token, expires: Date.now() + 10_000, layout: structuredClone(c.layout), theme: structuredClone(c.theme), activeLookId: c.activeLookId, previousLookId: c.previousLookId, trackers: structuredClone(c.trackers) });
      saveCustomer(next, "Applied Kate preview");
      saveHome(limitHome(composeWithRules(next)));
      return { message: "Your changes are applied.", undoToken: token };
    }
    case "kate_undo": {
      const previous = undoChanges.get(id);
      if (!previous || previous.token !== body.token || Date.now() >= previous.expires) return { error: "The 10-second Undo has ended." };
      c.layout = previous.layout;
      c.theme = previous.theme;
      c.activeLookId = c.theme ? rememberLook(c, c.theme) : "kbc";
      c.previousLookId = previous.previousLookId;
      c.trackers = previous.trackers;
      undoChanges.delete(id);
      saveCustomer(c, "Undid Kate preview");
      saveHome(limitHome(composeWithRules(c)));
      return { message: "Your previous style and blocks are back." };
    }
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
      const base = c.layout ?? layoutFromHome(id);
      if (base.blocks.length >= MAX_YOURS) return { error: "Yours has 6 blocks. Remove a block first." };
      c.trackers.push(p.spec);
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
      return command(id, { type: "kate_apply", proposal: { type: "theme", theme: chk.theme } });
    }
    case "theme_reset":
      return command(id, { type: "look_switch", id: "kbc" });
    case "look_switch": {
      const look = c.looks?.find((item) => item.id === body.id);
      if (body.id !== "kbc" && !look) return { error: "That saved look is not available." };
      return command(id, { type: "kate_apply", proposal: { type: "customization", theme: look?.theme ?? null } });
    }
    case "look_rename":
    case "look_delete": {
      if (body.confirm !== true) return { error: "Confirm this change in Your looks." };
      const look = c.looks?.find((item) => item.id === body.id);
      if (!look) return { error: "That saved look is not available." };
      if (body.type === "look_rename") {
        const name = typeof body.name === "string" ? plainKateCopy(body.name.trim()).slice(0, 30) : "";
        if (!name) return { error: "Give your look a name." };
        look.theme.name = name;
        if (c.activeLookId === look.id && c.theme) c.theme.name = name;
      } else {
        c.looks = c.looks!.filter((item) => item.id !== look.id);
        if (c.activeLookId === look.id) { c.theme = undefined; c.activeLookId = "kbc"; }
        if (c.previousLookId === look.id) c.previousLookId = undefined;
      }
      undoChanges.delete(id);
      saveCustomer(c, body.type === "look_rename" ? "Renamed a saved look" : "Deleted a saved look");
      saveHome(limitHome(composeWithRules(c)));
      return { message: body.type === "look_rename" ? "Look renamed." : "Look deleted." };
    }
    case "layout_reset":
      c.layout = undefined;
      saveCustomer(c, "Kate arranges your home again");
      return { message: "Kate will arrange your home again." };
    case "mute": {
      const target = String(body.id ?? "").slice(0, 60);
      if (!target) return { error: "Missing id" };
      if (FIXED_IDS.has(target.toLowerCase())) return { error: "The Fixed zone always stays visible." };
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


/** Last boundary also protects old saved layouts and generated suggestions. */
export function limitHome(home: HomeModel): HomeModel {
  const slots = MAX_SUGGESTIONS - (home.intent ? 1 : 0);
  const protection = home.forYou.filter((b) => b.protection).slice(0, slots);
  const actions = home.actions.slice(0, slots - protection.length);
  const rest = home.forYou.filter((b) => !b.protection).slice(0, slots - protection.length - actions.length);
  return { ...home, blocks: home.blocks.slice(0, MAX_YOURS), actions, forYou: [...protection, ...rest] };
}

const undoChanges = new Map<string, {
  token: string; expires: number; activeLookId?: string; previousLookId?: string; layout: Customer["layout"]; theme: Customer["theme"]; trackers: Customer["trackers"];
}>();

/** Convert the displayed preview back to raw inputs; validation remains server-owned. */
function proposalInput(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (p.type === "theme") return { ...(p.theme as object), type: "theme" };
  if (p.type === "layout") return { ...(p.layout as object), type: "layout" };
  if (p.type === "tracker") return { ...(p.spec as object), size: p.size, type: "tracker" };
  if (p.type === "customization") {
    const tracker = p.tracker as Record<string, unknown> | undefined;
    return { type: "customization", theme: p.theme, layout: p.layout,
      ...(tracker ? { tracker: { ...(tracker.spec as object), size: tracker.size } } : {}) };
  }
  return null;
}
