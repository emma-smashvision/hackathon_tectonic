import { type ComposeResult, compose } from "@/lib/compose/compose";
import {
  buildKateContext,
  parseDemoState,
  reconstructProfile,
} from "@/lib/kate/context";
import {
  createRateLimiter,
  readLimitedJson,
  sharedBudget,
} from "@/lib/kate/limits";

export const runtime = "nodejs";
const MAX_PAYLOAD = 8_192;
const allow = createRateLimiter();
/** Same demo state, same layout: reuse it instead of paying for it twice. */
const cache = new Map<string, ComposeResult>();
const MAX_CACHE = 100;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Expected JSON." }, { status: 415, headers });
  let raw: unknown;
  try {
    raw = await readLimitedJson(request, MAX_PAYLOAD);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof RangeError ? "Payload too large." : "Invalid JSON.",
      },
      { status: error instanceof RangeError ? 413 : 400, headers },
    );
  }
  const state = parseDemoState(raw);
  if (!state)
    return Response.json(
      { error: "Invalid demo context." },
      { status: 400, headers },
    );
  const key = JSON.stringify(state);
  const cached = cache.get(key);
  if (cached) return Response.json(cached, { headers });

  const client =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim()
      .slice(0, 64) ?? "local";
  if (!allow(client))
    return Response.json(
      { error: "Please try again in a minute." },
      { status: 429, headers: { ...headers, "Retry-After": "60" } },
    );

  const context = buildKateContext(reconstructProfile(state), state.decisions);
  const result = await compose(context, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    budget: sharedBudget(),
  });
  // Only successful layouts are cached, so a transient failure can retry.
  if (result.source === "claude") {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value ?? "");
    cache.set(key, result);
  }
  return Response.json(result, { headers });
}
