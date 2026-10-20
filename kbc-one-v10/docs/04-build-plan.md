# 04 · Build plan

## Assumptions

- The final is on **Tue 20 Oct** (from the project doc "One KBC — competitive analysis"). That leaves Sunday 18 and Monday 19.
- Two builders (Thomas and Emma), each working with Claude. Estimates are focused hours and are rough.
- The existing apps stay untouched and runnable. If KBC One is not stable by the morning of the 20th, we present the Kate home and Hindsight side by side as two views of the same vision.
- **Nothing gets committed** (Thomas, 18 Oct): no commits, branches or other git writes in the existing repos or worktrees. `kbc-one/` is new, untracked work.
- Still open from earlier: which pre-built code the organisers allow in the final.

## Build status (v5, 18 Oct)

v5 is built in this folder and runs on **localhost:3200** (`bun install && bun dev`). It was built as one track in the cloud workspace, so the folder layout is simpler than phase 0 planned: `src/kbc` (Kate), `src/hindsight` (Hindsight v4) and `src/one` (the bridge) instead of `src/now`, `src/road`, `src/bridge`.

| Phase | Status | What v5 has | Not yet |
|---|---|---|---|
| 0 Scaffold | Done | One Next.js 16 app (bun, port 3200), Hindsight's security headers, `SOURCES.md`, both apps' CSS scoped so they share one page | `src/bridge/types.ts` as a separate contract |
| 1 One person | Done | Six people, each a Kate persona + household + road (`src/one/people.ts`); `computeLife()` takes the household; Everyday-only road; Moving house road for Tom; Nadia; consistency tests | `core/ledger.ts`, `core/clock.ts` |
| 2 Road on the Home | Partly | Look-ahead cards (told, crossroads ≤ 6 months, unprepared bump ≤ 6 weeks, test drive) with a one-tap tip; the care home; the road line under the story | Blocks `road_ahead`, `buffer`, `cover_check`; road actions through `checkAction()` |
| 3 Road tab | Done | Road in the nav; Hindsight's Today, Route, Road, stop, crossroads, Pass it on screens in the customer's theme (pink checked); plain words for Large & simple | `/api/one/*` (the road state is in the browser) |
| 4 Kate knows the road | Partly | Gated road facts in Kate's facts; the `drive` proposal checked in code; care rules; the grounding check on every reply | Proposals `pot`, `goal`, `road`; checked with the rules fallback, not yet with the five examples on real `claude -p` |
| 5 Salary day | Partly | Director → salary day closes the month on the road and shows Hindsight's recap | Kate's month (transactions, balances, requests) and recomposing the Home afterwards |
| 6 Landscape phone | Done | Turn, grow, power on, City on the screen at full size (container queries); sandbox drive with "Make this my plan" / "Leave it" / "Keep driving"; Esc; reduced motion; City preloaded | Salary-day autopilot in the landscape phone |
| 7 Stage | Mostly | v1's portrait rail and animated story, tour and Inside tools, the drawer with Inside Kate, Behind the glass and Director; Nadia's portrait | Month slider, lock screen and gate overlay in Director; merged `SECURITY.md`; biome and the readability check on the KBC One screens; rehearsal on the stage laptop |

Checks: `bun run test` (22 Kate tests, then 36 Hindsight and KBC One tests), `bun run typecheck`. Every person's way into the game was walked through in a headless browser at 1440 × 900, and Tom's drive also at 1920 × 1080.

## Build status (your world, 18 Oct evening)

Built from the plan "unique roads, your own world, Market Mile and the trip loop" (steps 1–4 of 5):

| Step | Status | What it has | Not yet |
|---|---|---|---|
| 1 Trip loop + My plan | Done | Every tip is a typed follow-up (`src/hindsight/engine/plan.ts`); the glovebox; the debrief on the way out (`src/one/TripDebrief.tsx`) with slots for your advisor and KBC Live; My plan on Today and Route; "Your plan" card on the Home | Pins and flags on the Everyday Road at their dates; real execution |
| 2 Your neighbourhood | Done | `WorldDef` per person (`src/one/people.ts`), places and their panels (`engine/world.ts`, `game/hud/PlacePanel.tsx`), Home Street (`game/streets.ts`, `game/scene/Places.tsx`), Hide amounts | A car loan and omnium example; Margaret in plain words |
| 3 Market Mile v1 | Done | Monthly series solved to match the app's values, towers (stone, lit, scaffolding), plaque, DEMO news, weather, today line and fog; the guardrail test | Crowd hindsight at a dip (compliance), a licensed news feed |
| 4 Landmarks | Done | `game/landmarks.ts` and `game/scene/Landmarks.tsx`: 12 avenue landmarks and 5 civic buildings on the ring, kept free in `cityGen`, on the minimap and in the label layer | Their own stops and signature moments |
| 5 Street kits | Not built | — | Payslip toll gate, studio toll booths, energy meter totem, … |

Checks: 22 Kate tests, then 56 Hindsight and KBC One tests (new: `plan.test.ts`, `world.test.ts`, `landmarks.test.ts`), typecheck. Walked through in a headless browser at 1440 × 900 for Tom (flat, garage, debrief), Karim (house, vault, pension tree, Market Mile, landmarks, bird's eye), Lina (flat, Noor's account) and Sofie (the plot, a reminder for Ellen's appointment).

## Phases

| Phase | What | Who | Hours | Depends on |
|---|---|---|---|---|
| 0 | Contract and scaffold | both | 2 | — |
| 1 | One person, one money truth | B | 5 | 0 |
| 2 | The road on the Home | A | 5 | 0 (contract), 1 (real data) |
| 3 | The Road tab | B | 4 | 1 |
| 4 | Kate knows the road | A | 4 | 1, 2 |
| 5 | Salary day, the monthly bridge | A | 3 | 1, 3 |
| 6 | The driving world on the phone (landscape) | B | 5 | 3 |
| 7 | v1 stage, cast, checks, rehearsal | both | 5 | all |
| | **Total** | | **≈ 33 h** (about 16–18 h each) | |

Builder A works on the Kate side (Home, Kate, recap), builder B on the road side (data, Road tab, City). The contract in phase 0 lets both start at once.

## Phase 0 · Contract and scaffold (2 h, both)

- **No commits.** Copy the `kate-adaptive-home` worktree files as they are (including the uncommitted round-two work) and write `kbc-one/SOURCES.md`: base commit `6b809a9`, the changed and new files, the copy date. Read-only git commands only (`--no-optional-locks`), so no lock files are left behind.
- Create the app in `kbc-one/`: copy the Kate worktree's `src/kbc/` (→ `src/now`, `src/server`, `src/ui`), its API routes and `public/characters/`; copy Hindsight's `src/engine/` (→ `src/road`), `src/components/` and `src/game/`; copy v1's stage from `hackathon_tectonic/src/components/prototype/` and the `.stage-*`, `.story-*`, `.signal-*`, `.phone-*`, `.cast-*` and `.engine-drawer` rules from `src/app/globals.css`.
- One `package.json` (bun): the Kate dependencies plus `three`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`, the `@fontsource` fonts and `tsx`. Port **3200**. Hindsight's security headers in `next.config.ts`.
- Write `src/bridge/types.ts`: `Person`, `RoadFacts`, `RoadCandidate`, `RoadAction`. Both builders code against it.
- Check the copy against the source with a file count on the Mac side. (While investigating, the session's Linux view of the worktree did not list `public/characters/tom.svg`, although it is on disk.)
- **Done when** :3200 shows the Kate stage, a temporary `/city` shows Hindsight City, `bun test` and `tsx --test` both pass, typecheck is clean.

## Phase 1 · One person, one money truth (5 h, B)

- `src/core/person.ts`, `src/core/ledger.ts`, `src/core/clock.ts`.
- `src/people/`: Tom, Lina, Margaret, Karim, Sofie (household written from their Kate data) and Nadia (new minimal Kate persona + the Losing a parent household).
- `road/life.ts`: household passed in instead of `lifeFor(roadId)`; `EVERYDAY_ONLY` road; rename the clashing road personas.
- New road `moving-house` for Tom (D4): stops such as the rental deposit, overlapping rent, the first energy bill at the new address, the old deposit coming back, address changes; a crossroads near month 10 ("keep renting or start a home fund"). Crowd parameters are illustrative, like every other road.
- Tests: household ↔ Kate consistency for all six; money only moves; Hindsight's 29 tests still pass after the signature change.
- **Done when** `computeLife()` works for all six people, including Everyday-only (Lina, Margaret).

## Phase 2 · The road on the Home (5 h, A)

- New blocks `road_ahead`, `buffer`, `cover_check` in Calm, Cards, Dense and Large & simple.
- Rework `left_until_payday` (+ lowest point), `upcoming_payments`, `savings_goal` / `home_buying` (+ ETA, odds, Automate), `coming_up` (Everyday Road) on top of the life state.
- Road actions `start_pot`, `park_boost`, `automate_goal`, `check_cover` with `ref` validation in `checkAction()`.
- `src/core/policy.ts`; composer: road candidates, look-ahead cards (their button calls the phone's landscape mode from phase 6; until then it opens the Road tab), `road` fact section, the three new prompt rules, `finalize()` limits, `RULE_RANK` entries.
- Tests: ≤ 1 road action, protection first, own layout never moved, care home has no suggestions or products.
- **Done when** Tom's home shows a road item with a one-tap pot, Margaret's Large & simple home shows it as one sentence and one button, and Nadia's home is calm.

## Phase 3 · The Road tab (4 h, B)

- Port `RouteView`, `GoalCard`, `StopView`, `ForkView`, `PassportView`, `NotesView`, `RecapView` and the cockpit parts into `src/ui/road/`; add Road to the nav (D3).
- Map Hindsight's CSS variables onto Kate's theme tokens; keep amber, mint and cyan for stops and check their contrast per theme. A plain-list version for Large & simple.
- `road_action` and `care_opt_in` through `/api/one/command`; `GET /api/one/road`.
- **Done when** the Road tab follows the customer's theme (Tom's pink), Get ready on the Road and on the Home give the same state, and the readability check passes for the Road tab.

## Phase 4 · Kate knows the road (4 h, A)

- `bridge/road-facts.ts` → `road` section in `kateFacts()`.
- Proposals `pot`, `goal`, `testdrive`, `road` in `validateProposal()` and `ProposalCard`.
- Prompt rules: no prediction wording; care.
- Port `parseModelReply()` from `hackathon_tectonic/src/lib/kate/respond.ts` and extend the allowed numbers to the road facts.
- Tests: each proposal type valid and invalid; care rejects `pot`; an invented amount falls back.
- **Done when** the five Kate examples in `02-product.md` work with real `claude -p`.

## Phase 5 · Salary day, the monthly bridge (3 h, A)

- `salary_day` command: live the month (ledger events, generated transactions for Recent activity), journey month + 1, `persona.now` → the next salary day.
- One recap: Kate's month (requests paid back, rules that ran, tracker totals) + Hindsight's `buildRecap()` (in/out, stops paved or hit, fuel before → after, destinations, coming up).
- Recompose the home afterwards. A finished road stamps the passport and merges back onto the Everyday Road.
- **Done when** salary day works twice in a row for Tom and once for Karim, with tests.

## Phase 6 · The driving world on the phone (5 h, B)

- `ui/phone/PhoneStage`: portrait → turning → powering-on → playing → powering-off → returning; FLIP rotation; target size from the stage (D9); the screen "turns on" before the City mounts; no transforms while playing; bezel button and Esc to go back; reduced-motion crossfade.
- Make the City container-sized: `.city` height 100% with `container-type: size`, `100vw` → `100cqw`, HUD media queries → container queries; check the HUD at the lower landscape height.
- Store adapter over the KBC One snapshot; a sandbox journey for drives (D2); `pendingDrive` starts the drive at the stop that triggered it.
- **Make this my plan** → one `plan` command (tips, goal paces, branch), each item re-validated.
- Entry points: Look ahead on the Road tab, Drive it on the large Road ahead block, look-ahead cards from phase 2 (confirmed life event, crossroads ≤ 6 months, unprepared bump ≤ 6 weeks, about to enter a road), Kate `testdrive`; the salary-day autopilot plays in the landscape phone.
- Preload the City chunk when the Road tab or a look-ahead card shows.
- **Done when** Tom's and Karim's look-ahead steps in the demo script work end to end at 1440 × 900 and 1920 × 1080, labels stay inside the screen without overlaps, and leaving without "Make this my plan" changes nothing.

## Phase 7 · v1 stage, cast, checks, rehearsal (5 h, both)

- Stage from v1: the animated story on the left, the phone in the middle, the portrait rail on the right with two tools (tour, Inside). Port v1's component and CSS, not Kate round two's variant.
- One cast entry per person (avatar, name, role, KBC noticed, outcome, the road line, optional badge). A portrait for Nadia in `public/characters/`.
- v1's drawer with three tabs: Inside Kate, Behind the glass, Director (salary day, month slider, re-arrange, reset, lock screen, gate overlay). Atlas and Adviser stay as views. No road dropdown, no Director persona list.
- The rail fades while the phone is in landscape; picking a person exits the drive first.
- Tour mode following the demo script in `02-product.md`.
- Extend `check:readability`; merge the two security notes into one `SECURITY.md`; a run guide in `kbc-one/README.md`.
- Rehearse on the stage laptop (3D frame rate; `?fx=0` as backup).
- **Done when** the demo script runs twice without a fault, and tests, typecheck, biome and the readability check pass.

## Cut lines, in order

If we fall behind, cut from the top:

1. **Saving from the drive** ("Make this my plan"): the drive is a pure preview (like v4's test drives, which never change state); the customer prepares from the pull-over panel's tip on the Road tab or Home instead.
2. **Moving-house road**: Tom stays on the Everyday Road; his look-ahead step uses December spending or the January renewals instead of his move.
3. **Nadia as a full persona**: show care on the Road tab with Hindsight's care roads only.
4. **Generated transactions for lived months**: Recent activity stays as seeded; the recap still works.
5. **Large & simple Road tab**: show the normal Road tab with large text.

Never cut: the one-person model, the tailored home with the customer's own theme, road items on the Home with one tap, entering the driving world in the landscape phone, v1's profile switcher, gated road facts for Kate, the care policy, the grounding check.

## After the final

- Full ledger: every Kate block (spending, trackers) reads lived months.
- Weak-signal on-ramps: round one's question rule (25–60% → ask) as the way onto a life road.
- Two life roads at once (First child while on First home) as two lanes.
- Road reminders as opt-in pushes with the secure push pattern (generic text, opaque id, unlock to view).
- An optional "Cockpit" style for the Home.
- Adviser desk with Kate's context, the road and the customer-visible access log, behind consent.
- NL / FR, real authentication, server-side placement, Aikido before/after.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ≈ 33 h of work in two days | High | Contract first, two parallel tracks, cut lines, untouched originals as fallback |
| The City inside a frame misplaces labels or input | Medium | Rotate with a transform only during the turn; mount the canvas after it; real width and height while playing; readability scenes at both laptop sizes |
| The landscape phone is lower than today's full-screen City | Medium | Container queries for the HUD; check the left column, sheets and intro at about 670 px high |
| Compose gets slower with road facts (10–15 s today) | Medium | Cap the road section, cached home first, rules fallback |
| Kate data and household drift apart | Medium | Consistency tests per person, one seed |
| Two metaphors (bubbles and roads) confuse the jury | Medium | Plain words on Home; the car only on Road and in the City; one line: "Home is today, Road is your future, Kate connects them" |
| 3D frame rate on the stage laptop | Medium | `?fx=0`, rehearse on that laptop |
| Organisers' rules on pre-built code | Unknown | Ask before the final |
| Uncommitted Kate round-two work gets lost | Low, high impact | We don't commit (D1). The copy in `kbc-one/` plus `SOURCES.md` is a second copy of that work |
| The root repo's `tsconfig`/`biome` include `**/*` and may pick up `kbc-one/` | Low | Run checks inside `kbc-one/`; adding an exclude to the root config is a change to an existing file, so only with your go |

## Decisions we need

| # | Decision | Recommendation |
|---|---|---|
| D1 | Commit the `kate-adaptive-home` worktree? | **Decided: no** (Thomas). Copy it as it is; `SOURCES.md` records the source |
| D2 | What driving in the City does | Preview: driving looks ahead, "Make this my plan" saves, real time moves only on salary day |
| D3 | Bottom navigation | Home · Accounts · Kate · Road · More (Payments stay in the core bar) |
| D4 | Tom's road | A new Moving house road (≈ 2 h of data); fallback: Everyday Road only |
| D5 | Karim's road | Going freelance at month 20: the sole trader / company crossroads is 4 months ahead, the regularisation 10 |
| D6 | Care persona | Nadia (Losing a parent); alternative Ann (Separation) |
| D7 | Where the car metaphor lives | Road tab and City only; plain words on Home; never in Large & simple |
| D8 | Stack | bun, port 3200, keep Hindsight's tests on `tsx --test` until they run under bun |
| D9 | Shape of the landscape phone | Ratio ≈ 2.05 (a real phone is ≈ 2.17) at about 95% of the screen width: about 1,370 × 670 px on a 1440 × 900 laptop |
| — | Profile switcher, own theme, landscape entry | **Decided** (Thomas): v1's cast rail; the home stays tailored with the customer's own theme; looking ahead and detections open the driving world in the landscape phone |
