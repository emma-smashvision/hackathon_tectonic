import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { DELETE, GET, POST } from "../../app/api/notes/route";
import { checkNote } from "../../hindsight/engine/moderation";
import { pointersFor, roadViewFor } from "../crowd";
import { canPassItOn } from "./types";

const karim = "karim-opaque-token-for-tests";
const sofie = "sofie-opaque-token-for-tests";
const valid = "Photograph the meters before you unpack the boxes.";
const request = (body: unknown, method = "POST") => new Request("http://localhost/api/notes", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const read = (query = "road=first-home&stop=energy-settlement", token?: string) => GET(new Request(`http://localhost/api/notes?${query}`, { headers: token ? { "x-notes-owner": token } : {} }));
const post = (extra: Record<string, unknown> = {}) => POST(request({ roadId: "first-home", stopId: "energy-settlement", text: valid, ownerToken: karim, ...extra }));
const reset = () => DELETE(request({ action: "reset-demo" }, "DELETE"));
let now = 1_800_000_000_000;
let clock: ReturnType<typeof spyOn>;
beforeEach(async () => { now = 1_800_000_000_000; clock = spyOn(Date, "now").mockImplementation(() => now); await reset(); });
afterEach(() => { clock.mockRestore(); });

describe("notes moderation and legacy contract", () => {
  test("legacy submission stays in review, then appears in the road feed", async () => {
    const response = await post({ ownerToken: undefined });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.status).toBe("review");
    expect((await (await read("road=first-home")).json()).notes).toEqual([]);
    now += 5000;
    const notes = (await (await read("road=first-home")).json()).notes;
    expect(notes[0]).toMatchObject({ id: data.id, text: valid, status: "approved", own: false });
    expect(notes[0].ownerToken).toBeUndefined();
  });
  test.each([
    ["short", "12–160 characters"],
    ["x".repeat(161), "12–160 characters"],
    ["Ask Sofie before you sign the papers.", "No names"],
    ["Keep €500 aside for the first bill.", "No amounts"],
    ["Check the papers before moving to Brussels.", "No places"],
    ["See https://example.com for more details.", "No links or contacts"],
  ])("explains why a note was rejected: %s", async (text, reason) => {
    const response = await post({ text });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.status).toBe("rejected");
    expect(body.reasons).toContain(reason);
    now += 5000;
    expect((await (await read()).json()).notes).toEqual([]);
  });
  test("moderation accepts both length boundaries", () => {
    expect(checkNote("a".repeat(12)).every((c) => c.pass)).toBe(true);
    expect(checkNote("a".repeat(160)).every((c) => c.pass)).toBe(true);
  });
  test("normalizes lines and markup before server moderation", async () => {
    const response = await post({ text: " Photograph\n the meters <before> you unpack. " });
    expect((await response.json()).note.text).toBe("Photograph the meters before you unpack.");
  });
  test("validates JSON and the road/stop pair", async () => {
    expect((await POST(request(null))).status).toBe(400);
    expect((await post({ roadId: "unknown" })).status).toBe(400);
    expect((await post({ stopId: "energy-new-address" })).status).toBe(400);
    expect((await POST(new Request("http://localhost/api/notes", { method: "POST", body: "hello" }))).status).toBe(415);
    expect((await POST(request({ text: "x".repeat(2100) }))).status).toBe(413);
    expect((await read("road=first-home&stop=energy-new-address")).status).toBe(400);
  });
});

describe("shared road and stop identity", () => {
  test("Karim to Sofie: pending is private; approved is shared at the same stop", async () => {
    const created = await (await post()).json();
    expect((await (await read(undefined, karim)).json()).notes[0]).toMatchObject({ status: "review", own: true });
    expect((await (await read(undefined, sofie)).json()).notes).toEqual([]);
    expect((await (await read()).json()).notes).toEqual([]);
    now += 5000;
    const next = (await (await read(undefined, sofie)).json()).notes[0];
    expect(next).toMatchObject({ id: created.id, text: valid, status: "approved", own: false });
    expect((await (await read()).json()).notes[0].id).toBe(created.id);
    expect((await (await read("road=first-home&stop=first-repair", sofie)).json()).notes).toEqual([]);
    expect((await (await read("road=moving-house&stop=energy-new-address", sofie)).json()).notes).toEqual([]);
  });
  test("the shared model keeps Karim completed, Sofie exploring, and Tom before his stop", () => {
    expect(pointersFor("karim").past.some((p) => p.roadId === "first-home")).toBe(true);
    expect(roadViewFor("sofie", "first-home")?.position.preview).toBe(true);
    expect(roadViewFor("tom")?.stops.find((s) => s.stopId === "energy-new-address")?.passed).toBe(false);
  });
  test.each([["everyday-only", "december"], ["freelance", "company"]])("accepts shared catalogue identity %s / %s", async (roadId, stopId) => {
    const response = await post({ roadId, stopId });
    expect(response.status).toBe(201);
    now += 5000;
    expect((await (await read(`road=${roadId}&stop=${stopId}`)).json()).notes[0]).toMatchObject({ roadId, stopId, status: "approved" });
  });
  test("Tom's Moving house feed uses its own stable stop id", async () => {
    const created = await (await post({ roadId: "moving-house", stopId: "energy-new-address" })).json();
    now += 5000;
    expect((await (await read("road=moving-house&stop=energy-new-address", sofie)).json()).notes[0].id).toBe(created.id);
    expect((await (await read()).json()).notes).toEqual([]);
  });
  test("road-level notes are explicit and approved notes are newest first", async () => {
    const first = await (await post()).json();
    now += 1;
    const road = await (await post({ stopId: null, text: "Keep the paperwork together before the next step." })).json();
    now += 1;
    const last = await (await post()).json();
    now += 5000;
    const exact = (await (await read()).json()).notes.map((n: { id: string }) => n.id);
    expect(exact).toEqual([last.id, first.id]);
    const combined = (await (await read("road=first-home&stop=energy-settlement&includeRoad=true")).json()).notes.map((n: { id: string }) => n.id);
    expect(combined).toEqual([last.id, road.id, first.id]);
    expect((await (await read("road=first-home&stop=")).json()).notes.map((n: { id: string }) => n.id)).toEqual([road.id]);
  });
});

describe("withdraw and reset", () => {
  test("only the owner can withdraw, and a withdrawn note never becomes public", async () => {
    const { id } = await (await post()).json();
    expect((await DELETE(request({ id, ownerToken: sofie }, "DELETE"))).status).toBe(404);
    expect((await DELETE(request({ id, ownerToken: karim }, "DELETE"))).status).toBe(200);
    now += 5000;
    expect((await (await read()).json()).notes).toEqual([]);
  });
  test("withdraw closes at the review deadline", async () => {
    const { id } = await (await post()).json();
    now += 5000;
    expect((await DELETE(request({ id, ownerToken: karim }, "DELETE"))).status).toBe(409);
    expect((await (await read()).json()).notes).toHaveLength(1);
  });
  test("reset removes approved and pending notes on every road and clears rate limits", async () => {
    await post();
    now += 5000;
    await post({ roadId: "moving-house", stopId: "energy-new-address" });
    await post(); await post(); await post();
    expect((await post()).status).toBe(429);
    expect((await reset()).status).toBe(200);
    expect((await (await read(undefined, karim)).json()).notes).toEqual([]);
    expect((await (await read("road=moving-house", karim)).json()).notes).toEqual([]);
    now += 5000;
    expect((await (await read()).json()).notes).toEqual([]);
    expect((await post()).status).toBe(201);
  });
  test("eligibility requires a passed stop, completed road, or explicit demo alumnus", () => {
    expect(canPassItOn("energy-settlement", false, false, false)).toBe(false);
    expect(canPassItOn("energy-settlement", true, false, false)).toBe(true);
    expect(canPassItOn(null, true, false, false)).toBe(false);
    expect(canPassItOn(null, false, true, false)).toBe(true);
    expect(canPassItOn("energy-settlement", false, false, true)).toBe(true);
  });
});
