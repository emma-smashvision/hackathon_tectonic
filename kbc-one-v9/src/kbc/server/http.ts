import { readLimitedJson } from "@/lib/kate/limits";
import { isPersona } from "./store";

const headers = { "Cache-Control": "no-store" };

export const ok = (data: unknown) => Response.json(data, { headers });
export const fail = (status: number, error: string) =>
  Response.json({ error }, { status, headers });

/** Small per-process limiter: `max` requests per minute per client, plus a global ceiling. */
export function limiter(max: number, globalMax = max * 5) {
  const hits = new Map<string, number>();
  let start = 0;
  let total = 0;
  return (request: Request) => {
    const now = Date.now();
    if (now - start > 60_000) {
      hits.clear();
      total = 0;
      start = now;
    }
    const key =
      request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim()
        .slice(0, 64) ?? "local";
    const n = hits.get(key) ?? 0;
    if (n >= max || total >= globalMax) return false;
    hits.set(key, n + 1);
    total++;
    return true;
  };
}

export async function readBody(
  request: Request,
  maxBytes = 16_000,
): Promise<Record<string, unknown> | Response> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail(415, "Expected JSON.");
  try {
    const raw = await readLimitedJson(request, maxBytes);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return fail(400, "Expected a JSON object.");
    return raw as Record<string, unknown>;
  } catch (e) {
    return e instanceof RangeError
      ? fail(413, "Payload too large.")
      : fail(400, "Invalid JSON.");
  }
}

export function personaFrom(value: unknown): string | Response {
  return isPersona(value) ? value : fail(404, "Unknown demo customer.");
}
