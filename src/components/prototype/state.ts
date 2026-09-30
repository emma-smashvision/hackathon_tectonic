import { PERSONAS } from "@/lib/engine/personas";
import { getInjection } from "@/lib/engine/signals";
import {
  type AdaptiveWidgetId,
  type Decisions,
  EMPTY_DECISIONS,
  type NeedId,
  type Profile,
} from "@/lib/engine/types";

export interface InjectedSignal {
  key: number;
  id: string;
  label: string;
}

export interface PersonaState {
  profile: Profile;
  decisions: Decisions;
  injected: InjectedSignal[];
}

export interface State {
  personaId: string;
  personas: Record<string, PersonaState>;
  seq: number;
}

export type Action =
  | { type: "selectPersona"; id: string }
  | { type: "inject"; signal: string }
  | { type: "reset" }
  | { type: "scenario"; persona: string; signals: string[] }
  | { type: "togglePin"; widget: AdaptiveWidgetId }
  | { type: "hide"; widget: AdaptiveWidgetId }
  | { type: "unhide"; widget: AdaptiveWidgetId }
  | { type: "answer"; need: NeedId; relevant: boolean }
  | { type: "hydrate"; saved: Record<string, SavedDecisions> };

/** Only customer layout choices persist; answers reset with the demo data. */
export type SavedDecisions = Pick<Decisions, "pinned" | "hidden">;

function fresh(id: string): PersonaState {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return { profile: persona.profile, decisions: EMPTY_DECISIONS, injected: [] };
}

export function initialState(): State {
  return {
    personaId: PERSONAS[1].id,
    personas: Object.fromEntries(PERSONAS.map((p) => [p.id, fresh(p.id)])),
    seq: 0,
  };
}

function without<T>(list: T[], item: T): T[] {
  return list.filter((x) => x !== item);
}

function updateCurrent(
  state: State,
  fn: (p: PersonaState) => PersonaState,
): State {
  const current = state.personas[state.personaId];
  return {
    ...state,
    personas: { ...state.personas, [state.personaId]: fn(current) },
  };
}

function withDecisions(state: State, fn: (d: Decisions) => Decisions): State {
  return updateCurrent(state, (p) => ({ ...p, decisions: fn(p.decisions) }));
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "selectPersona":
      return { ...state, personaId: action.id };
    case "inject": {
      const injection = getInjection(action.signal);
      const key = state.seq + 1;
      return updateCurrent({ ...state, seq: key }, (p) => ({
        ...p,
        profile: injection.apply(p.profile),
        injected: [
          ...p.injected,
          { key, id: injection.id, label: injection.label },
        ],
      }));
    }
    case "scenario": {
      // Start the persona fresh, keep its saved layout, then replay the story.
      let next: State = {
        ...state,
        personaId: action.persona,
        personas: {
          ...state.personas,
          [action.persona]: {
            ...fresh(action.persona),
            decisions: {
              ...EMPTY_DECISIONS,
              pinned: state.personas[action.persona].decisions.pinned,
              hidden: state.personas[action.persona].decisions.hidden,
            },
          },
        },
      };
      for (const signal of action.signals) {
        next = reducer(next, { type: "inject", signal });
      }
      return next;
    }
    case "reset":
      return updateCurrent(state, () => fresh(state.personaId));
    case "togglePin":
      return withDecisions(state, (d) => ({
        ...d,
        pinned: d.pinned.includes(action.widget)
          ? without(d.pinned, action.widget)
          : [...d.pinned, action.widget],
        hidden: without(d.hidden, action.widget),
      }));
    case "hide":
      return withDecisions(state, (d) => ({
        ...d,
        hidden: [...without(d.hidden, action.widget), action.widget],
        pinned: without(d.pinned, action.widget),
      }));
    case "unhide":
      return withDecisions(state, (d) => ({
        ...d,
        hidden: without(d.hidden, action.widget),
      }));
    case "answer":
      return withDecisions(state, (d) => ({
        ...d,
        declared: action.relevant
          ? [...without(d.declared, action.need), action.need]
          : without(d.declared, action.need),
        dismissed: action.relevant
          ? without(d.dismissed, action.need)
          : [...without(d.dismissed, action.need), action.need],
      }));
    case "hydrate": {
      const personas = { ...state.personas };
      for (const [id, saved] of Object.entries(action.saved)) {
        const current = personas[id];
        if (!current) continue;
        personas[id] = {
          ...current,
          decisions: {
            ...current.decisions,
            pinned: saved.pinned ?? [],
            hidden: saved.hidden ?? [],
          },
        };
      }
      return { ...state, personas };
    }
  }
}

const STORAGE_KEY = "kbc-home:layout:v1";

export function loadSaved(): Record<string, SavedDecisions> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, SavedDecisions>)
      : null;
  } catch {
    return null;
  }
}

export function save(state: State): void {
  try {
    const data = Object.fromEntries(
      Object.entries(state.personas).map(([id, p]) => [
        id,
        { pinned: p.decisions.pinned, hidden: p.decisions.hidden },
      ]),
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, blocked): layout stays in memory.
  }
}
