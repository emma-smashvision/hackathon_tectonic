import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PERSONA_IDS, seedPersona } from "../personas";
import { rememberLook } from "../theme";
import type { Customer, HomeModel } from "../types";

// Demo state lives in a local JSON file so refreshes keep what the customer did.
// Synthetic data only. Delete .data/ (or use Reset) to start over.

const FILE =
  process.env.KBC_STATE_FILE ?? join(process.cwd(), ".data", "kbc-state.json");

type Saved = {
  customers: Record<string, Customer>;
  homes: Record<string, HomeModel>;
};

let cache: Saved | null = null;

function load(): Saved {
  if (cache) return cache;
  try {
    cache = JSON.parse(
      readFileSync(/*turbopackIgnore: true*/ FILE, "utf8"),
    ) as Saved;
  } catch {
    cache = { customers: {}, homes: {} };
  }
  return cache;
}

function persist() {
  if (!cache) return;
  mkdirSync(/*turbopackIgnore: true*/ dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(cache));
  renameSync(/*turbopackIgnore: true*/ tmp, FILE);
}

export const isPersona = (id: unknown): id is string =>
  typeof id === "string" && PERSONA_IDS.includes(id);

function fresh(id: string): Customer {
  const persona = seedPersona(id);
  if (!persona) throw new Error("Unknown persona");
  return { persona, trackers: [], muted: [], rules: [], requests: [], log: [] };
}

export function getCustomer(id: string): Customer {
  const s = load();
  if (!s.customers[id]) {
    s.customers[id] = fresh(id);
    persist();
  }
  const c = s.customers[id];
  // Migrate existing v7 themes before a KBC switch can clear the selection.
  if (!c.looks || !c.activeLookId) {
    c.looks ??= [];
    c.activeLookId = c.theme ? rememberLook(c, c.theme) : "kbc";
    persist();
  }
  return c;
}

export function saveCustomer(c: Customer, note?: string) {
  const s = load();
  if (note)
    c.log = [{ at: new Date().toISOString(), text: note }, ...c.log].slice(
      0,
      30,
    );
  s.customers[c.persona.id] = c;
  persist();
}

export function resetCustomer(id: string): Customer {
  const s = load();
  s.customers[id] = fresh(id);
  delete s.homes[id];
  persist();
  return s.customers[id];
}

export function getHome(id: string): HomeModel | undefined {
  return load().homes[id];
}

export function saveHome(h: HomeModel) {
  load().homes[h.persona] = h;
  persist();
}
