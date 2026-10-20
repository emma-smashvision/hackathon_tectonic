import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { notePasses } from "../../../hindsight/engine/moderation";
import { getRoad } from "../../../hindsight/engine/roads";

// "Pass it on" notes.
// - The server re-runs moderation; it never trusts the client's checks.
// - Only roadId, stopId and text are accepted; ids and times are set here.
// - Nothing identifying is stored: no account id, no IP (the rate limiter keeps a salted hash, in memory only).
// - A note is "in review" first. In this demo a reviewer approval is simulated after REVIEW_MS;
//   in production this is a human moderation queue.

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
}

const g = globalThis as unknown as { __hsNotes?: StoredNote[]; __hsRate?: Map<string, number[]>; __hsSalt?: string };
const notes = (g.__hsNotes ??= []);
const rate: Map<string, number[]> = (g.__hsRate ??= new Map<string, number[]>());
const salt = (g.__hsSalt ??= randomUUID());

async function clientKey(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex").slice(0, 24);
}

function limited(key: string): boolean {
  const now = Date.now();
  const hits = (rate.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rate.set(key, hits);
    return true;
  }
  hits.push(now);
  rate.set(key, hits);
  return false;
}

const noStore = { "cache-control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roadId = url.searchParams.get("road") ?? "";
  if (!getRoad(roadId)) return NextResponse.json({ error: "Unknown road" }, { status: 400, headers: noStore });
  const now = Date.now();
  const list = notes
    .filter((n) => n.roadId === roadId && n.approveAt <= now)
    .slice(-40)
    .reverse()
    .map((n) => ({ id: n.id, roadId: n.roadId, stopId: n.stopId, text: n.text, createdAt: n.createdAt }));
  return NextResponse.json({ notes: list }, { headers: noStore });
}

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415, headers: noStore });
  }
  const key = await clientKey(req);
  if (limited(key)) {
    return NextResponse.json({ error: "Too many notes. Try again in a minute." }, { status: 429, headers: noStore });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Too long" }, { status: 413, headers: noStore });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
  }
  const { roadId, stopId, text } = (body ?? {}) as Record<string, unknown>;
  if (typeof roadId !== "string" || typeof text !== "string" || (stopId !== null && typeof stopId !== "string")) {
    return NextResponse.json({ error: "Invalid note" }, { status: 400, headers: noStore });
  }
  const road = getRoad(roadId);
  if (!road || road.status !== "live") return NextResponse.json({ error: "Unknown road" }, { status: 400, headers: noStore });
  if (stopId !== null && !road.stops.some((s) => s.id === stopId)) {
    return NextResponse.json({ error: "Unknown stop" }, { status: 400, headers: noStore });
  }
  const clean = text.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!notePasses(clean)) {
    return NextResponse.json(
      { error: "This note can't be published: keep it short, without names, amounts, places or contacts." },
      { status: 422, headers: noStore },
    );
  }
  const note: StoredNote = {
    id: randomUUID(),
    roadId,
    stopId: (stopId as string | null) ?? null,
    text: clean,
    createdAt: Date.now(),
    approveAt: Date.now() + REVIEW_MS,
  };
  notes.push(note);
  const forRoad = notes.filter((n) => n.roadId === roadId);
  if (forRoad.length > MAX_PER_ROAD) notes.splice(notes.indexOf(forRoad[0]), 1);
  return NextResponse.json({ id: note.id, status: "review" }, { status: 201, headers: noStore });
}
