# 03 · Architecture: one person, one money truth, two engines

## Principles

1. **Code computes, the model picks and writes, code checks.** (Kate build.) Every amount, date and forecast is computed by code. Claude chooses and words; validators decide what reaches the screen.
2. **Every crowd number passes the gate.** (Hindsight.) k ≥ 500, noise, rounding, logged. That now includes the numbers Kate sees.
3. **The past is the ledger, the future is the road.** Kate's blocks read what happened (transactions and money moves). Hindsight's replay projects what is ahead from today's balances. Salary day moves the line between them.
4. **One policy.** Care, products, pushes and attention budget are decided in one module that the Home, the Road, Kate and the City all ask.

## Folder layout (new app in `kbc-one/`)

```
kbc-one/
  package.json            bun · Next 16.3.7 · React 19.3 · three + R3F + postprocessing · fontsource
  next.config.ts          Hindsight's security headers
  src/
    app/                  page.tsx (the stage) · api/one/{home,kate,command,road} · api/notes
    core/        NEW      person.ts · ledger.ts · clock.ts · policy.ts
    people/      NEW      one file per cast member: Kate persona + household + road
    now/                  copied from the Kate worktree src/kbc/: blocks, actions, compose, kate, theme, format, json, types
    road/                 copied from hindsight-v4 src/engine/: roads, simulate, gate, game, everyday, lives, life, placement, moderation, rng
    bridge/      NEW      road-candidates · road-actions · road-facts · recap · onramps
    server/               from the Kate worktree: claude, http, service, store (+ road commands)
    ui/
      shell/              phone frame, nav, Kate sheet (split out of Kate's ui/App.tsx)
      phone/     NEW      PhoneStage: portrait ↔ landscape, power on/off, hosts the City
      home/               Kate's Blocks.tsx + the new road blocks in 4 grammars
      road/               Hindsight's components/phone, re-skinned with Kate's theme tokens
      stage/              v1 cast rail + animated story + drawer (from hackathon_tectonic/src/components/prototype/
                          and the .stage-cast… rules in src/app/globals.css) · Inspector, Atlas, Adviser (Hindsight)
    game/                 hindsight-v4 src/game/, container-sized, behind a store adapter
  tests/                  Kate tests · Hindsight tests · new bridge tests
  scripts/                readability-check.mjs (extended to the new screens)
```

Copy, never move: the existing folders stay runnable as a fallback for the final.

## One person

Today a Kate `Persona` has transactions but no future, and a Hindsight `LifeDef` is keyed by road. KBC One keys everything by person:

```ts
// src/core/person.ts
export type Person = {
  id: string;
  kate: Persona;              // now/types.ts: accounts, transactions, debits, goals, contacts, behaviour, beliefs…
  household: LifeDef;         // road/lives.ts: incomes, bills, spend, pots, goals, cover, yearly
  road: string | null;        // active life road id, or null = Everyday Road only
  roadMonth: number;          // journey month on that road today
  passport: { roadId: string; year: number }[];
};

// server state, one per person (extends Kate's Customer)
export type CustomerOne = Customer & {
  journey: Journey;           // road/game.ts; roadId = life road or "everyday-only"
  ledger: MoneyEvent[];       // every money move since the seed
  roadReminders: string[];    // roads with reminders switched on (opt-in pushes)
  access: AccessEntry[];      // who at KBC looked at the road
  stamps: { roadId: string; at: number }[];
  explored: string[];
};
```

**Consistency is tested, not hoped for.** For each person: household balance = Kate current account, savings pot = Kate savings, main income amount and day = `persona.salary`, every Kate direct debit has a household bill with the same amount and day, goals have the same ids and amounts.

## One money truth

```ts
// src/core/ledger.ts
type AccountId = "current" | "savings" | "business" | "pocketGBP" | `pot:${string}` | `goal:${string}`;
type MoneyEvent = { at: string; from: AccountId | "in"; to: AccountId | "out"; amount: number; label: string; source: "kate" | "road" | "lived" };

balances(c)  = seed balances (persona.accounts) + Σ ledger
computeLife(person, journey, balances(c))   // the replay starts from today's real balances
```

- A Kate action (`move_from_savings`, `set_aside_tax`, `refund_duplicate`…) writes a `MoneyEvent` instead of editing `persona.accounts` directly.
- A road tip creates a pot: its first transfer today is a `MoneyEvent` (source `road`); later transfers are projected by the replay.
- **Salary day** "lives" the month: the replay's day items for that month become transactions and `MoneyEvent`s (source `lived`), `persona.now` moves to the next salary day, the journey month moves by one. Kate's Recent activity then shows the month that was just lived.

For the final, a lighter version is enough (see the build plan): seed the household from the Kate balances, let Kate actions and road tips both write ledger events, and generate transactions for lived months only for Recent activity and spending.

## Engine changes (from `hindsight-v4/src/engine`)

| Change | Where | Why |
|---|---|---|
| `computeLife(road, journey)` → `computeLife(road, journey, household, seed)` | `road/life.ts` (`lifeFor(roadId)` is called once at the top today) | The household belongs to the person, not the road |
| `EVERYDAY_ONLY` road: a `RoadDef` with `stops: []` and a long horizon | `road/everyday.ts` | `occurrences()` already adds Everyday stops from the calendar, so an empty road gives an Everyday-only life (Lina, Margaret) |
| Finish a road → merge back onto the Everyday Road | `road/game.ts`, salary-day command | Fixes v4's "salary day stops after a road ends". Keep the calendar continuous: new anchor = old anchor − month. Everyday tips survive because their keys are calendar-based (`ev:<id>:<year>`) |
| New road `moving-house` (renting, new city) + Tom's household | `road/roads.ts`, `people/tom.ts` | Tom's move is the most common life road and our strongest "now + later" story (decision D4) |
| Rename clashing road personas | `road/roads.ts` | First child "Sofie" → Hanne, Losing your job "Tom" → Dries |
| `todayPick()` → `roadPick()` returning candidates instead of one pick | `bridge/road-candidates.ts` | The composer decides what reaches the Home |

The crowd simulation, the gate, the stop definitions and the Everyday calendar stay as they are.

## One action engine

Road tips become `ActionDef`s next to Kate's 13 actions (`now/actions.ts`). They need a reference to a stop, goal or cover item, so `ActionDef` gets an optional `ref` that `checkAction()` validates against the person's current life state.

| Action | Level | Params | Ref | Effect |
|---|---|---|---|---|
| `start_pot` | 1 (own money, with undo) | depends on the `potSpec()` kind: `amount` 5–1000 (monthly), `pct` (share of income), none (spread, target) | stop key + behaviour id | `journey.done`, `journey.doneAt`; first transfer as a ledger event |
| `park_boost` | 1 (a rule, revocable) | `pct` 10–100 | boost key | parks part of holiday pay or a bonus when it lands |
| `automate_goal` | 1 (own goal pot) | `amount` 10–2000, `day` 1–28 | goal id | `journey.goals[id] = { monthly, auto: true }` |
| `check_cover` | info only | — | cover id | marks the tyre as checked; never a sale |

Pre-filled amounts come from `potSpec()` (it already turns tip labels like "Set aside €45 a month" into pot specs). The same confirm sheet, safety level and undo apply whether the tap comes from Home, the Road tab, Kate or "Make this my plan" in the City.

## Composer (`now/compose.ts`)

- `candidates(c)` adds the road blocks (`road_ahead`, `buffer`, `cover_check`), the road actions from `roadPick()`, a `salary_day` intent on salary day, and **look-ahead cards** from `bridge/road-candidates.ts`: a confirmed life event, a crossroads within about 6 months, an unprepared bump within about 6 weeks, a road the customer is about to enter. A look-ahead card's button opens the driving world at that stop; it is never offered on a care road.
- `factSheet()` adds a compact `road` section (capped: 3 upcoming stops, 2 destinations), built by `bridge/road-facts.ts` from gated values only:
  ```json
  "road": { "life": "Going freelance, month 20 of 36", "everyday": "October",
            "buffer": { "months": 2.2, "peopleAtYourPoint": "2.3" },
            "upcoming": [{ "title": "Stay sole trader, or start a company?", "in": "about 4 months", "ready": 0 }],
            "destinations": [{ "label": "Tax reserve", "eta": "Jan 2027", "odds": "held back: too few drivers" }],
            "care": false }
  ```
- `COMPOSE_SYSTEM` gets three rules: at most one road action; road items are "now" only when a bump is close and unprepared; describe the road as what people before them lived, never as a prediction.
- `finalize()` enforces: ≤ 1 road action, road items below protection and the open-intent, no road actions or products when the policy says care, products on the road's `blocked` list dropped. `RULE_RANK` gets ranks for the new blocks so the rules fallback places them too.

## Kate (`now/kate.ts`)

- `kateFacts()` adds the same `road` section with more depth: the next 5 stops with their crowd lines, destinations with odds, likely next exits. Only gated values; held-back values are passed as "held back".
- Four new proposal types, each validated by `validateProposal()`:
  - `pot` → a `start_pot` or `park_boost` on a stop that is in the person's upcoming list;
  - `goal` → pace and automation within range;
  - `testdrive` → a live road (not pending), opened in the Road tab or the City; nothing changes;
  - `road` → join a life road, only when the customer said it in this message; never a care road.
- `KATE_SYSTEM` gets the wording rule ("people at your point", never "you will") and the care rule (a person first, no tips, a calm overview only when asked).
- **Grounding in code**: port `parseModelReply()` from round one (`hackathon_tectonic/src/lib/kate/respond.ts`). Any amount in Kate's reply must appear in her facts; otherwise retry once, then fall back to `kateFallback()`.

## Policy (`src/core/policy.ts`)

```ts
policy(c) → {
  care: boolean;            // active road is a care road
  careOptIn: boolean;       // the customer chose to look
  suggestionsPerDay: number;// 0 on a care road before opt-in
  products: boolean;        // false on care roads; max 1 mention a week otherwise
  blocked: string[];        // the road's blocked products
  roadActions: boolean;     // false on care roads
  game: boolean;            // City game layer off on care roads
  push: { protection: true; started: true; ownReminders: true; road: boolean };  // road only if switched on
}
```

Used by the composer, Kate's validator, the Road tab, the City and the lock screen.

## State and API

- **The server owns the customer's state** (`.data/kbc-one-state.json`, gitignored), including the journey. The Kate build already works this way; Hindsight kept the journey in the browser.
- The road engine is pure and runs on both sides: the client computes the life state from the snapshot to render fast; the server computes it again for the composer, Kate and validation. Same code, same numbers.
- Routes:
  - `GET /api/one/home` compose (cached home first, then recompose; as today)
  - `POST /api/one/kate` Kate stream (as today)
  - `POST /api/one/command` the only way state changes: Kate's commands + `road_action`, `care_opt_in`, `join_road`, `leave_road`, `reminders`, `plan` (from the City), `salary_day` (Director only)
  - `GET /api/one/road` life state + gated crowd views for the Road tab
  - `POST /api/notes` Hindsight's notes API, unchanged
- The persona id is validated on the server (`personaFrom()`); journeys sent from the City are never trusted, only the plan diff, and each item in it is re-validated.

## The driving world on the phone (landscape mode)

### State and data

- The City uses Hindsight's React store directly (`src/game/hud/*` → `useStore()`). Keep that interface and back it with a **store adapter** (`RoadStoreProvider`): real state from the KBC One snapshot, plus a **sandbox journey** for the drive. The trigger sets where to start (road, month, the stop to highlight), through the existing `pendingDrive` hand-off.
- Driving, test drives and crossroad choices change only the sandbox. **Make this my plan** sends the diff (new tips, goal paces, branch) as one `plan` command.
- Salary day runs on the server; the landscape phone then plays the autopilot drive for the closed month.
- The City stays lazy-loaded (`dynamic(..., { ssr: false })`) and keeps `?fx=0` and `?debug=1`.

### `ui/phone/PhoneStage`

One component owns the phone frame and its states:

```
portrait → turning → powering-on → playing → powering-off → returning → portrait
```

- **Target size**: measured from the stage. Width = min(95% of the stage width, ratio × (stage height − 40 px)), height = width ÷ ratio, with ratio ≈ 2.05 (a real phone is 19.5 : 9 ≈ 2.17; slightly taller uses more of the screen; decision D9). On a 1440 × 900 laptop that is about 1,370 × 670 px; on 1920 × 1080, about 1,820 × 890 px. The bezel stays thin (10–12 px) and the camera island moves to the left side.
- **Turning** (FLIP): render the landscape frame at its final size, start it with the inverse transform (rotated −90° and scaled down to the portrait rectangle), animate the transform to none in about 600 ms. The screen stays dark; nothing inside measures yet. The story and cast fade to low opacity and stop taking clicks.
- **Powering on**: a CSS overlay (a thin bright line that opens to full height, then fades, about 350 ms); `<City />` mounts inside the screen when the frame has settled. Preload the City chunk (`import("../game/City")`) when the Road tab or a look-ahead card is shown, so the light-up has no wait.
- **Playing**: no CSS transform on the frame or any ancestor of the canvas, because R3F and `WorldLabels` measure with `getBoundingClientRect()`. Opacity on the other stage columns is fine.
- **Back to the app**: a bezel button and Esc. Esc first closes an open City panel (as today), then exits. The City unmounts after the power-off, so the GPU is free, and the reverse FLIP plays. Picking another person on the cast rail runs the same exit first.
- **Reduced motion**: crossfade instead of the turn.
- **Real phone** (later): `requestFullscreen()` and `screen.orientation.lock("landscape")` in a try/catch; where that is not supported (iOS Safari), a "turn your phone" overlay.

### Making the City container-sized (`game/`, CSS)

- `.city` and `.city-loading`: `height: 100%` instead of `calc(100dvh - 60px)`; `.city` gets `container-type: size`.
- `.flash`, `.prompt`, `.sheet`, `.intro`: `100vw` → `100cqw`.
- The phone-size HUD rules: `@media (max-width: 860px)` → `@container (max-width: 860px)`, so they follow the phone screen, not the window.
- The landscape phone is about 670–890 px high, lower than the City's full-screen height today, so the left HUD column, sheets and the intro need checking at those heights (the readability check gets two new scenes).

## UI and design tokens

- Home: Kate's UI. New renderers for the road blocks in all four grammars (`ui/home/Blocks.tsx`).
- Road tab: Hindsight's `RouteView`, `GoalCard`, `StopView`, `ForkView`, `PassportView`, `NotesView`, `RecapView` and the cockpit parts, re-skinned: Hindsight's CSS variables map onto Kate's theme tokens (`bg`, `surface`, `text`, `muted`, `accent`, `accentText`). Bump, boost and milestone keep fixed colours (amber, mint, cyan) that are checked against each theme with `theme.ts` → `contrast()`.
- City: keeps its night look; it is a different place shown on the phone's screen, not a re-skinned app screen.
- Stage: **v1's layout and profile switcher**. Story on the left (v1's `motion` animation: Meet, name, role, "KBC noticed" pills one by one, outcome + the person's road), the phone in the middle, v1's portrait rail on the right with only two tools (tour, Inside). Port the component and CSS from round one rather than Kate round two's variant. The drawer (v1's `<dialog>`) holds three tabs: **Inside Kate**, **Behind the glass**, and **Director** (salary day, month slider, re-arrange, reset, lock screen, gate overlay). The Atlas and Adviser stay as separate views. Hindsight's road `<select>` and the Director's persona list are dropped. Cast data: one `Scenario`-like entry per person (avatar, name, role, noticed, outcome, badge, road line) next to `people/`.

## Tests

Keep both suites running (`bun test` for Kate; Hindsight's `node:test` files through `tsx --test` until we know they run under bun). New tests:

- every person: household ↔ Kate data consistency;
- money only moves, across both engines (a Kate action + a road pot + salary day);
- a road tip from Home, from the Road tab, from Kate and from a City plan produce the same journey state;
- care: no suggestions, products or road actions on Home; Kate's `pot` proposal rejected; road fogged until opt-in;
- every crowd number in the fact sheets is a gated, shown value; held-back numbers say so;
- Kate grounding: an invented amount triggers the fallback;
- composer: ≤ 1 road action, protection first, the customer's own layout never moved;
- salary day: one recap with Kate's month and the road's month; the journey month and `persona.now` move together; a finished road merges back onto the Everyday Road;
- `check:readability` extended to the road blocks in four styles, the Road tab (including Large & simple), care, and the City inside the landscape phone at 1440 × 900 and 1920 × 1080 (labels inside the screen, no overlaps with the HUD or the bezel);
- landscape phone: entering and leaving returns to the same screen; no transform on the canvas's ancestors while playing; leaving without "Make this my plan" changes nothing; switching person while playing exits first; a care road offers no look-ahead card and no drive.

## Performance and cost

- Compose with `claude -p` haiku takes about 10–15 s today. The road section adds about 1–2 KB. The cached home shows at once, as now; `KBC_AI=off` keeps the rules fallback.
- `computeLife()` replays at most 13 months and is pure; it can run on every request.
- Production story (unchanged from both builds): nightly cheap rules for everyone, recompose on events, the LLM only for the few percent with a fired moment; the road costs one pointer per customer and about 260 shared crowd views.

## Security

Carry over both: Kate's rate limiter, body limits and validated commands; Hindsight's headers, note moderation (client and server) and the crowd gate. In production the identity comes from the session only (`GET /me/road`, no id in the path), and every adviser opening is written to the customer's access log.
