import { describe, expect, test } from "bun:test";
import { isJourneyBlock } from "./blocks";
import {
  candidates,
  composeWithRules,
  finalize,
  homeSuggestions,
  YOURS_LIMIT,
  FOR_YOU_LIMIT,
} from "./compose";
import { seedPersona, PERSONA_IDS } from "./personas";
import type { Customer, HomeModel, StyleId } from "./types";

function customer(id: string): Customer {
  const persona = seedPersona(id);
  if (!persona) throw new Error(id);
  return { persona, trackers: [], muted: [], rules: [], requests: [], log: [] };
}
const count = (home: HomeModel) =>
  Number(Boolean(home.intent)) + home.actions.length + home.forYou.length;

describe("v7 Home zone contract", () => {
  test("intent, protection and journey have priority within the shared budget", () => {
    const home = composeWithRules(customer("tom"));
    home.forYou = composeWithRules(customer("margaret")).forYou;
    home.actions = composeWithRules(customer("karim")).actions;
    expect(
      homeSuggestions(home, { journey: true }).map((item) => item.kind),
    ).toEqual(["intent", "block", "journey"]);
  });

  test("only one protection item shares the three slots with intent and journey", () => {
    const home = composeWithRules(customer("tom"));
    const protection = composeWithRules(customer("margaret")).forYou.find(b => b.protection)!;
    home.forYou = [protection, { ...protection, id: "unsafe_payment", action: undefined }, { ...protection, id: "declined_card", action: undefined }];
    const selected = homeSuggestions(home, { journey: true });
    expect(selected.map(item => item.kind)).toEqual(["intent", "block", "journey"]);
    expect(selected.filter(item => item.kind === "block" && item.value.protection)).toHaveLength(1);
    expect(homeSuggestions(home, { journey: true, hidden: [`block:${protection.id}`] }).map(item => item.kind)).toEqual(["intent", "journey"]);
  });

  test("a previously pinned protection item moves out of Yours into the shared budget", () => {
    const c = customer("margaret");
    c.layout = { style: "large", suggestionsPerDay: 0, blocks: [{ id: "paid_twice", size: "l" }, { id: "advisor", size: "l" }] };
    const home = composeWithRules(c);
    expect(home.blocks.map(b => b.id)).toEqual(["advisor"]);
    expect(home.forYou.map(b => b.id)).toEqual(["paid_twice"]);
    expect(count(home)).toBe(1);
  });

  test("dismissing the live journey reduces the count without a replacement journey", () => {
    const home = composeWithRules(customer("tom"));
    const moving = candidates(customer("tom")).blocks.find(
      (b) => b.id === "moving_plan",
    )!;
    home.forYou = [
      { ...moving, size: "m", score: "now", reason: "Your upcoming move" },
    ];
    const before = homeSuggestions(home, { journey: true });
    const after = homeSuggestions(home, { journey: true, hidden: ["journey"] });
    expect(after.map((item) => item.id)).toEqual(
      before.filter((item) => item.id !== "journey").map((item) => item.id),
    );
    expect(after.length).toBe(before.length - 1);
  });

  test("every persona has one shared suggestion budget, including the live journey", () => {
    for (const id of PERSONA_IDS) {
      const c = customer(id);
      const cand = candidates(c);
      for (const style of ["calm", "cards", "dense", "large"] as StyleId[]) {
        const home = finalize(
          c,
          cand,
          {
            style,
            blocks: [...cand.blocks, ...cand.blocks].map((b) => ({
              id: b.id,
              size: "l",
            })),
            actions: [...cand.actions, ...cand.actions].map((a) => ({
              id: a.id,
            })),
            intent: cand.intents[0],
          },
          { source: "claude", ms: 1 },
        );
        expect(home.blocks.length).toBeLessThanOrEqual(YOURS_LIMIT);
        expect(count(home)).toBeLessThanOrEqual(FOR_YOU_LIMIT);
        const suggestions = homeSuggestions(home, { journey: true });
        expect(suggestions.length).toBeLessThanOrEqual(FOR_YOU_LIMIT);
        expect(
          suggestions.filter(
            (x) =>
              x.kind === "journey" ||
              (x.kind === "block" && isJourneyBlock(x.value.id)),
          ).length,
        ).toBeLessThanOrEqual(1);
        if (home.intent) expect(suggestions[0].kind).toBe("intent");
      }
    }
  });

  test("an oversized chosen layout keeps its first six in the chosen order and sizes", () => {
    const c = customer("tom");
    const ids = candidates(c)
      .blocks.filter((b) => !b.protection)
      .map((b) => b.id);
    c.layout = {
      style: "large",
      suggestionsPerDay: 99,
      blocks: ids.map((id, i) => ({ id, size: i % 2 ? "s" : "l" })),
    };
    const home = composeWithRules(c);
    expect(home.blocks.map((b) => ({ id: b.id, size: b.size }))).toEqual(
      c.layout.blocks.slice(0, 6),
    );
    expect(count(home)).toBeLessThanOrEqual(3);
  });

  test("model priorities do not move the starting set", () => {
    const c = customer("tom");
    const cand = candidates(c);
    const first = finalize(
      c,
      cand,
      { style: "calm", blocks: [{ id: "moving_plan" }] },
      { source: "claude", ms: 1 },
    );
    const next = finalize(
      c,
      cand,
      { style: "calm", blocks: [{ id: "subscriptions" }] },
      { source: "claude", ms: 1 },
    );
    expect(first.blocks.map((b) => b.id)).toEqual(next.blocks.map((b) => b.id));
    expect(first.blocks.some((b) => b.id === "moving_plan")).toBe(true);
  });

  test("protection can use a slot above a personal suggestion allowance, within the shared cap", () => {
    const c = customer("tom");
    c.layout = { style: "calm", blocks: [], suggestionsPerDay: 1 };
    const cand = candidates(c);
    const protection = candidates(customer("margaret")).blocks.find(
      (b) => b.protection,
    )!;
    cand.blocks.push(protection);
    const home = finalize(
      c,
      cand,
      { intent: cand.intents[0] },
      { source: "rules", ms: 0 },
    );
    expect(home.intent?.id).toBe("split_bill");
    expect(home.forYou.some((b) => b.protection)).toBe(true);
    expect(count(home)).toBeLessThanOrEqual(3);
  });

  test("suggestions off keeps protection in the shared budget", () => {
    const c = customer("margaret");
    c.layout = {
      style: "large",
      blocks: [{ id: "advisor", size: "l" }],
      suggestionsPerDay: 0,
    };
    const home = composeWithRules(c);
    expect(home.blocks.map((b) => b.id)).toEqual(["advisor"]);
    expect(home.forYou.map((b) => b.id)).toEqual(["paid_twice"]);
    expect(home.intent).toBeNull();
    expect(home.actions).toHaveLength(0);
  });

  test("Not now excludes the intent, and duplicate actions never take a second slot", () => {
    const c = customer("tom");
    const home = composeWithRules(c);
    expect(home.intent?.id).toBe("split_bill");
    const hidden = [`intent:${home.intent!.id}`];
    expect(
      homeSuggestions(home, { hidden }).every((x) => !hidden.includes(x.id)),
    ).toBe(true);
    const intent = home.intent!;
    const duplicate = {
      id: intent.actionId,
      level: 1 as const,
      title: intent.title,
      why: "",
      button: "Split",
      params: intent.params,
      facts: [],
      icon: "split" as const,
      reason: "",
    };
    const selected = homeSuggestions({
      ...home,
      actions: [duplicate, duplicate],
    });
    expect(
      selected.filter(
        (x) => x.kind === "action" && x.value.id === intent.actionId,
      ),
    ).toHaveLength(0);
  });
});
