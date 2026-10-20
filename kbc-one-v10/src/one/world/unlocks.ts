import { PEOPLE } from "../people";
import { ACTIVE_AREAS, AREA_CATALOGUE } from "./catalogue";
import { financeFor } from "./finance";
import type { AreaId, AreaUnlock, UnlockGoal, UnlockKey, WorldProgress, WorldUnlock } from "./types";

const prompts: Record<AreaId, [string, string, string]> = {
  home: ["Tell us you’re moving", "Set a goal for your home", "Your home or tenant cover opens Home"],
  car: ["Tell us you’re getting a car", "Set a goal for your car", "Your car insurance opens Car"],
  family: ["Tell us you’re expecting", "Set a goal for your family", "Your family cover opens Family"],
  kids: ["Tell us about your child’s next step", "Set a goal for uni savings", "A child’s account opens Kids"],
  savings: ["Tell us what you’re saving for", "Set a goal of any amount", "Your savings account opens Savings"],
  investments: ["Tell us you want to learn about investing", "Set a learning goal for your future", "Your existing holdings open Investments"],
  pension: ["Tell us you’re planning for retirement", "Set a goal for later life", "Your pension saving opens Pension"],
  work: ["Tell us about a change at work", "Set a goal for your work plans", "Your recorded work income opens Work"],
  abroad: ["Moving abroad? Tell us", "Set a goal for your move abroad", "An existing account abroad opens Abroad"],
  "private-banking": ["Tell us you want help with a complex plan", "Set a goal for your longer-term plans", "An existing private banking relationship opens this area"],
  care: ["Ask for support when you’re ready", "Choose what matters to you", "Support is available without a product"],
};

// r2-wu: account/goal keys work for all known people; care is still excluded below.
function hasExisting(personaId: string, areaId: AreaId): boolean {
  if (!Object.hasOwn(PEOPLE, personaId)) return false;
  const p = PEOPLE[personaId];
  if (areaId === "family") return p.household.cover.some(c => c.id === "liability" && c.state === "ok");
  return financeFor(personaId, areaId).attachments.length > 0;
}

/** Restore only explicit, persona-local intent. A product key can never fabricate ownership. */
export function restoreUnlocks(personaId: string, raw: unknown): AreaUnlock[] {
  if (!Object.hasOwn(PEOPLE, personaId) || !Array.isArray(raw)) return [];
  const result = new Map<AreaId, AreaUnlock>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { areaId, key, goal } = item;
    if (!AREA_CATALOGUE.some(a => a.id === areaId && !a.care) || !["life-event", "goal", "existing-product"].includes(key)) continue;
    if (key === "existing-product" && !hasExisting(personaId, areaId)) continue;
    if (key === "goal") {
      if (!goal || typeof goal.label !== "string" || !goal.label.trim() || goal.label.length > 120 || typeof goal.target !== "number" || !Number.isFinite(goal.target) || goal.target <= 0 || (goal.saved !== undefined && (typeof goal.saved !== "number" || !Number.isFinite(goal.saved) || goal.saved < 0))) continue;
      result.set(areaId, { areaId, key, goal: { label: goal.label.trim(), target: goal.target, saved: goal.saved ?? 0 } });
    } else if (!result.has(areaId)) result.set(areaId, { areaId, key });
  }
  return [...result.values()];
}

export function unlockRulesFor(personaId: string, areaId: AreaId, progress?: WorldProgress): WorldUnlock {
  const def = AREA_CATALOGUE.find(a => a.id === areaId);
  const available = Object.hasOwn(PEOPLE, personaId) && !!def && !def.care;
  const saved = progress?.personaId === personaId ? restoreUnlocks(personaId, progress.unlocks).find(u => u.areaId === areaId) : undefined;
  const existing = available && hasExisting(personaId, areaId);
  const goal = available && financeFor(personaId, areaId).goals.length > 0;
  const contextual = available && (ACTIVE_AREAS[personaId]?.includes(areaId) ?? false);
  const person = Object.hasOwn(PEOPLE, personaId) ? PEOPLE[personaId] : undefined;
  const knownEvent = contextual && !!person && !!def && (person.roadId !== "everyday-only" && def.roadIds.includes(person.roadId) || person.persona.driven.some(event => def.roadIds.includes(event.roadId)));
  const hints = prompts[areaId] ?? ["Choose a life event", "Set your own goal", "What you already have"];
  const unlockedBy = saved?.key ?? (existing ? "existing-product" : goal ? "goal" : knownEvent ? "life-event" : contextual ? "demo-context" : null);
  return { hint: available ? hints[0] : "Choose support when you’re ready", unlockedBy,
    keys: [
      { key: "life-event", label: "Life event", hint: hints[0], available, satisfied: knownEvent || saved?.key === "life-event", ...(def?.roadIds[0] ? { roadId: def.roadIds[0] } : {}) },
      { key: "goal", label: "A goal", hint: hints[1], available, satisfied: !!goal || saved?.key === "goal" },
      { key: "existing-product", label: "What you already have", hint: hints[2], available: existing, satisfied: existing },
    ], explore: { available, label: "Explore", hint: "Preview this area and its crowd. Nothing changes in your world." } };
}

/** Pure transition used by the existing local store. Exploration deliberately has no action. */
export function unlockArea(state: WorldProgress, areaId: AreaId, key: UnlockKey, goal?: UnlockGoal): WorldProgress {
  const old = restoreUnlocks(state.personaId, state.unlocks);
  const next = restoreUnlocks(state.personaId, [{ areaId, key, goal }]);
  if (!next.length) return state;
  const unlocks = [...old.filter(u => u.areaId !== areaId), next[0]];
  if (JSON.stringify(unlocks) === JSON.stringify(old)) return state;
  return { ...state, unlocks };
}
