import { describe, expect, test } from "bun:test";
import {
  ACTIONS,
  checkAction,
  intentCandidates,
  suggestedActions,
} from "./actions";
import { duplicates, leftUntilPayday, trackerValue } from "./blocks";
import { candidates, composeWithRules, finalize, STYLE_LIMIT } from "./compose";
import { onScreenFrom, parseKateOutput, validateProposal } from "./kate";
import { seedPersona } from "./personas";
import { extractJson } from "./server/claude";
import { contrast, validateTheme } from "./theme";
import type { Customer } from "./types";

const customer = (id: string): Customer => {
  const persona = seedPersona(id);
  if (!persona) throw new Error(id);
  return { persona, trackers: [], muted: [], rules: [], requests: [], log: [] };
};

describe("facts are computed in code", () => {
  test("left until payday subtracts bills before the salary", () => {
    const l = leftUntilPayday(customer("tom").persona);
    expect(l?.billsSum).toBe(214);
    expect(l?.left).toBe(1773.4);
  });
  test("double Luminus debit is detected once", () => {
    expect(duplicates(customer("margaret").persona)).toHaveLength(1);
  });
  test("coffee tracker sums only matching payments this month", () => {
    const v = trackerValue(customer("tom").persona, {
      id: "x",
      title: "Coffee",
      keywords: ["café"],
      categories: ["coffee"],
      period: "month",
      metric: "sum",
    });
    expect(v.count).toBe(14);
    expect(v.total).toBeGreaterThan(30);
  });
});

describe("composer validation", () => {
  test("unknown ids are dropped and protection is forced in", () => {
    const c = customer("margaret");
    const home = finalize(
      c,
      candidates(c),
      {
        style: "large",
        blocks: [
          { id: "made_up", size: "l" },
          { id: "advisor", size: "m" },
        ],
        actions: [{ id: "launch_rocket" }],
      },
      { source: "claude", ms: 1 },
    );
    expect(home.forYou[0].id).toBe("paid_twice");
    expect(home.blocks.some((b) => b.id === "made_up")).toBe(false);
    expect(home.actions).toHaveLength(0);
    expect(home.notes.join(" ")).toContain("made_up");
  });
  test("style limits are enforced", () => {
    const c = customer("tom");
    const many = candidates(c).blocks.map((b) => ({ id: b.id, size: "s" }));
    const home = finalize(
      c,
      candidates(c),
      { style: "large", blocks: many },
      { source: "claude", ms: 1 },
    );
    expect(home.blocks.length).toBeLessThanOrEqual(STYLE_LIMIT.large);
  });
  test("an own layout is never rearranged; suggestions are capped", () => {
    const c = customer("tom");
    c.layout = {
      style: "cards",
      blocks: [{ id: "savings_goal", size: "l" }],
      suggestionsPerDay: 1,
    };
    const home = finalize(
      c,
      candidates(c),
      {
        blocks: [
          { id: "spending_month" },
          { id: "coming_up" },
          { id: "savings_goal" },
        ],
      },
      { source: "claude", ms: 1 },
    );
    expect(home.blocks.map((b) => b.id)).toEqual(["savings_goal"]);
    expect(home.forYou).toHaveLength(1);
    expect(home.forYou[0].suggested).toBe(true);
  });
  test("behaviour, not age, picks the rules style", () => {
    expect(composeWithRules(customer("margaret")).style).toBe("large");
    expect(composeWithRules(customer("karim")).style).toBe("dense");
  });
});

describe("actions and intents", () => {
  test("params outside the allowed range are rejected", () => {
    const c = customer("lina");
    expect(checkAction(c, "exchange_pocket", { amount: 999999 }).ok).toBe(
      false,
    );
    expect(checkAction(c, "exchange_pocket", { amount: 150 }).ok).toBe(true);
    expect(checkAction(c, "rm_rf", {}).ok).toBe(false);
  });
  test("Lina gets pocket, data and pocket-money actions", () => {
    expect(
      suggestedActions(customer("lina"))
        .map((a) => a.id)
        .sort(),
    ).toEqual(["esim_data", "exchange_pocket", "send_pocket_money"]);
  });
  test("restaurant paid minutes ago → split intent", () => {
    const i = intentCandidates(customer("tom"));
    expect(i[0]?.id).toBe("split_bill");
    expect(i[0]?.params.people).toBe(4);
  });
  test("running an exchange moves money once", () => {
    const c = customer("lina");
    const def = ACTIONS.find((a) => a.id === "exchange_pocket");
    def?.run(c, { amount: 100 });
    expect(c.persona.accounts.current).toBe(1386.3);
    expect(c.persona.accounts.pocketGBP).toBe(103.2);
  });
});

describe("Kate proposals", () => {
  test("layout with invented blocks is cleaned", () => {
    const notes: string[] = [];
    const p = validateProposal(
      customer("tom"),
      {
        type: "layout",
        style: "cards",
        blocks: [
          { id: "savings_goal", size: "l" },
          { id: "evil", size: "l" },
        ],
      },
      notes,
    );
    expect(p?.type).toBe("layout");
    if (p?.type === "layout")
      expect(p.layout.blocks).toEqual([{ id: "savings_goal", size: "l" }]);
    expect(notes[0]).toContain("evil");
  });
  test("themes are fixed for contrast", () => {
    const t = validateTheme({
      name: "Pink",
      colors: {
        bg: "#ffe4f0",
        surface: "#ffffff",
        text: "#ffb6d5",
        muted: "#ffc0dd",
        accent: "#ff69b4",
        accentText: "#ffffff",
      },
      font: "comic-sans",
      radius: 99,
    });
    expect(t).not.toBeNull();
    if (!t) return;
    expect(
      contrast(t.theme.colors.text, t.theme.colors.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(t.theme.colors.accentText, t.theme.colors.accent),
    ).toBeGreaterThanOrEqual(4.5);
    expect(t.theme.font).toBe("inter");
    expect(t.theme.radius).toBe(32);
  });
  test("model replies with fences or chatter still parse", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("round two: contacts, availability, Kate output", () => {
  test("send_to_contact needs a known contact and stays within limits", () => {
    const c = customer("tom");
    expect(checkAction(c, "send_to_contact", { amount: 50 }, "Lien").ok).toBe(
      true,
    );
    expect(checkAction(c, "send_to_contact", { amount: 50 }, "Bob").ok).toBe(
      false,
    );
    expect(checkAction(c, "send_to_contact", { amount: 50 }).ok).toBe(false);
  });
  test("actions a customer can't use are refused", () => {
    // Tom has no child account, Karim no split group.
    expect(
      checkAction(customer("tom"), "send_pocket_money", { amount: 15 }).ok,
    ).toBe(false);
    expect(
      checkAction(customer("karim"), "request_split", { total: 50, people: 2 })
        .ok,
    ).toBe(false);
  });
  test("a split can go to some of the usual group; you always pay a share", () => {
    const c = customer("tom");
    const chk = checkAction(
      c,
      "request_split",
      { total: 128.4, people: 2 },
      "lien,arne",
    );
    expect(chk.ok).toBe(true);
    if (!chk.ok) return;
    expect(chk.to).toBe("lien,arne");
    expect(chk.params.people).toBe(3);
    const def = ACTIONS.find((a) => a.id === "request_split");
    def?.run(c, chk.params, chk.to);
    expect(c.requests.map((r) => r.name)).toEqual(["Lien", "Arne"]);
    // already split three ways → no split card any more
    expect(intentCandidates(c)).toHaveLength(0);
  });
  test("a transfer after dinner doesn't hide the split card", () => {
    const c = customer("tom");
    const def = ACTIONS.find((a) => a.id === "send_to_contact");
    def?.run(c, { amount: 50 }, "lien");
    expect(intentCandidates(c).map((i) => i.id)).toContain("split_bill");
  });
  test("Kate output: reply, ###, proposal", () => {
    const a = parseKateOutput("That is € 105,10.\n###\nnull");
    expect(a.reply).toBe("That is € 105,10.");
    expect(a.proposal).toBeNull();
    const b = parseKateOutput(
      'Prepared.\n###\n{"type":"action","id":"freeze_card","params":{}}',
    );
    expect((b.proposal as { id: string }).id).toBe("freeze_card");
    const plain = parseKateOutput("Just text, no separator.");
    expect(plain.reply).toBe("Just text, no separator.");
  });
  test("layouts only accept blocks this customer has", () => {
    const notes: string[] = [];
    const p = validateProposal(
      customer("tom"),
      {
        type: "layout",
        style: "calm",
        blocks: [
          { id: "portfolio", size: "l" },
          { id: "left_until_payday", size: "m" },
        ],
      },
      notes,
    );
    expect(p?.type).toBe("layout");
    if (p?.type === "layout")
      expect(p.layout.blocks.map((b) => b.id)).toEqual(["left_until_payday"]);
  });
  test("blocks dropped without being asked are kept", () => {
    const notes: string[] = [];
    const current = {
      style: "cards" as const,
      blocks: [
        { id: "left_until_payday", size: "m" as const },
        { id: "upcoming_payments", size: "s" as const },
      ],
    };
    const raw = {
      type: "layout",
      style: "cards",
      blocks: [{ id: "upcoming_payments", size: "l" }],
    };
    const kept = validateProposal(
      customer("tom"),
      raw,
      notes,
      current,
      "make payments big",
    );
    if (kept?.type === "layout") expect(kept.layout.blocks).toHaveLength(2);
    const removed = validateProposal(
      customer("tom"),
      raw,
      [],
      current,
      "remove payday, only payments",
    );
    if (removed?.type === "layout")
      expect(removed.layout.blocks).toHaveLength(1);
  });
  test("what Kate sees on screen is recomputed after an action", () => {
    const c = customer("tom");
    const home = composeWithRules(c);
    const before = onScreenFrom(home, c)?.blocks.find(
      (b) => b.id === "left_until_payday",
    );
    c.persona.accounts.current -= 50;
    const after = onScreenFrom(home, c)?.blocks.find(
      (b) => b.id === "left_until_payday",
    );
    if (before && after) expect(after.shows).not.toBe(before.shows);
  });
});
