import { fail, limiter, personaFrom, readBody } from "@/kbc/server/http";
import { askKate, type KateEvent, type KateTurn } from "@/kbc/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allow = limiter(20);

/** POST /api/kbc/kate {persona, message, history?, contextId?} → NDJSON stream of KateEvent. */
export async function POST(request: Request) {
  if (!allow(request)) return fail(429, "Please try again in a minute.");
  const body = await readBody(request, 24_000);
  if (body instanceof Response) return body;
  const persona = personaFrom(body.persona);
  if (persona instanceof Response) return persona;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 600)
    return fail(400, "Message must be 1–600 characters.");
  const history: KateTurn[] = Array.isArray(body.history)
    ? body.history
        .slice(-10)
        .filter(
          (t): t is KateTurn =>
            Boolean(t) &&
            typeof t === "object" &&
            (t.role === "user" || t.role === "kate") &&
            typeof t.text === "string",
        )
        .map((t) => ({ role: t.role, text: t.text.slice(0, 900) }))
    : [];
  const contextId =
    typeof body.contextId === "string"
      ? body.contextId.slice(0, 60)
      : undefined;
  const encoder = new TextEncoder();
  const stop = new AbortController(); // the customer pressed Stop or left
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: KateEvent) => {
        if (stop.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          stop.abort();
        }
      };
      await askKate(persona, message, history, contextId, emit, stop.signal);
      if (!stop.signal.aborted) controller.close();
    },
    cancel() {
      stop.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
