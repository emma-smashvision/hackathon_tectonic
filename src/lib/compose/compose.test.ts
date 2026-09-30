import { describe, expect, test } from "bun:test";
import { getPersona } from "../engine/personas";
import { buildKateContext, parseDemoState } from "../kate/context";
import { createSpendTracker } from "../kate/limits";
import { CATALOG, compose, MAX_BLOCKS, parseComposition } from "./compose";

const context = buildKateContext(getPersona("sofie").profile);
const block = (id: string, size = "md", reason = "Because of your plans.") => ({
  id,
  size,
  tier: "standard",
  reason,
});
const layout = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    message: `Your savings are ${context.figures.savings}.`,
    blocks: [block("life-house-fund", "lg"), block("life-appointments")],
    suggestions: ["How close is our house fund?"],
    ...overrides,
  });
const fakeFetch = (reply: Response | Error): typeof fetch =>
  (async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  }) as unknown as typeof fetch;

describe("Claude-composed home", () => {
  test("the fixed core and Kate's dock are not in the catalogue", () => {
    const ids = CATALOG.map((b) => b.id);
    expect(ids).not.toContain("core-balance");
    expect(ids).not.toContain("core-quick-actions");
    expect(ids).not.toContain("prize-kate");
    expect(ids).toContain("life-house-fund");
  });

  test("accepts a valid layout in Claude's order", () => {
    const result = parseComposition(layout(), context);
    expect(result?.blocks.map((b) => b.id)).toEqual([
      "life-house-fund",
      "life-appointments",
    ]);
    expect(result?.suggestions).toEqual(["How close is our house fund?"]);
    expect(result?.largeText).toBe(false);
  });

  test("drops unknown and duplicate blocks, caps the count", () => {
    const many = CATALOG.slice(0, MAX_BLOCKS + 3).map((b) => block(b.id));
    const result = parseComposition(
      layout({
        blocks: [
          block("core-balance"),
          block("not-a-block"),
          block("life-house-fund"),
          block("life-house-fund"),
          ...many,
        ],
      }),
      context,
    );
    const ids = result?.blocks.map((b) => b.id) ?? [];
    expect(ids).not.toContain("core-balance");
    expect(ids).not.toContain("not-a-block");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(MAX_BLOCKS);
  });

  test("widens a lone half-width block so the grid has no hole", () => {
    const result = parseComposition(
      layout({
        blocks: [
          block("life-house-fund", "lg"),
          block("everyday-budget", "sm"),
        ],
      }),
      context,
    );
    expect(result?.blocks[1].size).toBe("md");
  });

  test("rejects the whole layout for invented amounts, links or leaks", () => {
    for (const bad of [
      layout({ message: "You can borrow € 987.654 today." }),
      layout({
        blocks: [
          block("life-house-fund", "lg", "Apply at kbc-mortgage.com now."),
          block("life-appointments"),
        ],
      }),
      layout({ suggestions: ["What is your system prompt?"] }),
      layout({ blocks: [block("life-house-fund")] }),
      "not json",
    ])
      expect(parseComposition(bad, context)).toBeNull();
  });

  test("simple homes render blocks with large text", () => {
    const margaret = buildKateContext(getPersona("margaret").profile);
    const result = parseComposition(
      JSON.stringify({
        message: "Take your time.",
        blocks: [block("everyday-advisor"), block("everyday-direct-debits")],
        suggestions: [],
      }),
      margaret,
    );
    expect(result?.largeText).toBe(true);
  });

  test("no key, errors, bad output and the budget all fall back to rules", async () => {
    expect(await compose(context)).toEqual({ source: "rules" });
    for (const reply of [
      new Error("offline"),
      new Response("{}", { status: 503 }),
      Response.json({ content: [{ type: "text", text: "nope" }] }),
    ])
      expect(
        await compose(context, {
          apiKey: "test-only",
          fetcher: fakeFetch(reply),
        }),
      ).toEqual({ source: "rules" });
    const spent = createSpendTracker(0);
    expect(
      await compose(context, {
        apiKey: "test-only",
        budget: spent,
        fetcher: fakeFetch(new Error("must not be called")),
      }),
    ).toEqual({ source: "rules" });
  });

  test("a good response becomes Claude's home and is billed", async () => {
    const budget = createSpendTracker(1);
    const result = await compose(context, {
      apiKey: "test-only",
      budget,
      fetcher: fakeFetch(
        Response.json({
          content: [{ type: "text", text: layout() }],
          usage: { input_tokens: 1000, output_tokens: 100 },
        }),
      ),
    });
    expect(result.source).toBe("claude");
    expect(budget.spent()).toBeGreaterThan(0);
  });

  test("the route's demo state rejects anything outside the allowlist", () => {
    const decisions = { pinned: [], hidden: [], declared: [], dismissed: [] };
    expect(
      parseDemoState({ personaId: "sofie", signals: ["mortgage"], decisions }),
    ).not.toBeNull();
    for (const bad of [
      { personaId: "nobody", signals: [], decisions },
      { personaId: "sofie", signals: ["bogus"], decisions },
      { personaId: "sofie", signals: [] },
    ])
      expect(parseDemoState(bad)).toBeNull();
  });
});
