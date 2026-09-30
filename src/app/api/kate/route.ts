import {
  buildKateContext,
  MAX_PAYLOAD,
  parseKateRequest,
  reconstructProfile,
} from "@/lib/kate/context";
import {
  budgetFromEnv,
  createRateLimiter,
  createSpendTracker,
  readLimitedJson,
} from "@/lib/kate/limits";
import { respond } from "@/lib/kate/respond";

export const runtime = "nodejs";
const allow = createRateLimiter();
const budget = createSpendTracker(budgetFromEnv());
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const key =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim()
      .slice(0, 64) ?? "local";
  if (!allow(key))
    return Response.json(
      { error: "Please try again in a minute." },
      { status: 429, headers: { ...headers, "Retry-After": "60" } },
    );
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
  const input = parseKateRequest(raw);
  if (!input)
    return Response.json(
      { error: "Invalid demo context or message (maximum 600 characters)." },
      { status: 400, headers },
    );
  const context = buildKateContext(reconstructProfile(input), input.decisions);
  const reply = await respond(input.message, context, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    history: input.history,
    budget,
  });
  return Response.json(reply, { headers });
}
