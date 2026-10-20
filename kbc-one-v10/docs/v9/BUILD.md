# v9 build: workstreams and ownership

Read first: `docs/v9/v9-design.md` (the design, approved by the user), the mock-ups `docs/v9/design/V9*.png` (look at them!)
and `V9*.dc.html`, and the proposals `docs/v9/proposal-*.md`. App folder: `kbc-one-v9/` (copy of v8), port **3600**.
Run `bun install` in `kbc-one-v9/` first. Use `KBC_AI=off`.

The user rejected v8 because: the game was unclear, not impressive, the village/home overview was gone, the phone-to-landscape
turn was gone, it did not feel like a game. v9 must FEEL like a game: goal banner, progress pips, bumps that pave, a crane
that builds, a finished building, stamps. Bright blue-hour look as in the mock-ups, NOT the dark v6/v7 night city.

Reference code (read-only, same worktree): `kbc-one-v7/src/one/LandscapeCity.tsx` (the turn, settled-canvas mounting rule),
`kbc-one-v7/src/hindsight/game/**` (neighbourhood.ts, scene/Places.tsx, Player.tsx, WorldLabels.tsx, PlacePanel.tsx),
`kbc-one-v6/src/hindsight/game/**` (Stops.tsx bumps that pave, Ghosts.tsx, Passport). Crowd data: `kbc-one-v9/src/one/crowd/*`
(README.md is the API). Shared contracts: `src/one/learning/types.ts`, `src/one/village/types.ts` (change only via W2 + broadcast).

| WS | Branch | Port | Owns |
|---|---|---|---|
| W2 Learning + village model | `v9-learning` | 3602 | `src/one/learning/**`, `src/one/village/**`. GOES FIRST: within ~30 min publish `src/one/learning/README.md` + `index.ts` with `lessonsFor(personaId)`, `lessonById(id)`, `villageFor(personaId)`, progress store hook `useVillageProgress(personaId)` (`complete(lessonId)`, `save(id)`, `reset()`, localStorage, SSR-safe), and the shared React `<LessonCard lesson variant="game"|"plain" onStep onDone/>` (guess → reveal → helped → "Pave this bump" → apply → save/Not now → done). Then broadcast. Content: Tom ×3 (energy-new-address, setting-up, old-deposit; destination "New flat in Gent"), Karim fork (sole vs BV; destination "Your workshop"), Sofie & Pieter (family/energy), Lina (Everyday December), Margaret plain (same lesson content, large), Nadia: `playable:false`. Numbers only from `src/one/crowd` gated values. Tests. |
| W1 World | `v9-world` | 3601 | `src/hindsight/game/**`, `src/one/LandscapeCity.tsx`, `src/hindsight/hindsight.src.css` game section. Restore the phone turn (rotate/grow/power-on, reverse on exit, reduced-motion fade). New R3F `VillageGame`: bright island village (5 plots from `villageFor`, ring road, exit road to the destination with 1 bump per lesson), destination building as scaffold + crane that gains one floor per completed lesson and is finished/lit when all done, ghost cars from `roadViewFor().ghostGroups` (gated), car auto-drives to the next bump and stops; bump amber → mint when paved. HUD as in the mock-ups: Back to app, goal banner + pips, "Next on your road" card with one gold button, toast "Ground floor built · 1/3", stamp card, road-complete card, tap a building → its plain overview panel. Lesson = W2's `<LessonCard variant="game">` in a right-side panel. Export `VillageGame({personaId, focusLessonId?, onExit})`. Target 30 fps at 1366×768, cap DPR 1.5. Until W2 publishes, code against the types with a local fixture. |
| W3 Entry, Home, plain path | `v9-entry` | 3603 | `src/kbc/ui/App.tsx` (wiring), Home village card (`src/kbc/ui/HomeMix.tsx` card slot / new `src/one/villagecard/*`): thumbnail, "Build your flat in Gent · 0/3", gold "▶ Play · turn your phone" → opens `LandscapeCity` with `VillageGame`; on exit land on Home with a small receipt ("Reminder saved · 1/3 built"). Your road tab: "Drive this road" now opens the village game focused on that stop. Margaret (Large & simple): card opens the plain lesson path (`<LessonCard variant="plain">` screens + optional village picture), no rotation. Nadia: care card, no game. Persona switch resets open game. Remove v8 Drive-only entry points that the village replaces. |
| W4 QA + demo | orchestrator | 3600 | merge order W2 → W1 → W3, six-persona check in Chrome, `docs/v9/demo-script.md`. |

Rules: only edit owned files; tiny hook-ups elsewhere marked `// v9-<ws>` and listed in your final status. Synthetic data only,
no secrets, no push. Commit with `git -c user.name="Thomas Vrolix" commit`, NO Co-Authored-By trailer. `bun run typecheck` and
`bun run test` must pass. Verify in a headless browser on your port (Tom, Karim, Sofie, Lina, Margaret, Nadia; `?p=tom` etc.),
save screenshots `kbc-one-v9/docs/screenshots/v9-<ws>-*.png`, compare them to the mock-ups. Crowd numbers only via the gate
(k ≥ 500), one footer "Synthetic demo crowd · not a forecast". Rewards only for finished lessons; no money, points, streaks,
leaderboards, shaming, "you will". Car words only inside the game.
