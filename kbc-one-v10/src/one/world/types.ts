import type { CrowdNumber } from "../crowd";
import type { Lesson } from "../learning/types";
import type { VillageProgress } from "../village/types";

export type AreaId = "home" | "car" | "family" | "kids" | "savings" | "investments" | "pension" | "work" | "abroad" | "private-banking" | "care";
export type WorldStage = 0 | 1 | 2 | 3 | 4;
export type WorldProgress = VillageProgress;
export type WorldGoal = { id: string; label: string; percent: number; source: "personal-goal" };
export type UnlockKey = "life-event" | "goal" | "existing-product";
export type UnlockGoal = { label: string; target: number; saved?: number };
export type AreaUnlock = { areaId: AreaId; key: UnlockKey; goal?: UnlockGoal };
export type WorldUnlock = {
  hint: string; unlockedBy: UnlockKey | "demo-context" | null;
  keys: { key: UnlockKey; label: string; hint: string; available: boolean; satisfied: boolean; roadId?: string }[];
  explore: { available: boolean; label: string; hint: string };
};
export type ProductAttachment = {
  id: string; label: string; kind: "insurance" | "loan" | "savings" | "pension" | "child-account" | "investment";
  visual: "shield" | "foundation" | "tank" | "tree" | "account";
};
export type FinanceGoal = WorldGoal & { saved: number; target: number; monthly: number };
export type AreaFinance = {
  label: "Your demo numbers"; percent: number | null; stage: WorldStage; summary: string;
  goals: FinanceGoal[]; attachments: ProductAttachment[]; facts: { label: string; value: string }[];
  mortgage?: { original: number; repaidPrincipal: number; remaining: number; percent: number; paymentsMade: number; totalPayments: number; monthlyPayment: number; fixedRate: boolean; balanceInsurance: boolean; homeInsurance: boolean };
  rent?: { city: string; monthly: number | null; paid: number | null; paymentsMade: number | null; basis: string; tenantInsurance: boolean; nextHome?: { city: string; monthly: number; startsOn: string; dateLabel: string; goalPercent: number | null } };
  car?: { insured: boolean; renewalDate: string; renewalLabel: string; yearlyPremium: number; previousPremium: number; changePercent: number; loanPercent: number | null; maintenance: string[] };
  pension?: { contributed: number; yearlyMax: number; percent: number; yearsContributed: number | null };
  child?: { name: string; balance: number; goal: FinanceGoal | null };
};
export type AreaDefinition = { id: AreaId; title: string; subtitle: string; roadIds: string[]; hue: string; educationOnly?: boolean; care?: boolean };
export type WorldArea = AreaDefinition & {
  active: boolean; locked: boolean; explore: boolean; stage: WorldStage;
  goals: WorldGoal[]; goalPercent: number | null; quests: Lesson[]; completed: number;
  storms: WorldStorm[]; signposts: WorldSignpost[]; lanterns: number; guide: boolean;
  unlock: WorldUnlock; finance: AreaFinance; attachments: ProductAttachment[];
};
export type WorldStorm = {
  id: string; areaId: AreaId; roadId: string; stopId: string; title: string;
  dueDate: string | null; daysAway: number | null;
  dateBasis: "confirmed-event" | "personal-renewal" | "everyday-calendar" | "undated-preview";
  dateLabel: string; denominator: CrowdNumber; share: CrowdNumber; shareLabel: string;
  lessonId: string; saveId: string | null; prepared: boolean;
  status: "approaching" | "prepared" | "repair" | "preview";
  repairQuestId: string; synthetic: true;
};
export type WorldSignpost = {
  id: string; areaId: AreaId; roadId: string; stopId: string | null; text: string;
  own: boolean; usefulCount: number; usefulByMe: boolean; source: "reviewed-note";
};
export type WorldAhead = {
  personaId: string; areaId: AreaId; title: string; yearsAhead: 2; available: boolean;
  reason: string | null; denominator: CrowdNumber; basis: string;
  buildOrder: { areaId: AreaId; title: string; order: number; share: CrowdNumber }[];
  stormHits: { roadId: string; stopId: string; title: string; share: CrowdNumber; denominator: CrowdNumber }[];
  synthetic: true;
};
export type KidsMiniWorld = {
  id: string; parentId: string; title: string; mode: "parent-co-build";
  preview: boolean; childName: string | null; sharedWith: "parent-only";
  stage: WorldStage; quests: Lesson[]; goals: WorldGoal[]; publicSharing: false;
};
export type WorldOptions = { careOptIn?: boolean; notes?: import("../notes8/types").Note8[]; today?: string };
export type World = {
  personaId: string; name: string; mode: "game" | "calm" | "plain" | "care"; playable: boolean;
  areas: WorldArea[]; storms: WorldStorm[]; signposts: WorldSignpost[]; lanterns: number;
  kids: KidsMiniWorld | null; today: string; synthetic: true; disclosure: string;
};
