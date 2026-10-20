import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkNote } from "../../../hindsight/engine/moderation";
import { getRoad } from "../../../hindsight/engine/roads";
import { EVERYDAY } from "../../../hindsight/engine/everyday";
import { catalogueRoad, EVERYDAY_ONLY_ID } from "../../../one/crowd";

// Synthetic demo only: shared server memory, simulated review, no account data.
// Legacy GET/POST remain compatible. Full contract: one/notes8/README.md.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_MS = 5000;
const MAX_BODY = 2048;
const MAX_PER_ROAD = 300;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
interface StoredNote {
  id: string;
  roadId: string;
  stopId: string | null;
  text: string;
  createdAt: number;
  approveAt: number;
  ownerToken?: string;
}
const g = globalThis as unknown as { __hsNotes?: StoredNote[]; __hsRate?: Map<string, number[]>; __hsSalt?: string };
const notes = (g.__hsNotes ??= []);
const rate = (g.__hsRate ??= new Map<string, number[]>());
const salt = (g.__hsSalt ??= randomUUID());
const noStore = { "cache-control": "no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });
// Public road IDs come from the shared crowd catalogue, including Everyday.
const roadFor = (id: string) => catalogueRoad(id) && (id === EVERYDAY_ONLY_ID ? EVERYDAY : getRoad(id));
const validStop = (road: NonNullable<ReturnType<typeof roadFor>>, id: string) => road.stops.some((s) => s.id === id) || road.fork?.id === id;
const validToken = (token: unknown): token is string => typeof token === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(token);

async function clientKey(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Buffer.from(digest).toString("hex").slice(0, 24);
}
function limited(key: string): boolean {
  const now = Date.now();
  // Bound this demo limiter's memory as visitors arrive.
  for (const [entry, times] of rate) if (times.every((t) => now - t >= RATE_WINDOW_MS)) rate.delete(entry);
  const hits = (rate.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  rate.set(key, hits);
  return false;
}
async function bodyOf(req: Request): Promise<Record<string, unknown> | Response> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "Expected JSON" }, 415);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "Too long" }, 413);
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid note" }, 400);
    return body as Record<string, unknown>;
  } catch { return json({ error: "Invalid JSON" }, 400); }
}
function publicNote(note: StoredNote, ownerToken: string | null, now: number) {
  return {
    id: note.id, roadId: note.roadId, stopId: note.stopId, text: note.text,
    createdAt: note.createdAt, reviewAt: note.approveAt,
    status: note.approveAt <= now ? "approved" : "review",
    own: Boolean(ownerToken && note.ownerToken === ownerToken),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roadId = url.searchParams.get("road") ?? "";
  const road = roadFor(roadId);
  if (!road) return json({ error: "Unknown road" }, 400);
  const hasStop = url.searchParams.has("stop");
  const stopId = url.searchParams.get("stop") || null;
  if (stopId && !validStop(road, stopId)) return json({ error: "Unknown stop" }, 400);
  const includeRoad = url.searchParams.get("includeRoad") === "true";
  const token = req.headers.get("x-notes-owner");
  const owner = validToken(token) ? token : null;
  const now = Date.now();
  const scoped = notes.filter((n) => n.roadId === roadId &&
    (!hasStop || n.stopId === stopId || (includeRoad && n.stopId === null)));
  const approved = scoped.filter((n) => n.approveAt <= now).slice(-40);
  const pending = scoped.filter((n) => n.approveAt > now && owner && n.ownerToken === owner);
  const list = [...approved, ...pending].sort((a, b) => b.createdAt - a.createdAt || notes.indexOf(b) - notes.indexOf(a));
  return json({ notes: list.map((n) => publicNote(n, owner, now)), reviewSimulated: true });
}

export async function POST(req: Request) {
  const body = await bodyOf(req);
  if (body instanceof Response) return body;
  const { roadId, text, ownerToken } = body;
  const stopId = body.stopId ?? null;
  if (typeof roadId !== "string" || typeof text !== "string" || (stopId !== null && typeof stopId !== "string") ||
    (ownerToken !== undefined && !validToken(ownerToken))) return json({ error: "Invalid note" }, 400);
  const road = roadFor(roadId);
  if (!road || road.status !== "live") return json({ error: "Unknown road" }, 400);
  if (stopId !== null && !validStop(road, stopId)) return json({ error: "Unknown stop" }, 400);
  if (limited(await clientKey(req))) return json({ error: "Too many notes. Try again in a minute." }, 429);
  const clean = text.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  const reasons = checkNote(clean).filter((c) => !c.pass).map((c) => c.label);
  if (reasons.length) return json({ error: `This note can't be published: ${reasons.join("; ")}.`, status: "rejected", reasons }, 422);
  const now = Date.now();
  const note: StoredNote = {
    id: randomUUID(), roadId, stopId, text: clean, createdAt: now,
    approveAt: now + REVIEW_MS, ownerToken: ownerToken as string | undefined,
  };
  notes.push(note);
  const forRoad = notes.filter((n) => n.roadId === roadId);
  if (forRoad.length > MAX_PER_ROAD) notes.splice(notes.indexOf(forRoad[0]), 1);
  return json({ id: note.id, status: "review", note: publicNote(note, note.ownerToken ?? null, now), reviewSimulated: true }, 201);
}

export async function DELETE(req: Request) {
  const body = await bodyOf(req);
  if (body instanceof Response) return body;
  if (body.action === "reset-demo") {
    notes.splice(0);
    rate.clear();
    return json({ reset: true });
  }
  if (typeof body.id !== "string" || !validToken(body.ownerToken)) return json({ error: "Invalid withdrawal" }, 400);
  const index = notes.findIndex((n) => n.id === body.id && n.ownerToken === body.ownerToken);
  if (index < 0) return json({ error: "Note not found" }, 404);
  if (notes[index].approveAt <= Date.now()) return json({ error: "This note is already approved. Undo is only available while in review." }, 409);
  notes.splice(index, 1);
  return json({ withdrawn: true });
}
