# KBC One (v5)

**1 person, 1 app · 1 click away · 1 perfect road to your future**

KBC One puts our two builds in one app:

- **Home is today.** Kate's adaptive home: composed for the person on every open, reshaped by talking to Kate, in the customer's own theme. One-tap quick actions.
- **Road is your future.** Hindsight: the Everyday Road (the Belgian money year), your life road, the crowd's hindsight, salary day.
- **The driving world opens on the phone.** When you look further ahead, or KBC notices something that changes your road, the phone turns to landscape, grows to fill most of the screen, the screen lights up, and you drive Hindsight City on it.
- **Kate connects them.** She knows your road (only crowd numbers that passed the gate) and can open the driving world for you.

The stage is v1's: the animated story on the left, the phone in the middle, the portrait rail on the right to switch profiles, and the drawer (Inside Kate · Behind the glass · Director).

All customer data is synthetic. Nothing in this folder is committed, and the existing apps are unchanged (see [SOURCES.md](SOURCES.md)).

## Run it

```bash
cd kbc-one
bun install
bun dev            # http://localhost:3200
```

- Port **3200**, so it runs next to v1 (3001), the Kate home (3000) and Hindsight v4 (3100).
- Kate uses the `claude` CLI (`claude -p`) when it's on your PATH and signed in. `KBC_AI=off bun dev` runs on the rules fallback only: the home is composed by rules, and Kate answers from fixed replies (she still offers the drive).
- Customer state (layout, theme, trackers, rules) is kept on the server in `.data/kbc-state.json`; the Kate chat and each person's road are kept in the browser (`localStorage`, the road under `kbcone.v5.road.<person>`). **Director → Reset this customer** clears all of it for that person.
- Checks: `bun run test` (Kate's 22 tests with bun, then Hindsight's and KBC One's 36 with `tsx --test`), `bun run typecheck`.

## How to get to the game

Pick a person on the portrait rail on the right, then tap a button **on the phone**. There is no separate game button on the stage.

| Person | Gets the game? | What to tap | Where the drive starts |
|---|---|---|---|
| **Tom** | Yes | The card on his Home: "You told us you're moving to Gent on 1 November. See the road ahead." → **See the road ahead** | Moving house, month 0 |
| **Karim** | Yes | The card on his Home: "Stay sole trader, or start a company?" (in about 4 months) → **See the road ahead** | Going freelance, month 20, towards the crossroads |
| **Sofie & Pieter** | Yes, as a test drive | The card on their Home: "Drive First home before you buy" → **Test-drive it** (also on the Road tab) | First home from month 0. It isn't their road yet |
| **Lina** | Only when she asks | No card (nothing big ahead). **Road** tab → **Look ahead** | The Everyday Road ring, at this month |
| **Margaret** | No | Large & simple: the Road tab shows the next three things in plain words | — |
| **Nadia** | No | A care road (Losing a parent): calm Home and Road, no game, her advisor first | — |

Other ways in, for every person who gets the game:

- **Road** tab (bottom nav) → **Look ahead**.
- **Kate**: ask "What's ahead for me?" → her answer comes with a **Look ahead** card.
- Backup for the demo: drawer → **Director** → **Look ahead now**.

In the driving world: WASD or the arrows to drive, E to pull over at a stop, M for the bird's-eye view. **← Back to the app** (or Esc) asks what to do with the drive:

- **Make this my plan** keeps the pots, goal paces and choices you made. Your month doesn't move.
- **Leave it, go back** throws the drive away. Nothing changed.
- **Keep driving**.

Only salary day moves your month: Director → **It's salary day: close October**, which shows the month's recap on the Road tab.

## Where things are

| Folder | What |
|---|---|
| `src/kbc/` | Kate: personas, blocks, actions, composer, Kate's facts and proposals, grounding, the server, the phone UI and v1's stage (`ui/App.tsx`) |
| `src/hindsight/` | Hindsight v4: the engine (roads, crowd gate, life replay), the phone screens, the City and its HUD, the store (now one store per person, with a sandbox for drives) |
| `src/one/` | The bridge: one person = Kate persona + household + road (`people.ts`), road facts and look-ahead cards (`road.ts`), the Home card, the Road tab, the landscape phone, the stage panels |
| `src/app/` | Next.js page, Kate's API (`api/kbc/*`) and Hindsight's notes API |
| `scripts/scope-css.mjs` | Scopes the two apps' CSS so they live on one page: Kate's under `.ph`, Hindsight's under `.hs` (media queries become container queries for the landscape screen). Re-run `node scripts/scope-css.mjs` after editing a `*.src.css` file |
| `tests/` | Hindsight's tests and `one.test.ts` (Home and Road agree, who gets the game, Kate's drive proposal, grounding) |

## Known gaps

- Salary day closes the month on the road (recap, journey month + 1); the Kate side (transactions, balances on the Home) doesn't live the month yet.
- The road is kept per browser; the Kate side on the server. They're joined by the person, not by one stored snapshot.
- Planned but not built: road blocks on the Home (`road_ahead`, `buffer`, `cover_check`), road actions through Kate's command API, Kate's `pot` / `goal` proposals, a month slider and lock screen in the Director tab. See the [build status](docs/04-build-plan.md#build-status-v5-18-oct).
- The root repo's `tsconfig.json` and `biome.json` include `**/*` and may pick up this folder. Run the checks inside `kbc-one/`; excluding it in the root config is a change to an existing file, so only with your go.

## The plan

| | Doc | What's in it |
|---|---|---|
| 1 | [Investigation](docs/01-investigation.md) | What each app does, where they overlap and conflict |
| 2 | [Product](docs/02-product.md) | Horizons, screens, bridges, trust rules, cast and demo script |
| 3 | [Architecture](docs/03-architecture.md) | One person model, one money truth, engine and AI changes |
| 4 | [Build plan](docs/04-build-plan.md) | Phases, cut lines, risks, decisions, and what v5 built |
