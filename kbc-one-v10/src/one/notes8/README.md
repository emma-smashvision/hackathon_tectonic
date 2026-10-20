# Pass it on · v8

Synthetic hackathon notes, shared by road and stop on the Next server. Review is
simulated after 5 seconds, on the server clock. No KBC customer data or human
review is implied. Storage is process memory (survives hot reload, not a server
restart); run one server for the demo. No external service is used.

## Component contract

```tsx
import { NotesList, PassItOn } from "./notes8";

<NotesList roadId={road.id} stopId={stop.id} personId={person.key} />
<PassItOn
  roadId={road.id}
  stopId={stop.id}
  personId={person.key}
  hasPassedStop={hasPassedStop}
  hasCompletedRoad={hasCompletedRoad}
/>
```

- `roadId: string`: stable crowd catalogue road ID.
- `stopId?: string | null`: stable stop ID; absent/null means a road-level note.
- `personId: string`: local demo persona key, never sent to the server. Each
  persona gets an opaque ownership token in localStorage, so pending notes are
  private to that persona and persist across component mounts/reloads.
- PassItOn: `hasPassedStop?: boolean`, `hasCompletedRoad?: boolean`. Either
  enables the form; road-level notes require a completed road. These are demo UI
  eligibility flags, not authenticated authorization. Defaults are false.
- PassItOn: `demoAlumnus?: boolean`, `onDemoAlumnusChange?: (on: boolean) => void`
  optionally control jury mode. Otherwise the component owns its labelled toggle.
- PassItOn: `starterText?: string`, editable, never automatically submitted.
- Both: `className?: string`, `large?: boolean` for Large & simple.
- NotesList: `includeRoadNotes?: boolean` (default true), also shows general notes
  for this road, labelled “Whole road”. It never shows notes for another stop.

The components import their own CSS module. No provider is required. Both poll
every second and refresh on a local mutation event. Pending notes are shown only
to their owner; approved notes appear for all personas, newest first. Undo is
available only until the server's review deadline. ResetDemoNotesButton is the
small Director integration; it clears server notes and the rate limiter.

## HTTP contract (`/api/notes`)

Existing callers retain `GET ?road=<id>` (all approved notes on that road) and
`POST {roadId, stopId: string|null, text}` → `201 {id, status: "review"}`.
Additional response fields are additive.

- GET `?road=<id>&stop=<id>&includeRoad=true` selects one stop plus road-level
  notes. `stop=` selects only road-level notes. Omit `stop` for legacy all stops.
- Optional `x-notes-owner` opaque token includes that owner's pending notes and
  sets `own` on their notes. Public reads never expose ownership tokens.
- POST JSON `{roadId, stopId?, text, ownerToken?}` validates the road/stop pair,
  normalizes whitespace, runs the existing moderation engine, and returns
  `{id, status: "review", note}`. The token is an optional random UUID; old clients
  need none. The public note includes `status`, `createdAt`, and `reviewAt`.
- Rejection: `422 {error, status: "rejected", reasons: string[]}` with the failed
  moderation rules. Invalid road/stop/body → 400; non-JSON → 415; oversized body
  → 413; more than 5 submissions per minute → 429.
- DELETE JSON `{id, ownerToken}` withdraws an owner's pending note (200).
  Unknown/not-owned → 404; review already complete → 409.
- DELETE JSON `{action: "reset-demo"}` resets all submitted demo notes and rate
  limits (200). This is an intentionally unauthenticated demo-only control.
- All responses are `no-store`. Review status uses the server clock; browsers
  cannot approve a note. Ownership is a bearer capability, not customer auth.

## Demo

Karim's completed First home → energy-settlement → edit and submit a line.
Wait for “Approved”, switch to Sofie & Pieter, and open the same stop. The same
note appears. For Moving house / energy-new-address use the labelled demo
alumnus toggle, then return to Tom. Reset demo notes in Director between runs.

## Verification

`bun test src/one/notes8/notes.test.ts` exercises the real route handlers with
controlled server time: moderation reasons and boundaries, legacy contract,
private pending notes, cross-persona approval, exact stop and road-level filters,
newest-first order, ownership checks, deadline races, reset and rate limits.
The shared catalogue tests include `everyday-only/december` and
`freelance/company`, as well as the two pitch roads.

Headless Chromium on port 3504 verified the real components and HTTP endpoint
using a temporary isolated component harness (removed after the check): Karim
submit → Sofie reads after review; alumnus on Moving house → Tom reads; pending
privacy, reload ownership, moderation rejection, Undo and reset. All six persona
views were checked, including Margaret at 390px without horizontal overflow.
Screenshots `docs/screenshots/v8-notes-*.png` identify the component harness.
No external API or human moderation was used.

The integrated app was then verified after merging WS-B/WS-C/WS-E: Karim → All
roads → describe a situation → First home → energy settlement → submit → In
review; switch the real stage persona to Sofie → the same stop shows Approved.
Moving house / Tom and the actual Director reset button also passed. The browser
added 1,400 ms to every notes GET (longer than the 1-second poll interval) to
regress the slow-response case. Polls never overlap; a mutation cancels stale
reads and immediately shows the server's submission receipt. No page errors.
The 5 `v8-notes-app-*.png` screenshots show the real app, not the harness.

Repeat from `kbc-one-v8` with `KBC_AI=off bunx next dev -p 3504`, then run
`node src/one/notes8/browser-check.cjs`. Install Playwright or set
`PLAYWRIGHT_MODULE` to an existing Playwright module path; `CHROMIUM_PATH` is an
optional installed browser path. The script resets submitted demo notes at the
start and end. The API tests remain independent of browser tooling.
