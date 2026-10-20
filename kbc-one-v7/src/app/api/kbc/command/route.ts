import { fail, limiter, ok, personaFrom, readBody } from "@/kbc/server/http";
import { actionSheet, command, snapshot } from "@/kbc/server/service";
import { getCustomer } from "@/kbc/server/store";

export const runtime = "nodejs";
const allow = limiter(60);

/** POST /api/kbc/command {persona, type, ...}. type "preview_action" only describes, never changes state. */
export async function POST(request: Request) {
  if (!allow(request)) return fail(429, "Please try again in a minute.");
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const persona = personaFrom(body.persona);
  if (persona instanceof Response) return persona;
  if (body.type === "preview_action") {
    const sheet = actionSheet(
      persona,
      String(body.id ?? ""),
      body.params,
      body.to,
    );
    return "error" in sheet ? fail(400, sheet.error) : ok({ sheet });
  }
  const res = command(persona, body);
  if ("error" in res) return fail(400, res.error);
  return ok({ ...res, snapshot: snapshot(getCustomer(persona)) });
}
