# v9 village world

The named VillageGame export takes {personaId, focusLessonId?, onExit, onPlain?}.
LandscapeCity adds optional frameRef: RefObject<HTMLDivElement | null>.
Mount the curtain outside .stage-phone: the existing turn CSS hides the portrait
phone. onExit and onPlain run after the reverse turn. preloadCity() warms both
world chunks.

The curtain checks the actual computed transform before mounting the canvas.
It unmounts the canvas before reversing. Reduced motion uses a fade. A narrow
portrait viewport shows a physical-turn cue and the optional plain-path action;
resizing to landscape mounts the canvas at its real size.

lessonsFor, villageFor, useVillageProgress and LessonCard come from W2's
one/learning barrel. The initial typed local fixture was removed after that API
landed. focusLessonId accepts the persona lesson ID or composite crowd stop ID,
including a completed lesson for replay.

The world has fixed-size plots, a garden in an unused fifth slot, a ring road,
an exit road and one bump per lesson. No dimensions depend on balances.
A provisional pave is a mint wave/burst; leaving that unfinished lesson gives
no stamp or floor. The shared card completes after the new case and Save/Not now.
Only completed lessons build floors, permanently pave bumps and supply stamps.
Replays do not add a floor. Saved actions are demo records, not notifications.

Ghosts use only roadViewFor().ghostGroups with both count and density published.
At most four illustrated groups appear. They are synthetic aggregate bins,
not individual customers, traffic observations, or predictions. The host supplies
one synthetic footer. All roads exposes the 14-entry catalogue; other road rows
are previews and do not change the person's confirmed road. Existing PassItOn
handles the explicit road-complete note action.

## Rendering

The blue-hour sky and sea horizon are an illustrated background behind the 3D
island. Geometry uses pale brick, terracotta roofs, warm windows and mint paving.
The camera handles entry swoop, chase and return. HTML labels track projected
positions and remain below the goal banner. The chase car stops one car-length
before the bump. Ordinary motion redraws at 30 Hz; reduced motion stays static.
DPR is capped at 1.5. Static shadows refresh only when geometry changes.
The canvas exposes data-world-fps and data-draw-calls for local QA.

## Verification

Start KBC_AI=off bunx next dev -p 3601 from kbc-one-v9, then run:

    PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome \
      node src/hindsight/game/village-browser-check.cjs
    bun run typecheck
    bun run test

The browser script uses the development-only /dev/world?p=tom host. Its tiny
route is marked // v9-world and returns 404 in production. The source harness
is VillagePreview.tsx; production Home mounting belongs to W3.

Screenshots in docs/screenshots/v9-world-*.png show the standalone host at
1366×768, plus a portrait-device cue. They were compared against V9Turn,
V9Village, V9Guess, V9Reveal, V9Built and V9Done. The script walks all three Tom
lessons, Save/Not now, stamps, reverse turn and persisted reload, plus full Karim,
Sofie and Lina lessons. It checks that Margaret/Nadia mount no game canvas.
Additional browser checks cover exact focused lesson, cancelling a provisional
pave, all 14 catalogue rows/search, local plain fallback, and physical rotation.
W3 independently verified the actual Home integration and receipts on port 3603.

Final checks: typecheck passed; 173 Bun tests and 48 engine tests passed.
The serial browser suite reported zero page errors. With the finished scene and
no concurrent browser run, Tom held 30 fps across three 2.2-second samples at
1366×768; Karim and Sofie also measured 30 fps. Earlier concurrent dev/HMR samples
were lower and are not used as an isolated rendering benchmark. Lina's reduced
motion mode has no continuous render loop.


## Orchestrator QA follow-up (merged bf409f1)

The actual Home now calls preloadCity() while visible. The cached module includes
VillageScene directly, removing the nested lazy boundary. LandscapeCity prepares
the HUD during rotation with canvasEnabled=false, then enables WebGL only after
the computed phone transform is identity. The shared Home village illustration
stays visible during GPU setup; a 180 ms fade hands over to the live scene. This
keeps power-on immediate without mounting a canvas under a rotating parent.
The only hook outside W1 ownership is the marked v9-world Home preload effect
and its import in src/kbc/ui/App.tsx.

The 1.5-second reward toast uses an inline SVG crane. Building labels are hidden
for that interval and return afterward. The exit road and roadside houses now
sit on one continuous land strip with grass verges, connected to the village.

Run the actual Home regression at 1512×806 with:

    PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome \
      node src/hindsight/game/village-qa-check.cjs

Tom completed all three lessons, including Save and Not now, three stamps, all
three toast/label cycles, and return to Home without a canvas. No page errors.
In the measured headless dev run, the canvas mounted at 1598 ms after the click,
with an identity transform; the village illustration was visible at 1642 ms
(44 ms later). The first live WebGL frame followed at 2444 ms. The illustration
covers that GPU startup interval; this is not a claim of a faster GPU frame.
Screenshots v9-world-qa-{powered-on,village,road,toast,done}.png were inspected
against V9Built and V9Guess: the toast crane is legible with no covered labels,
and the road has continuous grass beneath its houses. The brighter palette,
scaffold/floors, road bumps, and completed village remain consistent with the
original mock-ups. Typecheck passed; 176 Bun tests and 48 engine tests passed.
