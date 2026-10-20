# Game archaeology: restore the action → world-change loop

The strongest game was a place you owned, with obstacles you could change. The archive supports that direction, but not a claim that lesson-driven village upgrades already existed.

## Evidence and limits

Read `docs/v9/00-brief.md` first, then the original README at `/Users/t.vrolix/Documents/Repositories/hackathon_tectonic/hindsight-v4/README.md` (read-only).

Ran v7 on **3611** and v6 on **3612**, with `KBC_AI=off`. Screenshots use headless Chrome through Playwright, normally 1440×1000. V6 uses `fx=0`: geometry and rewards remain, but bloom is absent. Existing `?debug=1` hooks shorten travel; completion uses a debug jump, not a full playthrough. The turn screenshot pauses the real CSS transition at 300/700 ms. No app source changed.

Path shorthand below: **6/** = `kbc-one-v6/src/hindsight/`; **7/** = `kbc-one-v7/src/hindsight/`; **O6/** and **O7/** = the respective `src/one/` directories. Every screenshot link resolves under `docs/v9/shots/`.

**Important correction to the brief:** latest v7 already disconnected much of the original city. `7/game/scene/World.tsx` renders `MapWorld`, leaving `LegacyWorld` unused. `Stops.tsx` returns `null`. `mapNetwork.ts` starts with `buildCity([])`, so `Ghosts.tsx` has no avenues to populate. Its HUD no longer offers passport or bird’s-eye controls. These are working v6 features, not working latest-v7 features. V8 then replaces `src/one/LandscapeCity.tsx` with a `DriveThisRoad` alias.

## Catalogue: KEEP / FIX / DROP

Each decision addresses the brief’s missing game, spectacle, village, access, driving, or overload.

| Mechanic / visual and verdict | Source evidence | Screenshot evidence and reason / confusion |
|---|---|---|
| **KEEP — phone rotates, grows, powers on; reverses on exit** | `O7/LandscapeCity.tsx` | [Turn](shots/archive-v7-phone-turn-mid.png), [settled](shots/archive-v7-phone-settled-intro.png). Restores the requested reveal; dark power-on interval needs a clear payoff. |
| **KEEP — personal neighbourhood** | `7/game/neighbourhood.ts`, `scene/Places.tsx` | [Tom](shots/archive-v7-city-neighbourhood.png), [Sofie](shots/archive-v7-sofie-neighbourhood.png). Makes “my village” visible; places depend on actual holdings. |
| **KEEP — home, repayment structure, future-home plot** | `7/engine/world.ts`, `game/scene/Places.tsx` | [Home](shots/archive-v7-place-home.png), [future plot](shots/archive-v7-sofie-neighbourhood.png). Solid/ghost construction reflects repayment or savings; this is financial progress, not a lesson reward. |
| **KEEP — garage, insurance alert and cover dome** | `7/game/scene/Places.tsx`, `hud/PlacePanel.tsx` | [Car](shots/archive-v7-place-garage.png). Recognisable ownership and amber feedback restore the home overview; explain the alert plainly. |
| **FIX — savings silo, goals, child accounts, investment towers** | `7/engine/world.ts`, `game/neighbourhood.ts` | [Savings](shots/archive-v7-place-savings.png). V7 groups products into one place; preserve readable totals without hiding each goal’s progress. |
| **KEEP — pension tree, fruit and growth** | `7/game/scene/Places.tsx` (`PensionTree`) | [Pension](shots/archive-v7-place-pension.png). Tree scale follows fund size; fruit follows yearly contributions. Add a separate learning reward rather than imply lessons create money. |
| **FIX — Market Mile, investment height, purchase years, weather and fog** | `6/game/scene/Places.tsx`, `6/engine/world.ts` | [Market](shots/archive-v6-market-mile.png). Visually rich, but several metaphors compete with the village; reveal only on request. |
| **KEEP — night city, districts, civic landmarks, lamps, luminous roads** | `6/game/cityGen.ts`, `scene/World.tsx`, `scene/Landmarks.tsx` | [Overview](shots/archive-v6-city-overview.png). Restores scale and spectacle; the full city is too much as the first task. |
| **FIX — Everyday ring: one lap/year; avenue distance/month** | `6/game/everydayRing.ts`, `network.ts` | [Ring](shots/archive-v6-everyday-ring.png). Gives everyday banking a place; two time scales need a visible explanation. |
| **FIX — driving, lane assistance, touch pads, map and fast travel** | `6/game/driving.ts`, `hud/Minimap.tsx`; `7/game/GAME_API.md` | [Driving](shots/archive-v6-city-driving.png), [v7 controls](shots/archive-v7-city-neighbourhood.png). Retain agency; automatic travel and panels can make steering feel secondary. |
| **KEEP — amber ridged bumps become mint and flat at 50%** | `6/game/scene/Stops.tsx`, `scene/Player.tsx` | [Before](shots/archive-v6-bump-ghosts.png), [paved](shots/archive-v6-bump-paved.png). Clear action changes the world; explain why 50% is sufficient. |
| **KEEP — crowd histograms and “what made the difference” actions** | `6/game/hud/Panels.tsx`, `engine/simulate.ts`, `engine/gate.ts` | [Stop](shots/archive-v6-stop-learning.png). Supplies the missing learning value; replace dense simultaneous numbers with one comparison. Synthetic, gated at ≥500. |
| **KEEP — ghost cars reflect crowd density, slow and bounce at bumps** | `6/game/scene/Ghosts.tsx` | [Ghosts](shots/archive-v6-bump-paved.png). Makes other people’s experience visible; explain that these represent synthetic cohorts, not identifiable live customers. |
| **KEEP — boost gates, milestone signs, destination pins and arrival dates** | `6/game/scene/Stops.tsx`, `engine/life.ts` | [Destination](shots/archive-v6-city-driving.png), [arrival postcard](shots/archive-v6-postcard.png). Gives roads variety and goals; avoid presenting crowd odds as personal promises. |
| **FIX — jolts, smooth crossings and outcome postcards** | `6/game/scene/Player.tsx`, `engine/game.ts` | [Postcard](shots/archive-v6-postcard.png). Immediate feedback feels like a game; rapid driving can replace one lesson’s feedback with the next event. |
| **KEEP — physical forks, branch outcomes, 1/3-year comparisons** | `6/game/hud/Panels.tsx`, `scene/Stops.tsx` | [Split](shots/archive-v6-fork-road.png), [outcomes](shots/archive-v6-fork-outcomes.png), [v7](shots/archive-v7-fork.png). Meaningful choices; label preview versus commitment. |
| **FIX — quests, stamps, exploration/paving/note counters, district light** | `6/game/hud/Quests.tsx`, `hud/Panels.tsx`, `scene/World.tsx` | [Quests](shots/archive-v6-city-driving.png), [passport](shots/archive-v6-passport.png), [before](shots/archive-v6-district-before.png), [lit](shots/archive-v6-district-lit.png). Restore rewards; completion currently rewards reaching the end, not demonstrated learning. Lighting is subtle. |
| **KEEP — completion, next-road shares and merge back to everyday life** | `6/game/hud/Panels.tsx` (`CompletePanel`) | [Completion](shots/archive-v6-completion-stamp.png). Gives a journey an ending; make this achievable within the demo. |
| **FIX — notes, roadside flags and review** | `6/game/hud/NoteComposer.tsx`, `scene/Stops.tsx` | [Existing note](shots/archive-v6-stop-learning.png), [composer](shots/archive-v6-completion-stamp.png). Adds contribution beyond driving; flag creation/review was not exercised. |
| **FIX — salary-day autopilot, monthly recap, fuel/pots/cover metaphors** | `6/game/scene/Player.tsx`, `components/phone/cockpit.tsx` | [Recap](shots/archive-v6-salary-recap.png). Useful consequence rehearsal; “fuel” and simulated time confuse banking language outside the game. |
| **KEEP — dated gates, shared 2D/3D plan, readiness and green road segments** | `O7/roadmap/model.ts`, `7/game/scene/MapWorld.tsx`, `hud/Hud.tsx` | [Gate](shots/archive-v7-preparation-gate.png), [prepared](shots/archive-v7-gate-prepared.png). Makes action useful; Tom’s single step moves overall readiness only 0→2%, a weak reward. |
| **FIX — 3-step intro, automatic stops, minor-month bundles, confetti** | `7/game/hud/CityIntro.tsx`, `Hud.tsx`, `MinorStopToast.tsx` | [Intro](shots/archive-v7-phone-settled-intro.png), [road](shots/archive-v7-tom-road.png). Reduces overload, but repeated panels interrupt driving. Confetti is source-confirmed, not captured. |
| **KEEP — glovebox, exit review and saved plan** | `O6/TripDebrief.tsx`, `O7/TripDebrief.tsx` | [v6 review](shots/archive-v6-debrief.png), [v7 debrief](shots/archive-v7-debrief.png). Connects play to action; make save timing and unchanged real dates explicit. |
| **DROP — discovery barrier and full Atlas machinery from the first journey** | `6/components/stage/Atlas.tsx`, `game/scene/World.tsx` | [Closed heat-pump road](shots/archive-v6-city-overview.png). Keep as an optional bank-side demo; it obscures the player’s goal. Approval not exercised. |

## V8 carry-forward: source review only

**KEEP** the 14-road catalogue, gated evidence, outcome-ranked help, aggregate ghost bins and preview/confirmed separation in `kbc-one-v8/src/one/crowd/README.md`. **FIX** the single-road drive in `src/hindsight/game/DriveThisRoad.tsx`: it retains forward/back travel, automatic stops and branch previews, but loses the owned city. V8 was not run, so these are source findings, without new screenshots.

Do not catalogue the guess → reveal → why → apply → save loop, rewind rehearsal or learning passport as shipped mechanics. `kbc-one-v8/docs/v8/game/00-game-design.md` describes future work. These are useful additions to the restored village.

## Access evidence

V7 Home → Your road → Explore your city works for [Tom](shots/archive-v7-tom-road.png), [Karim](shots/archive-v7-karim-road.png), [Sofie](shots/archive-v7-sofie-road.png), and [Lina](shots/archive-v7-lina-road.png). The earlier “only one persona” complaint does not describe this checkout. However, city entry still needs 2 taps and may require scrolling.

**KEEP:** [Margaret’s plain path](shots/archive-v7-margaret-road.png) and [Nadia’s consent-first path](shots/archive-v7-nadia-road.png). `O7/road.ts:allowsCity` excludes large mode, `noGame`, and care roads. Reach the same value from Home; never force these people into driving.

## The 5 things v9 must bring back

1. The landscape-phone reveal, followed immediately by the player’s village.
2. Home, car, savings and pension as recognisable places with visible progress.
3. Crowd ghosts and one physical obstacle changed by one useful preparation step.
4. Forks that teach through outcomes, followed by a short, explicit saved-plan debrief.
5. Stamps and visible district growth, earned through learning rather than distance alone.

## The 3 things that made it confusing

1. Hidden entry and disconnected mechanics: source files survived after their visible controls disappeared.
2. Competing meanings: driving time, real dates, 50% paving, 100% readiness, previews and saved actions.
3. Too many simultaneous demands: steering, labels, quests, maps, percentages and panels, without one immediate task.
