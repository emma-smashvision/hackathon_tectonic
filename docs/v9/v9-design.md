# v9 design: Learn the road. Build your village.

Synthesis of `proposal-archive.md`, `proposal-loop.md`, `proposal-village.md`, `proposal-show.md`. Mock-ups: `design/V9*.dc.html`
(also on the design canvas, page "v9").

## The game in one sentence (on screen, always)

**"Learn 3 moving lessons to build your flat in Gent."** Every life road you will drive in real life has bumps that thousands
of KBC customers already hit. Learn what they lived, pave the bump, and a piece of your village gets built.

## Why v8 failed and what v9 changes

| v8 | v9 |
|---|---|
| Drive was a flat avenue with info boards; nothing to do | Every bump is a 60-second lesson; finishing it **paves the bump and builds a floor** |
| No goal, no progress | Goal banner + 3 progress pips + a building under construction with a crane |
| Village/home overview gone | **Your village**: Home, Car, Savings, Pension (+ Business/Family). Tap = plain overview of what you have |
| Phone turn removed | **The turn is the curtain**: phone lifts, rotates, grows, powers on, village from above, camera swoops to your car |
| Dark, dense, panels everywhere | Bright blue-hour island (projector-friendly), one panel at a time, one big button |

Archive finding: v6 had the real game (bumps that pave, ghost cars, passport, districts lighting up); v7 had already
disconnected most of it (`World` renders `MapWorld`, `Stops` returns null, ghosts empty). v9 restores the v6 feel on the
v8 crowd model, but rewards **learning**, not driving distance or wealth.

## Screens

1. **Home (portrait)**: v1 bubbles stay. Below: the **Your village** card with a live thumbnail, "Build your flat in Gent · 0/3"
   and "▶ Play · turn your phone". Every persona gets this card (Margaret: plain card; Nadia: care card, no game).
2. **The turn**: 0–0.7 s phone rotates/grows (`kbc-one-v7/src/one/LandscapeCity.tsx`), 0.7–1.2 s power-on into the village,
   1.2–3 s light traces Home → road, camera swoops. Back to app reverses it and lands on Home with "Reminder saved".
3. **Village, first frame (5-second test)**: goal banner + pips top centre; "Next on your road" card with one gold button
   "Start lesson 1"; the destination building as a dashed scaffold with a crane; the road leaves the island with amber bumps
   and ghost cars of earlier movers. Buttons: Back to app, All roads, Plain view.
4. **Bump → lesson** (car auto-drives and stops; world stays visible, card on the right):
   guess (2–3 big choices, "Not sure") → **what the crowd lived** (one gated fact) → **what helped** (outcome-ranked, "associated
   with") + one note from someone ahead → **Pave this bump** (amber turns mint) → **try it on a new case** → save one step or
   "Not now" (both complete the lesson).
5. **Back in the village**: camera rises, crane places the floor, toast "Ground floor built · lesson 1/3", passport stamp.
6. **Road complete**: building finished and lit, 3 stamps, "Write a note for the next mover", "where movers went next".
7. **Plain path**: same lesson as large cards, same progress; the village shown as an optional picture.

## Rules

- Rewards come from **understanding** (finished lesson incl. the new case), never from money, products, driving skill or
  time spent. One reward per topic; replay cannot farm. No decay, no streaks, no leaderboards, no shaming.
- An unprepared bump in a practice run stops the car gently; "What was missing?" → rewind 5 s and replay. Nothing is lost.
- Buildings never show wealth: a rented flat is as beautiful as a house. Building size is not money.
- Crowd numbers only from `src/one/crowd/*`, groups ≥ 500, one footer "synthetic demo crowd · not a forecast" (not on every card).
- Car words only inside the game. Care roads: consent first, no game layer.

## Content for the demo

- **Tom, Moving house** (58.300 movers): bump 1 `moving-house:energy-new-address` (meters, pot, advance), bump 2 `moving-house:setting-up`
  (budget, second-hand), bump 3 `moving-house:old-deposit`. Reward: flat in Gent, 3 floors.
- **Karim, Going freelance**: one fork lesson (sole trader vs BV, 1-year vs 3-year outcomes); reward: workshop. Either branch earns it.
- Others: Sofie & Pieter (family courtyard, energy settlement), Lina (Everyday December), Margaret plain, Nadia care.

## 90-second jury moment

0–8 s turn · 8–18 s village + goal · 18–28 s drive with ghost cars, stop at bump · 28–43 s juror guesses · 43–60 s reveal +
what helped + pave (mint) · 60–75 s new case + save reminder · 75–85 s crane builds floor 1 · 85–90 s back to Home, reminder saved.
Line: "People learn more when they take part. Other banks give you pages; we give you a journey built from what 58.300 movers lived."

## Build plan (after approval, ~1 day of agent work)

| WS | Scope |
|---|---|
| W1 World | Restore `LandscapeCity` turn; R3F village island (5 plots, ring, exit roads from the catalogue), blue-hour art, camera presets, auto-drive |
| W2 Lessons | `src/one/learning/*`: authored lessons for Tom ×3, Karim fork, Sofie, Lina; guess/reveal/helped/apply/save state; shared by 3D card and plain path |
| W3 Progress | Village state (building stages, paved bumps, stamps), crane/pave animations, road-complete screen, persisted per persona |
| W4 Entry & plain | Home village card for all personas, Margaret plain lesson cards, Nadia care card, back-to-Home receipt |
| W5 QA & demo | 5-second test, six personas, projector contrast, reduced motion, demo script v9 |
