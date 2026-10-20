import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eligibleBlocks } from "../blocks";
import { kateFallback, plainKateCopy, validateProposal, type Proposal } from "../kate";
import { contrast, validateTheme, ROSE_THEME } from "../theme";
import type { HomeModel } from "../types";

const oldState = process.env.KBC_STATE_FILE;
const oldAI = process.env.KBC_AI;
const testFile = join(import.meta.dir, "../../..", ".data", `kate-preview-test-${process.pid}.json`);
process.env.KBC_STATE_FILE = testFile;
const { askKate, cachedHome, command, currentLayout, limitHome } = await import("./service");
const { getCustomer, resetCustomer, saveCustomer } = await import("./store");
const request = "I like a pink, calm style and show my coffee spending";
const prepare = () => kateFallback(getCustomer("tom"), request, currentLayout("tom")).proposal!;
const apply = (proposal: Proposal) => command("tom", { type: "kate_apply", proposal });
beforeEach(() => { resetCustomer("tom"); process.env.KBC_AI = "off"; });
afterAll(() => {
  if (oldState === undefined) delete process.env.KBC_STATE_FILE; else process.env.KBC_STATE_FILE = oldState;
  if (oldAI === undefined) delete process.env.KBC_AI; else process.env.KBC_AI = oldAI;
  rmSync(testFile, { force: true });
});

describe("Kate preview guardrails", () => {
  test("preparing theme + coffee leaves all customer state unchanged", () => {
    const before = structuredClone(getCustomer("tom"));
    const p = prepare();
    expect(p.type).toBe("customization");
    if (p.type === "customization") {
      expect(p.theme?.name).toBe("Rose");
      expect(p.tracker?.preview.value).toBeTruthy();
      expect(p.changes).toHaveLength(2);
    }
    expect(getCustomer("tom")).toEqual(before);
  });
  test("Apply changes theme and tracker together; Undo restores both without reversing money", () => {
    const before = structuredClone(getCustomer("tom"));
    const result = apply(prepare());
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(getCustomer("tom").theme?.colors).toEqual(ROSE_THEME.colors);
    expect(cachedHome("tom").blocks.some((b) => b.title.startsWith("Coffee"))).toBe(true);
    getCustomer("tom").persona.accounts.current += 12;
    expect(command("tom", { type: "kate_undo", token: result.undoToken })).toHaveProperty("message");
    expect(getCustomer("tom").theme).toEqual(before.theme);
    expect(getCustomer("tom").layout).toEqual(before.layout);
    expect(getCustomer("tom").trackers).toEqual(before.trackers);
    expect(getCustomer("tom").persona.accounts.current).toBe(before.persona.accounts.current + 12);
  });
  test("Undo rejects wrong tokens, replay, and an expired 10-second window", () => {
    const result = apply(prepare());
    if ("error" in result) throw Error(result.error);
    expect(command("tom", { type: "kate_undo", token: "wrong" })).toHaveProperty("error");
    const original = Date.now;
    const now = original();
    Date.now = () => now + 10_001;
    try { expect(command("tom", { type: "kate_undo", token: result.undoToken })).toHaveProperty("error"); }
    finally { Date.now = original; }
    expect(command("tom", { type: "kate_undo", token: result.undoToken })).toHaveProperty("message");
    expect(command("tom", { type: "kate_undo", token: result.undoToken })).toHaveProperty("error");
  });
  test("a later edit invalidates Undo", () => {
    const result = apply(prepare());
    if ("error" in result) throw Error(result.error);
    command("tom", { type: "theme_reset" });
    expect(command("tom", { type: "kate_undo", token: result.undoToken })).toHaveProperty("error");
  });
  test("Fixed zone cannot be muted or accepted as layout blocks", () => {
    for (const id of ["balance", "transfer", "pay", "scan", "cards"]) {
      expect(command("tom", { type: "mute", id })).toHaveProperty("error");
      expect(validateProposal(getCustomer("tom"), { type: "layout", blocks: [{ id }] }, [])).toBeNull();
    }
    const theme = validateTheme({ ...ROSE_THEME, css: "display:none", fixed: false });
    expect(theme?.theme).not.toHaveProperty("css");
    expect(theme?.theme).not.toHaveProperty("fixed");
  });
  test("six Yours blocks are preserved; a seventh rejects the entire theme + tracker change", () => {
    const c = getCustomer("tom");
    c.layout = { style: "cards", blocks: eligibleBlocks(c).slice(0, 6).map((b) => ({ id: b.id, size: "s" })), suggestionsPerDay: 1 };
    expect(c.layout.blocks).toHaveLength(6);
    const before = structuredClone(c);
    const proposed = { type: "customization", theme: ROSE_THEME, tracker: { spec: { title: "Coffee", keywords: ["coffee"] }, size: "m" } };
    expect(command("tom", { type: "kate_apply", proposal: proposed })).toHaveProperty("error");
    expect(getCustomer("tom")).toEqual(before);
    expect(command("tom", { type: "tracker", spec: { title: "Coffee", keywords: ["coffee"] }, size: "m" })).toHaveProperty("error");
  });
  test("layout counts and the combined suggestions count are bounded", () => {
    const c = getCustomer("tom");
    const blocks = eligibleBlocks(c).map((b) => ({ id: b.id, size: "m" }));
    expect(blocks.length).toBeGreaterThan(6);
    expect(validateProposal(c, { type: "layout", blocks }, [])).toBeNull();
    const p = validateProposal(c, { type: "layout", blocks: blocks.slice(0, 2), suggestionsPerDay: 999 }, []);
    if (p?.type !== "layout") throw Error("Missing layout");
    expect(p.layout.suggestionsPerDay).toBe(3);
    const home = cachedHome("tom");
    const crowded = limitHome({ ...home, actions: Array(5).fill(home.actions[0]), forYou: Array(5).fill(home.blocks[0]), blocks: Array(10).fill(home.blocks[0]) } as HomeModel);
    expect(crowded.blocks.length).toBe(6);
    expect(crowded.actions.length + crowded.forYou.length + Number(Boolean(crowded.intent))).toBeLessThanOrEqual(3);
  });
  test("safe theme tokens always retain readable text, secondary text and buttons", () => {
    for (const bg of ["#000000", "#ffffff", "#777777", "#ff00ff", "#24121f"]) {
      const t = validateTheme({ colors: { bg, surface: "#ffffff", text: bg, muted: bg, accent: "#777777", accentText: "#666666" }, radius: 999, font: "evil", motif: "url(evil)", fixed: { display: "none" } })!.theme;
      for (const background of [t.colors.bg, t.colors.surface]) {
        expect(contrast(t.colors.text, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.colors.muted, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.colors.accent, background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(t.colors.accentText, t.colors.accent)).toBeGreaterThanOrEqual(4.5);
      expect(t.radius).toBe(32); expect(t.font).toBe("inter"); expect(t.motif).toBe("none");
    }
  });
  test("all three quick chips prepare a preview", () => {
    for (const message of ["Make text bigger", "Fewer blocks", "Back to KBC style"]) {
      expect(kateFallback(getCustomer("tom"), message, currentLayout("tom")).proposal?.type).toBe("customization");
    }
  });
  test("no car metaphor reaches Kate replies", () => {
    const text = plainKateCopy("Drive it, drivers: fuel, boot, tyres, paved bump in the glovebox.");
    expect(text).not.toMatch(/\b(drive|drivers|fuel|boot|tyres|paved|bump|glovebox)\b/i);
  });
});

describe("Kate with AI off and on", () => {
  test("the demo moment and all chips work in both modes without calling a network", async () => {
    for (const mode of ["off", "on"]) {
      process.env.KBC_AI = mode;
      for (const message of [request, "Make text bigger", "Fewer blocks", "Back to KBC style"]) {
        let result: any;
        await askKate("tom", message, [], undefined, (e) => { result = e; }, undefined, async () => { throw Error("Network should not be called"); });
        expect(result.source).toBe("rules"); expect(result.proposal.type).toBe("customization");
      }
    }
  });
  test("AI-generated themes are validated and words checked before display", async () => {
    process.env.KBC_AI = "on";
    const events: any[] = [];
    const text = `Drive it with fuel.\n###\n${JSON.stringify({ type: "theme", ...ROSE_THEME, colors: { ...ROSE_THEME.colors, text: ROSE_THEME.colors.bg } })}`;
    await askKate("tom", "Make an elegant theme", [], undefined, (e) => events.push(e), undefined, async ({ onText }) => { onText(text); return { text, ms: 1, model: "synthetic-test" }; });
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("claude");
    expect(events[0].reply).not.toMatch(/drive|fuel/i);
    expect(events[0].proposal.fixes.length).toBeGreaterThan(0);
    expect(getCustomer("tom").theme).toBeUndefined();
  });
  test("AI failure still gives a usable rules answer", async () => {
    process.env.KBC_AI = "on";
    let result: any;
    await askKate("tom", "What is my balance?", [], undefined, (e) => { result = e; }, undefined, async () => { throw Error("Synthetic outage"); });
    expect(result.source).toBe("rules"); expect(result.reply).toContain("current account");
  });
});


describe("v7.1 saved looks", () => {
  const makeLook = (name = "Pink Bubbles", radius = 22) => command("tom", { type: "theme", theme: { ...ROSE_THEME, name, radius } });
  const switchLook = (id: string) => command("tom", { type: "look_switch", id });

  test("KBC is a switch; the pink look and its id survive in server state", () => {
    makeLook();
    const pink = getCustomer("tom").activeLookId!;
    expect(getCustomer("tom").looks).toHaveLength(1);
    expect(command("tom", { type: "theme_reset" })).toHaveProperty("undoToken");
    expect(getCustomer("tom").theme).toBeUndefined();
    expect(getCustomer("tom").looks?.[0].id).toBe(pink);
    expect(switchLook(pink)).toHaveProperty("undoToken");
    expect(getCustomer("tom").theme?.name).toBe("Pink Bubbles");
    const persisted = JSON.parse(readFileSync(testFile, "utf8")).customers.tom;
    expect(persisted.looks).toHaveLength(1);
    expect(persisted.activeLookId).toBe(pink);
  });

  test("Undo restores selection and keeps the new look for later", () => {
    const first = makeLook();
    if ("error" in first) throw Error(first.error);
    const pink = getCustomer("tom").activeLookId!;
    command("tom", { type: "kate_undo", token: first.undoToken });
    expect(getCustomer("tom").activeLookId).toBe("kbc");
    expect(getCustomer("tom").looks).toHaveLength(1);
    switchLook(pink);
    const reset = switchLook("kbc");
    if ("error" in reset) throw Error(reset.error);
    command("tom", { type: "kate_undo", token: reset.undoToken });
    expect(getCustomer("tom").activeLookId).toBe(pink);
    expect(getCustomer("tom").theme?.colors).toEqual(ROSE_THEME.colors);
  });

  test("the eight most recently used looks are kept without duplicates", () => {
    for (let i = 0; i < 10; i++) makeLook(`Look ${i}`, 10 + i);
    expect(getCustomer("tom").looks).toHaveLength(8);
    expect(getCustomer("tom").looks?.map((look) => look.theme.name)).not.toContain("Look 0");
    const saved = getCustomer("tom").looks![7];
    switchLook(saved.id);
    switchLook("kbc");
    switchLook(saved.id);
    expect(getCustomer("tom").looks).toHaveLength(8);
    expect(getCustomer("tom").looks?.[0].id).toBe(saved.id);
    makeLook("Same tokens, different model label", saved.theme.radius);
    expect(getCustomer("tom").looks).toHaveLength(8);
    expect(getCustomer("tom").activeLookId).toBe(saved.id);
  });

  test("looks belong to one customer and unknown ids never change selection", () => {
    makeLook();
    const pink = getCustomer("tom").activeLookId!;
    resetCustomer("karim");
    expect(command("karim", { type: "look_switch", id: pink })).toHaveProperty("error");
    expect(getCustomer("karim").looks).toEqual([]);
    expect(switchLook("unknown")).toHaveProperty("error");
    expect(getCustomer("tom").activeLookId).toBe(pink);
  });

  test("existing v7 themes migrate before their first KBC switch", () => {
    const c = getCustomer("tom");
    c.theme = { ...ROSE_THEME, name: "Earlier pink" };
    delete c.looks; delete c.activeLookId;
    saveCustomer(c);
    command("tom", { type: "theme_reset" });
    expect(getCustomer("tom").looks?.[0].theme.name).toBe("Earlier pink");
  });

  test("rules restore the exact named or previous look without creating a replacement", async () => {
    makeLook("Pink Bubbles", 27);
    const pink = getCustomer("tom").activeLookId!;
    switchLook("kbc");
    for (const message of ["go back to my pink style", "use my previous look"]) {
      let result: any;
      await askKate("tom", message, [], undefined, (e) => { result = e; });
      expect(result.source).toBe("rules");
      expect(result.proposal.theme.radius).toBe(27);
      expect(getCustomer("tom").activeLookId).toBe("kbc");
      apply(result.proposal);
      expect(getCustomer("tom").activeLookId).toBe(pink);
      expect(getCustomer("tom").looks).toHaveLength(1);
      switchLook("kbc");
    }
  });

  test("rename and delete require confirmation and cannot affect another look", () => {
    makeLook();
    const pink = getCustomer("tom").activeLookId!;
    expect(command("tom", { type: "look_rename", id: pink, name: "Summer" })).toHaveProperty("error");
    expect(command("tom", { type: "look_delete", id: pink })).toHaveProperty("error");
    expect(getCustomer("tom").theme?.name).toBe("Pink Bubbles");
    command("tom", { type: "look_rename", id: pink, name: "Summer", confirm: true });
    expect(getCustomer("tom").theme?.name).toBe("Summer");
    expect(getCustomer("tom").looks?.[0].theme.name).toBe("Summer");
    switchLook("kbc"); switchLook(pink);
    expect(getCustomer("tom").theme?.name).toBe("Summer");
    const restored = kateFallback(getCustomer("tom"), "go back to my pink style").proposal;
    expect(restored?.type === "customization" && restored.theme?.name).toBe("Summer");
    command("tom", { type: "look_delete", id: pink, confirm: true });
    expect(getCustomer("tom").activeLookId).toBe("kbc");
    expect(getCustomer("tom").theme).toBeUndefined();
    expect(getCustomer("tom").looks).toEqual([]);
  });
});
