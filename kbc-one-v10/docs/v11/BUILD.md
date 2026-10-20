# v11 build: Your world (a world builder on top of the v10 drive)

Branch `kbc-one-v11` (from the v10 integration branch `v10-shell`). Same app folder as v10: `kbc-one-v10/` (so the drive
engine and missions are shared). Run `bun install`, `KBC_AI=off`, each workstream on its own port. Nothing is pushed.
Mock-ups: `kbc-one-v10/docs/v11/design/W11*.png` (+ `.dc.html`). The orchestrator adds them within ~20 min of start: check them before visual work.

## The idea (user, verbatim intent)

"An open world like Hay Day or Forest. Users see all the different world areas, and those are the 'roads'. Users grow their
world by working towards goals; everyone's world is unique, but you still learn from what the others have done. Areas each
focus on one part of you: your house, car, baby on the way, renting, private banking, investments, saving up for uni, managing
a kids account... As you grow, your world grows. Incentivise people to take learning paths and share knowledge."
And: v9 looked "childish"; v10's futuristic night look is the bar. So: **premium blue-hour/night island, lit and alive, not cartoon.**

## Design (approved)

1. **Your world** = an island with **areas**. Each area = one part of your financial life and maps to crowd roads:
   Home (renting / owning: `moving-house`, `first-home`), Car (Everyday car stops), Family / baby on the way (`first-child`),
   Kids (kids account + saving for uni: `student-kid`), Savings (Everyday + your goals), Investments (education only, new
   synthetic road allowed), Pension (`retirement`, `first-job:pension-saving`), Work (`first-job`, `freelance`, `job-loss`),
   Abroad (`moving-abroad`), Private banking (locked teaser for most), Care garden (`caring-parent`, `losing-parent`,
   `separation`: consent first, no game). Areas you don't need yet sit in **fog**; you can "explore" them (preview, changes nothing).
2. **Growth = progress, never money.** Each area has stages 0–4 driven by (a) % of *your own* goal (uni fund 40% → campus 40%),
   (b) learning-path lessons passed (each lesson = blueprint for the next building), (c) storms prepared. Never sized by euros.
3. **Learning paths ("hindsight blueprints")**: per area a Duolingo-like path of quests built from the crowd's real stops;
   each quest = the lesson loop (guess → what the crowd lived → what helped → apply → save) using `src/one/learning`.
   A quest can also be played as a **drive** ("Drive this road" opens the v10 mission for that stop).
4. **Storms** (the hook): crowd-based events approach an area on real dates ("Energy settlement storm reaches Home in 3 weeks ·
   1 in 7 worlds got flooded here"). Prepare (the lesson + a saved step) → a dam/shield is built and the storm passes.
   Unprepared → a repair quest. Nothing is ever destroyed.
5. **Worlds ahead**: "A world like yours, 2 years ahead": an anonymised aggregate (group ≥ 500) that shows what people built
   first and where storms hit. Visit it, then come back.
6. **Signposts & lanterns** (sharing): after living a stop, plant a reviewed note as a signpost in that area of other people's
   worlds. Each time someone marks it useful, a **lantern** lights in your world ("read by 312 movers": real counts only).
   "Guide" badge per area. The only status in the game is helping.
7. **Family**: Sofie & Pieter share a family area; Sofie's child gets a **kids mini-world** co-built with the parent.
8. **Together**: seasonal events from the Everyday year; community goals ("100.000 meter checks before winter" → fireworks
   over every world). Cooperative, never competitive.
Never: leaderboards by money, rewards for trading/investing activity (ESMA gamification caution), loot boxes, streak
punishment, product sales as rewards, children's data beyond their own world.

## Workstreams

| WS | Branch | Port | Owns |
|---|---|---|---|
| WA World model | `v11-model` | 3801 | `src/one/world/*.ts` (+tests, README): area catalogue + persona mapping, `worldFor(personaId)` (areas, stage, locked/explore, goals %, quests from `src/one/learning` + new authored quests so every active area of Tom/Karim/Sofie/Lina has ≥ 2), `stormsFor(personaId)` (from crowd stops + Everyday, gated shares, real demo dates), `worldAhead(personaId, areaId)` (gated aggregate build order + storm hits), signposts/lanterns (extend notes API minimally with a "useful" count; real counts only), kids mini-world model for Sofie, progress store (extends `useVillageProgress` additively). May add synthetic engine roads (investments, uni saving) as data in `src/hindsight/engine/roads.ts` if needed, gated like all others. GOES FIRST: API + README in ~30 min, broadcast. |
| WB World scene | `v11-world` | 3802 | `src/hindsight/game/world11/**`: R3F island world. Areas as distinct plots around a central plaza with procedural growth stages (buildings rise, lights come on, details appear), fog over locked areas, storm clouds with rain/lightning moving toward an area, dam/shield when prepared, lanterns, signposts, ghost "world ahead" overlay. Camera: overview ↔ tap area to fly in (smooth), drag/pinch pan, never lost. Art: premium blue-hour/night, emissive windows, neon area borders, water reflections, bloom: reuse `src/hindsight/game/city10/scene/*` materials from v10. Export `<WorldScene world onArea focus />`. |
| WC World UI | `v11-ui` | 3803 | `src/one/world/ui/**`: world HUD (name, goals strip, storm alert chip), area sheet with the quest path, lesson via `LessonCard`, "Drive this road" (calls back to shell), storm card + prepare flow, "Visit a world ahead" view, signpost composer + lantern feedback, kids mini-world co-build view, explore-a-locked-area preview. Export `<WorldGame personaId onExit onDrive(lessonId) onPlain />` composing WB's scene. |
| WD Shell & demo | `v11-shell` | 3804 | `src/kbc/ui/App.tsx`, Home card ("Your world · storm in 3 weeks · ▶ Open"), turn (`LandscapeCity`) → `WorldGame`; `onDrive` → v10 `CityGame` mission → back to the world with the reward; Margaret plain world (large list of areas + lessons, no 3D), Nadia care garden (consent first); demo reset; `docs/v11/demo-script.md` (90-s jury run: open world → storm → lesson → drive → dam + building grows → signpost lantern). Keeps merging `v10-shell` as v10 finishes. |

Rules: only edit owned files; tiny hook-ups elsewhere marked `// v11-<ws>`. Synthetic data only, no secrets, no push.
`git -c user.name="Thomas Vrolix" commit`, NO Co-Authored-By trailer. `bun run typecheck` + `bun run test` pass. Verify in
headless Chrome on your port for Tom, Karim, Sofie, Lina (+ Margaret plain, Nadia care), screenshots
`kbc-one-v10/docs/screenshots/v11-<ws>-*.png`, compare with the mock-ups. Gated crowd numbers (k ≥ 500), one footer.
