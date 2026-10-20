# v9 brief: back to the drawing board (it must be a game again)

## What the user said about v8 (verbatim intent)

"No this is worse.
1. we should definitely keep the animation of the phone going to landscape mode
2. its not clear what the game is now whatsoever
3. the game doesnt look impressive
4. the home overview stuff / build my village stuff is gone
5. doesnt feel like a game anymore.
We need to get back to the drawing board here. Rethink the design."

Earlier, about the game: "Right now it adds little value/incentive other than you can drive through a street. This was supposed to be turned into a learning-full journey. Pitch: people consume information more easily when they are engaged and excited to participate. This differentiates us from all other banks where people read endless pages; here we offer it in a fun way where you also learn from what other users have done and how we leverage their data."

## What v8 lost (facts, check the code)

- `kbc-one-v8` commit `4b8393c` "Replace the asset city with one shared crowd road to drive" deleted Hindsight City:
  the ring road (Everyday Road, one lap = one year), the districts with one avenue per life road, the **neighbourhood of
  your own places** (home, car/garage, savings & investments, pension: `kbc-one-v7/src/hindsight/game/neighbourhood.ts`,
  `scene/Places.tsx`, `hud/PlacePanel.tsx`), ghost cars, bumps you pave by preparing, passport stamps, districts that light up.
- `LandscapeCity` (the phone rotating to landscape, growing, screen powering on: `kbc-one-v7/src/one/LandscapeCity.tsx`)
  became an alias for a flat Drive view (`kbc-one-v8/src/hindsight/game/DriveThisRoad.tsx`).
- The original v4 README (`hindsight-v4/README.md` in the main repo, also `kbc-one-v7`) describes the full city game.
- What v8 did add and is worth keeping: crowd model `kbc-one-v8/src/one/crowd/*` (catalogue of 14 roads, gated k ≥ 500
  evidence, what surprised people / what helped ranked by outcome, notes from people ahead, forks), All roads,
  2D Your road, notes roundtrip, channels (Home card, nudge, Kate, adviser). The learning-game synthesis
  `kbc-one-v8/docs/v8/game/00-game-design.md` (guess → reveal → why → apply → save, practice run, passport) was never built.

## Previous feedback that still applies

- City in v7 was hard to reach (only one persona), not drivable enough, overwhelming, unclear.
- Car words outside the game are bad (no "fuel/boot/tyres" in the banking UI). Inside the game they are fine.
- Home: v1 bubbles style, everything on the first screen, scroll for more, no "Fixed/Yours/For you" labels; Kate styles must never be destroyed.
- A non-gamer (Margaret, 70s, Large & simple) must get the same value through a 2D/plain path.
- Care roads (Nadia): gentle, consent first, no game layer.
- Privacy: crowd numbers only for groups ≥ 500, synthetic data labelled, "associated with", never "you will".

## What v9 must be

1. **Obviously a game within 5 seconds**: one sentence goal on screen, visible progress, feedback when you act, a reward you want.
2. **Impressive**: the phone turns to landscape (keep that animation and polish it), a 3D world worth looking at, ghost cars of the real crowd, things that grow/light up.
3. **"Build my village"**: your own place in the world that represents your financial life (home, car, savings, pension, ...) and that grows/upgrades as you learn and prepare. The home overview (what you have) lives in it.
4. **Learning journey**: every road is a journey of short lessons made from the crowd's experience (guess → reveal → what helped → apply → save). Learning is what moves you forward and builds your village.
5. **Hindsight is the engine**: "Waze for your money": crowd roads, your position, ghost riders ahead, what helped, notes to the next person.
6. **Demoable**: a 90-second jury moment that is fun, easy to follow, technologically impressive and unique.
7. **Reachable for every persona** from Home in one tap, and calm (one thing at a time).

## Process

Round 1: four specialists each write a proposal (`docs/v9/proposal-<role>.md`, max ~1500 words, ASCII sketches welcome).
Round 2: each reads the others and writes `docs/v9/critique-<role>.md` (max 600 words): keep / steal / veto.
Orchestrator synthesizes `docs/v9/v9-design.md` + mock-ups for the user's approval. No app code in this phase.
