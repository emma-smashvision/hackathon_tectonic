import { describe, expect, test } from "bun:test";
import { POST } from "../../app/api/kate/route";
import { getPersona } from "../engine/personas";
import { EMPTY_DECISIONS } from "../engine/types";
import {
  buildKateContext,
  fallbackReply,
  MAX_PAYLOAD,
  parseKateRequest,
  reconstructProfile,
} from "./context";
import { createRateLimiter, readLimitedJson } from "./limits";
import { parseModelReply, respond } from "./respond";

const context = buildKateContext(getPersona("sofie").profile);
const input = {
  message: "Can we afford a house?",
  personaId: "sofie",
  signals: [],
  decisions: EMPTY_DECISIONS,
};
const fakeFetch = (reply: Response | Error): typeof fetch =>
  (async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  }) as unknown as typeof fetch;

describe("Kate's synthetic context and fallback", () => {
  test("replays allowlisted signals and ignores arbitrary supplied balances", () => {
    const parsed = parseKateRequest({
      ...input,
      personaId: "tom",
      signals: ["ikea", "mover", "rent"],
      balance: 9999999,
    });
    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error("Expected valid request");
    const result = buildKateContext(
      reconstructProfile(parsed),
      parsed.decisions,
    );
    expect(result.needs.find((n) => n.id === "moving")?.status).toBe("applied");
    expect(result.profile.balance).not.toBe(9999999);
  });
  test("rejects unknown ids, malformed decisions and excessive inputs", () => {
    for (const value of [
      null,
      {},
      { ...input, personaId: "unknown" },
      { ...input, signals: ["bogus"] },
      { ...input, message: "a".repeat(601) },
      { ...input, signals: Array(101).fill("ikea") },
      { ...input, decisions: { ...EMPTY_DECISIONS, pinned: ["__proto__"] } },
      { ...input, message: " " },
    ])
      expect(parseKateRequest(value)).toBeNull();
  });
  test("answers common intents from persona figures without promises or recommendations", () => {
    expect(fallbackReply("balance", context).text).toContain(
      context.figures.balance,
    );
    const house = fallbackReply(input.message, context);
    expect(house.text).toContain(context.figures.houseSaved);
    expect(house.text).toContain("cannot establish affordability");
    expect(house.open).toBe("homeBuying");
    expect(fallbackReply("What changed this month?", context).text).toContain(
      context.figures.spent,
    );
    expect(fallbackReply("Is this payment safe?", context).text).toContain(
      "does not establish",
    );
    expect(fallbackReply("Call my advisor", context).text).toContain(
      context.profile.advisorName,
    );
    expect(fallbackReply("buy stocks", context).text).toContain(
      "cannot recommend",
    );
    expect(fallbackReply("What about my trip?", context).text).toContain(
      "no recent flight",
    );
  });
  test("hidden widgets cannot be opened by Kate", () => {
    const hidden = buildKateContext(getPersona("sofie").profile, {
      ...EMPTY_DECISIONS,
      hidden: ["homeBuying"],
    });
    expect(fallbackReply(input.message, hidden).open).toBeUndefined();
    expect(
      parseModelReply(
        '{"text":"Explore your savings.","open":"homeBuying"}',
        hidden,
      )?.open,
    ).toBeUndefined();
  });
  test("no key, provider failure, malformed output and timeout all return deterministic fallback", async () => {
    const expected = fallbackReply(input.message, context);
    expect(await respond(input.message, context)).toEqual(expected);
    expect(
      await respond(input.message, context, {
        apiKey: "test-only",
        fetcher: fakeFetch(new Error("unavailable")),
      }),
    ).toEqual(expected);
    expect(
      await respond(input.message, context, {
        apiKey: "test-only",
        fetcher: fakeFetch(new Response("{}", { status: 503 })),
      }),
    ).toEqual(expected);
    expect(
      await respond(input.message, context, {
        apiKey: "test-only",
        fetcher: fakeFetch(
          Response.json({ content: [{ type: "text", text: "not json" }] }),
        ),
      }),
    ).toEqual(expected);
    const hanging = (() => new Promise(() => {})) as unknown as typeof fetch;
    expect(
      await respond(input.message, context, {
        apiKey: "test-only",
        fetcher: hanging,
        timeoutMs: 5,
      }),
    ).toEqual(expected);
  });
  test("accepts valid model output, rejects invented numbers, validates hints", async () => {
    expect(
      parseModelReply('{"text":"You can borrow 987654321 euros."}', context),
    ).toBeNull();
    expect(
      parseModelReply('{"text":"Hello","open":"__proto__"}', context)?.open,
    ).toBeUndefined();
    const raw = JSON.stringify({
      text: `Your savings are ${context.figures.savings}.`,
      open: "homeBuying",
    });
    const answer = await respond("savings", context, {
      apiKey: "test-only",
      fetcher: fakeFetch(
        Response.json({ content: [{ type: "text", text: raw }] }),
      ),
    });
    expect(answer.source).toBe("claude");
    expect(answer.open).toBe("homeBuying");
  });
});

describe("route limits", () => {
  test("limits individual clients and the whole process; resets each minute", () => {
    const allow = createRateLimiter();
    for (let i = 0; i < 12; i++) expect(allow("same", 100_000)).toBe(true);
    expect(allow("same", 100_000)).toBe(false);
    for (let i = 0; i < 48; i++)
      expect(allow(`client-${i}`, 100_000)).toBe(true);
    expect(allow("new", 100_000)).toBe(false);
    expect(allow("same", 160_000)).toBe(true);
  });
  test("counts actual streamed bytes, even without a content-length header", async () => {
    const req = new Request("http://localhost/api/kate", {
      method: "POST",
      body: JSON.stringify({ data: "a".repeat(MAX_PAYLOAD) }),
    });
    await expect(readLimitedJson(req, MAX_PAYLOAD)).rejects.toBeInstanceOf(
      RangeError,
    );
  });
  test("HTTP handler rejects oversized and malformed payloads", async () => {
    const request = (body: string) =>
      new Request("http://localhost/api/kate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    expect((await POST(request("{"))).status).toBe(400);
    expect(
      (
        await POST(
          request(JSON.stringify({ ...input, message: "x".repeat(601) })),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request("x".repeat(MAX_PAYLOAD + 1)))).status).toBe(413);
  });
});
