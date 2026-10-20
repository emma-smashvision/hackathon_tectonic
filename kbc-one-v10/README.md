# KBC One v7

> **Roadmap-only build.** This copy of `kbc-one-v10` keeps Home, the **Your road** tab, **All roads** and the 2D roadmap views (housing: first home, moving house; business: going freelance, sole trader or company). The 3D city, driving, missions and three.js dependencies were removed. Run it with `bun install && bun run dev` (port 3700).

**1 app for each person · 1 click to the next useful step · 1 road from today to what comes next**

KBC One combines a personal banking Home, Kate customization, and a plain financial overview with Your road. It keeps the dark glass, bubbles, KBC azure and phone-to-landscape transition from v6, while showing fewer things at once.

Start with the [five-minute jury demo](docs/v7-demo-script.md). The [v7 brief](docs/v7-brief.md) describes the design and workstreams.

## What changed from v6

- **Home has three visible zones.** Fixed contains the balance and Transfer, Pay, Scan and Cards. Yours contains up to six chosen blocks. For you contains at most three suggestions, each with Why? and Not now. At most one suggestion is a journey.
- **Kate previews changes.** A style and Coffee request produces one combined preview with Apply and Change. Apply can be undone for 10 seconds. The fixed essentials and contrast checks remain protected.
- **Your road is a plain overview.** It shows applicable assets and products, dated next steps, preparation actions and goal progress. Tap an asset for details. Saved actions appear in Your plan.
- **Journeys start in the app.** Director → Send a journey nudge shows a private simulated lock screen. Opening it shows the journey, the customer's product, cohort hindsight, preparation progress and one-tap plan actions.
- **Margaret and Nadia do not get the game.** Margaret has large, simple words and two large actions. Nadia gets calm support, her advisor first, and optional next steps.

The rail selects six synthetic customers: Tom, Lina, Margaret, Karim, Sofie and Nadia. The activity icon opens Inside Kate, Behind the glass and Director. The guided rail tour is maintained alongside the [demo script](docs/v7-demo-script.md#guided-rail-tour-handoff).

## Run

```bash
cd kbc-one-v7
bun install
bun run dev
# http://localhost:3400/?p=tom
```

Use the stable rules mode for a timed rehearsal:

```bash
KBC_AI=off bun run dev
```

The exact prompt **“I like a pink, calm style and show my coffee spending”** works in this mode. Local customization rules handle the combined preview even when AI is enabled. For model-generated Home suggestions and other Kate replies, run without `KBC_AI=off`, with the `claude` CLI installed and signed in. Slow or unavailable model calls fall back to rules.

For an isolated workstream check, use `bunx next dev -p 3403`. Production commands are `bun run build` and `bun run start`; start also uses port **3400**.

## Demo controls and state

- Select a customer on the portrait rail, or open `/?p=tom`, `/?p=margaret`, `/?p=karim` or another seeded persona.
- The activity icon → Director contains **Send a journey nudge**, an optional auto-nudge switch, reset controls and other rehearsal controls. Nadia's care experience has no journey nudge.
- Kate customer state is stored locally on the server in `.data/kbc-state.json`. Chats and road plans use browser storage. Road state uses `kbcone.v5.road.<person>`; this is an existing storage key, not the product version.
- For a clean rehearsal, use a fresh private browser window **and** Director → Reset this customer for any server-side customer state you changed. Do not assume that the Director reset removes every existing plan entry. See the script's preflight.

## Checks

Run these inside `kbc-one-v7/`:

```bash
bun run typecheck
bun run test
bunx tsx --test src/one/yourroad/model.test.ts
bunx tsx --test src/hindsight/game/neighbourhood.test.ts
```

The last two commands cover workstream helper tests outside the default test command's paths. After changing a `*.src.css` file, run `node scripts/scope-css.mjs` and check the rendered page. Existing persona screenshots are in [docs/screenshots](docs/screenshots/).

## Code map

| Location | Responsibility |
| --- | --- |
| `src/kbc/` | Synthetic personas, transactions, Home composition, actions, Kate and theme validation |
| `src/kbc/ui/App.tsx`, `Screens.tsx`, `stage.ts` | Phone shell, Home zones, Kate interface and presenter stage |
| `src/one/RoadTab.tsx`, `yourroad/` | Plain Your road, product sheets, dates, goals and saved plan |
| `src/one/nudge/` | Journey selection, privacy-safe simulated notification and journey page |
| `src/one/people.ts`, `road.ts` | The shared household/persona bridge and cohort facts |
| `src/hindsight/engine/` | Synthetic life/cohort calculations and assets |
| `src/app/` | Next.js entry point and demo API routes |

## Prototype limits

All customer and cohort data is synthetic. The prototype is not connected to real KBC accounts or 23 million customer records. Hindsight describes cohort experience; it is not a prediction about a person.

A split currently takes **Ask € 32,10 each → Send requests**. The first tap prepares the task; it does not send the requests. Plan actions, bookings and reminders are demo records, not real financial instructions or live notifications. The € 35 monthly insurance step prepares for **next year's renewal**; the imminent bill remains due.

The Home and road share a persona but have separate state stores. Advancing the road's month is not a complete simulation of the Home's transaction history. The [demo script](docs/v7-demo-script.md#rehearsal-findings-and-fallbacks) records the verified sequence and observed issues.
