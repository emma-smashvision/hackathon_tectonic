import { beforeEach, afterEach, expect, spyOn, test } from "bun:test";
import { DELETE, GET, POST } from "../../app/api/notes/route";
const author = "author-opaque-token-test", reader = "reader-opaque-token-test";
const req = (body: unknown, method = "POST") => new Request("http://localhost/api/notes", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const read = async (token = reader) => (await (await GET(new Request("http://localhost/api/notes?road=moving-house&stop=energy-new-address", { headers: { "x-notes-owner": token } }))).json()).notes;
const vote = (id: string, ownerToken = reader) => POST(req({ action: "useful", id, ownerToken }));
const create = async () => (await (await POST(req({ roadId: "moving-house", stopId: "energy-new-address", text: "Photograph the meters before unpacking your boxes.", ownerToken: author }))).json()).note;
let now: number; let clock: ReturnType<typeof spyOn>;
beforeEach(async () => { now = 1_800_000_000_000; clock = spyOn(Date, "now").mockImplementation(() => now); await DELETE(req({ action: "reset-demo" }, "DELETE")); });
afterEach(() => { clock.mockRestore(); });
test("useful feedback requires review approval and a different reader", async () => {
  const note = await create(); expect(note.usefulCount).toBe(0);
  expect((await vote(note.id)).status).toBe(409); now += 5000;
  expect((await vote(note.id, author)).status).toBe(409); expect((await vote("unknown")).status).toBe(404);
  expect((await vote(note.id, "bad")).status).toBe(400); expect((await read())[0].usefulCount).toBe(0);
});
test("reads do not count; explicit feedback is idempotent and visible to the author", async () => {
  const note = await create(); now += 5000; await read(); await read(); expect((await read())[0].usefulCount).toBe(0);
  const first = await (await vote(note.id)).json(); expect(first.note.usefulCount).toBe(1); expect(first.note.usefulByMe).toBe(true);
  expect((await (await vote(note.id)).json()).note.usefulCount).toBe(1);
  expect((await (await vote(note.id, "another-opaque-reader-token")).json()).note.usefulCount).toBe(2);
  const mine = (await read(author))[0]; expect(mine.own).toBe(true); expect(mine.usefulCount).toBe(2); expect(mine.usefulByMe).toBe(false);
  expect(mine.ownerToken).toBeUndefined(); expect(mine.usefulBy).toBeUndefined(); expect(JSON.stringify(mine)).not.toContain(reader);
});
test("reset removes feedback and old notes cannot regain lanterns", async () => {
  const note = await create(); now += 5000; await vote(note.id); await DELETE(req({ action: "reset-demo" }, "DELETE"));
  expect(await read()).toEqual([]); expect((await vote(note.id)).status).toBe(404);
});
test("new votes are rate limited while repeat votes remain idempotent", async () => {
  const note = await create(); now += 5000;
  for (let i = 0; i < 5; i++) expect((await vote(note.id, `reader-number-${i}-opaque-token`)).status).toBe(200);
  expect((await vote(note.id, "reader-over-limit-opaque-token")).status).toBe(429);
  expect((await vote(note.id, "reader-number-0-opaque-token")).status).toBe(200); expect((await read())[0].usefulCount).toBe(5);
});

test("concurrent useful retries produce one event", async () => {
  const note = await create(); now += 5000;
  const results = await Promise.all(Array.from({ length: 8 }, () => vote(note.id)));
  expect(results.every(response => response.status === 200)).toBe(true);
  expect((await read())[0].usefulCount).toBe(1);
});
