import { fail, limiter, ok, personaFrom } from "@/kbc/server/http";
import { cachedHome, composeHome, snapshot } from "@/kbc/server/service";
import { getCustomer } from "@/kbc/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allow = limiter(30);

/** GET /api/kbc/home?persona=tom&mode=cached|compose */
export async function GET(request: Request) {
  if (!allow(request)) return fail(429, "Please try again in a minute.");
  const url = new URL(request.url);
  const persona = personaFrom(url.searchParams.get("persona"));
  if (persona instanceof Response) return persona;
  const home =
    url.searchParams.get("mode") === "compose"
      ? await composeHome(persona)
      : cachedHome(persona);
  return ok({ home, snapshot: snapshot(getCustomer(persona)) });
}
