# World UI, round 2 (WU)

The round-2 host keeps `<WorldGame personaId onExit onDrive onPlain />` stable.
The world scene owns geography, finance attachments and the locked-to-open reveal.
The UI reads the model's unlock rules, keeps Explore read-only, and passes confirmed
life events or any positive goal amount into `useWorldProgress.unlockArea`.

Each owned Home, Car, Savings, Pension, Business or Kids district opens the shared
`PlaceView`. Finance summaries come from `area.finance`; no screenshot/mock-up
number is hard-coded. Goal moves use `moveToGoal` in session state only. The
`withPlaceProgress` adapter updates the matching personal goal fill in the world
without changing `PEOPLE`, stored lessons, insurance or mortgage principal.

`WorldLesson` hosts L1's `LessonCinema` in a wide panel. The host validates the
application choice before it offers the optional save step. A wrong answer grants
nothing. “Not now” earns the blueprint without preparing the storm. Completion
and saved steps use the existing shared store, so v10 drive results remain visible.
The host owns the single crowd footer. Plain lessons and reduced motion remain
available; all source dates are formatted for display.

Margaret's Calm world uses large labels and plain lessons, with no storm countdown.
Nadia's care garden requires an explicit choice before it reveals practical source
steps. It never writes rewards, scores, storms or lesson progress. Her ordinary
places remain available. The shell keeps the separate Plain view fallback.

## Checks

Run from `kbc-one-v10`, with `KBC_AI=off bunx next dev -p 3813`:

```sh
bun run typecheck
bun run test
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node src/one/world/ui/round2-browser-check.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node src/one/world/ui/round2-shell-check.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node src/one/world/ui/round2-drive-check.cjs
```

The first browser script checks finance places, unlock persistence, read-only
Explore, a €1 goal, local allocation, wrong/correct lesson choices, optional saving,
reload, phone and compact layouts. The shell script opens Home → world for all six
profiles and checks Margaret's plain lesson and Nadia's consent-first care path.
Screenshots use `docs/screenshots/r2-ui-*.png`. Verification status and final source
hash are reported only after all round-2 branches are merged.

---

## Prior round reference

# World UI (WC)

```tsx
import { WorldGame } from '@/one/world/ui';
<WorldGame personaId={personaId} onExit={closeWorld}
  onDrive={(lessonId) => openCityMission(lessonId)} onPlain={openPlainWorld} />
```

The shell owns navigation and the drive. `onDrive` receives a persona-scoped
`Lesson.id`. The component fills its containing frame. It owns the single
“Synthetic demo crowd · not a forecast” footer. Changing persona remounts all
transient UI so a lesson, draft, preview or visit cannot cross personas.

WC owns only this directory and one dev-only preview route marked `// v11-ui`.

UI design: v10 night-water #10253b, glass #0b1d32, mist #b3d3e7,
cyan #78e5ff, prepared mint #9ff3d5, approaching-storm amber #edbf7b.
Space Grotesk headings, IBM Plex Sans body. The island is the principal view;
quiet left-aligned HUD and a 420px right panel leave the world visible.
The area rail is a keyboard-accessible alternative to scene hit targets.
Growth expresses learning and personal goal percentages, never euros or rank.

Behavior:
- `LessonCard` owns save/complete. Partial sessions earn nothing; replay is idempotent.
- A storm shield requires both the matching completed lesson and saved step.
  “Not now” completes the blueprint but leaves the optional preparation unfinished.
- `Drive this road` is offered only for an own, non-test-drive v10 mission ID.
- Locked exploration and world-ahead visits do not write progress.
- Sofie’s kids view is a parent-local preview. The source has no child identity;
  no name, account, public signpost, or shared child data is invented.
- `Reset demo` clears the same persona store used by v10 missions. The shell’s
  separate `Reset demo notes` clears submitted notes and useful feedback.
- Care and large/simple personas hand back to `onPlain` without creating a Canvas.

The isolated `/dev/world-ui?p=tom` story is production-disabled. Its shell callbacks
are visible receipts, not integrated navigation. WD owns the full Home/drive/return QA.

```sh
KBC_AI=off bunx next dev -p 3803
PLAYWRIGHT_MODULE=/path/to/playwright-core CHROMIUM_PATH=/path/to/chrome node src/one/world/ui/browser-check.cjs
```

Screenshots use `docs/screenshots/v11-ui-*.png`. Review against W11World, W11Area,
W11Storm, W11Ahead and W11Kids. Illustrative mock-up numbers/names are not copied
when the source model does not support them.

The island uses WB’s `WorldScene` directly. Camera overview closes the panel;
Escape closes the nearest UI level before the shell can leave the world. A
non-modal panel preserves access to the area rail and plain/exit controls.
Container queries adapt to the actual landscape phone frame, including 640×300,
rather than assuming browser viewport dimensions are the game dimensions.

Approved Notes API records from each public active road feed the island’s
signposts and lantern count. Reads never create feedback. A separate-profile
reader can select `Mark useful` once; an author cannot vote for their own note.
The model hides kids social data, and education-only roads without a catalogue
entry never send Notes requests. Use `notes-browser-check.cjs` for the complete
review → useful → lantern → reload flow against the local server.

## Verified build

`bun run typecheck` and `bun run test` pass on the merged WA `24409d9` and WB
`bea559e` source, including the 48 engine tests and UI crowd-format gate tests.
Headless installed Chrome on port 3803 passed both scripts with no page errors:

- Tom, Karim, Sofie and Lina: world, area, lesson and locked preview.
- Wrong application cannot finish; leaving an unfinished lesson earns nothing.
- Lesson “Not now” earns learning only; a later explicit save builds the shield.
- Replaying and reloading preserve one completion; visits write no progress.
- Exact eligible drive callback, parent-local Sofie kids lesson and mini-world growth.
- A 640×300 landscape host, 390px phone layout, and no Canvas for plain/care personas.
- Review, a separate-profile useful action, disabled duplicate feedback, one actual
  author lantern, and persistence after reload. Notes reset at the end of the check.

27 `v11-ui-*.png` screenshots capture these states. Visual review against the W11
mock-ups found and fixed the ahead banner overlap and restored ordered-list
markers. Full Home → actual CityGame mission → world navigation belongs to WD;
the owned story verifies the exact callback only. WB owns drag/pinch and scene
performance. No external API, real customer data or production publishing is used.

Final frozen-source check: merged WB `4ca5757` (night materials, fog, camera
lifecycle, all prepared dams, final v10 postprocessing). `visual-check.cjs`
passed for all four worlds, Sofie’s kids preview, area, lesson, ahead, and the
640×300 host, with zero page errors. Its 10 `*-night.png` images show the final
renderer; the earlier 27 images preserve the complete interaction evidence.
The compact frame hides fogged scene labels and keeps every area in the rail.
Final `bun run typecheck` and `bun run test` passed: **214 Bun + 48 engine tests**.

Round-2 model follow-up `9d71925` enables every known profile. Margaret's model
mode is `calm`; Nadia's ordinary areas use `game` while the care district remains
consent-only. `StormData` frames L1's shared `StormHouses`; the historical crowd
proportion stays visible when the illustrative dam grows. `round2-drive-check.cjs`
checks an actual world lesson → exact city mission → saved shield → world return.


## Round-2 integration verification

Headless installed Google Chrome, `KBC_AI=off`, port **3813**. The final world pass uses source `baf85d6`; the six-profile shell pass uses
`ee51051`. The physical mission pass preceded the calm/care presentation-only
follow-up. All browser assertions passed, with zero
page errors. The shell checks also captured zero Canvas frames during the phone
transform.

- Tom, Karim, Sofie and Lina: world overview, finance Home, usable Savings,
  shared lesson cinema, single crowd footer, key hints on every locked area.
- Life-event unlock and a €1 goal persist after reload. The normal-motion unlock
  reveal is captured. Explore leaves the complete demo localStorage unchanged.
- Demo goal allocation updates the place and world percentages. Wrong lesson
  answers earn nothing; correct + “Not now” earns only the blueprint; an explicit
  later save builds the shield. Reload preserves both exactly once.
- All six profiles: Home and Your road open the world and Exit returns to the app.
  Margaret has no storm, uses plain lessons with the next action inside the panel,
  large tap targets and no place entry fade. Nadia’s ordinary Home/Savings remain
  available; her care garden requires consent, writes no game progress, and shows
  no blueprint or financial caption.
- Actual UI lesson → exact completed city quest replay → convoy/collection/
  preparation/crossing/paving → optional save → world return passed in **42.7 s**.
  The saved shield survived reload; Karim did not inherit Tom’s progress; reset
  cleared it. No completions were injected by the browser script.
- Reviewed phone (390×844), compact world (640×300), desktop and app-frame PNGs.
  Initial lesson captures wait for the first WebGL frame. Screenshot review fixed
  the shared cinema fit, the calm card height and care-only caption leakage.

Evidence: `round2-browser-results.json`, `round2-shell-results.json`,
`round2-drive-results.json`, and `docs/screenshots/r2-ui-*.png`.
The scene’s decorative seven-house storm is explicitly labelled illustrative;
the world storm panel uses the gated persona rate through L1’s `StormHouses`.


Final static checks on production source `5d3366c`: `bun run typecheck` and
`bun run test` pass (**253 Bun + 48 engine tests**). A detached clean checkout
also passes typecheck before any `next-env.d.ts` or `.next` exists. The following
P1 evidence merge changes no production code. All requested sources and their
final evidence are merged: WM `79be2cd`, WS `6670241`, L1 `28df3b6`, P1 `37744c7`,
and the additional all-profile Road entry work R1 `d2eb275`.

Final screenshot review also fixed flex shrinking of the storm figure. The
browser now asserts that its complete crowd caption lies inside the figure;
`r2-ui-tom-storm.png` and `r2-ui-tom-prepared.png` show the unchanged historical
crowd proportion before and after the illustrative dam. The final repeat passed
all world assertions with zero errors. **65** `r2-ui-*.png` images are committed.
