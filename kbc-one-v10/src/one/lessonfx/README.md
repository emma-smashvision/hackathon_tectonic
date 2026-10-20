# Lesson cinema — shared v10 / v11 API

The crowd becomes a road: amount columns rise from the asphalt, your marker meets the median,
ghost cars cross the bump, action lanes carry the crowd through count rings, and a roadside
note types itself. The host keeps ownership of lesson progress, saving and rewards.

```tsx
import { LessonCinema, LessonReward } from '@/one/lessonfx';

<LessonCinema lesson={lesson} onChoose={choiceId => controller.choose(choiceId)} />
// Only after the host confirms a passed lesson:
<LessonReward lesson={lesson} />
```

## DOM API

- `LessonCinema({ lesson, onChoose, variant?, reducedMotion?, initialStep?, showFooter? })`:
  self-contained R3F stage + DOM controls. `variant` is `cinema` (default) or `plain`.
  Margaret defaults to plain. A persistent Plain lessons toggle works at every step.
  `onChoose(id)` fires once when the learner selects an application lane; **it does not mean
  the answer is correct or the lesson is complete**. The host validates the answer and handles
  retry. A lane click is an explicit choice; left/right selects a lane and Take this lane confirms.
  A native range input supports pointer drag, arrow keys, Home and End for the guess.
- `initialStep`: `guess` (default), `median`, `reveal`, `helped`, `note`, `apply`, `reward`.
  v10 uses `apply` after rewind, keeping the already-collected evidence. Key the host by a lesson
  ID; the component also resets its session when `lesson.id` changes.
- `showFooter` defaults to **false**. The host should render exactly one
  `Synthetic demo crowd · not a forecast` footer. Enable this only for standalone use.
- `HologramNote({ text, by, reducedMotion? })`: DOM quote, full accessible text from the start,
  visual type-on, source attribution unchanged. Never invent a quote or attribution.
- `LessonReward({ lesson, reducedMotion?, testDrive? })`: stamp slam and rising floor.
  `testDrive` omits the stamp and building. Presentation only, no storage writes.
- `useLessonMotion(reducedMotion?)`: returns true when explicit reduced motion OR the OS
  preference requests it. All timed movement becomes static, including type-on and stamp.

## Embed in an existing R3F Canvas

```tsx
import { lessonFxData, LessonScene } from '@/one/lessonfx';
const data = useMemo(() => lessonFxData(lesson), [lesson]);
// All geometry is in local coordinates: road surface y=0, width 27, length 36.
<group position={[district.x, 0, district.z]}>
  <LessonScene data={data} step="helped" selectedLane={0}
    onSelectLane={setLane} reducedMotion={reducedMotion} />
</group>
```

`LessonScene({ data, step, guess?, selectedLane?, onSelectLane?, reducedMotion?, controlCamera?, entering? })`
leaves the host camera alone by default. `entering=true` steers the gold car into the selected lane. `controlCamera=true` is **only** for an isolated Canvas
at the origin; it frames and eases the camera for the active step. Render corresponding DOM text
and controls when embedding: the meshes are visual and are not screen-reader controls.

Individual R3F exports (must be below a Canvas):

| Component | Props |
| --- | --- |
| `CrowdHistogram` | `bars: CrowdBar[]`, `median?`, `guess?`, `revealed?`, `reducedMotion?` |
| `GhostConvoy` | `rate?` (0–1), `ratio?` (use `ratioFor(rate)`), `reducedMotion?` |
| `GhostCar` | `color?`, `opacity?` |
| `HelpedLanes` | `lanes: CrowdLane[]`, `selected?`, `onSelect?(index)`, `entering?`, `reducedMotion?` |
| `HologramSign` | `reducedMotion?`; pair with DOM `HologramNote` |
| `RewardBuild` | `progress?` (0–1), `reducedMotion?` |

`CinemaStep`, `LessonSceneProps`, `LessonCinemaProps`, `LessonFxData`, `CrowdBar`, `CrowdLane`
and `ForkColumn` are exported. No extra packages, external font requests, image assets or HTTP.
Generated label textures are disposed on unmount.

## Evidence and meaning

`lessonFxData(lesson)` reads only `stopEvidenceFor` / `forkEvidenceFor`. Every amount edge,
count, share, median and fork metric checks its own `shown` gate. Hidden bars retain a
“Band not published” placeholder; they have no implied height, count or amount. Open-ended
bands remain explicitly open. `dataFromEvidence(lesson, evidence)` is the pure adapter for tests
or an existing evidence source. `lesson` must be the published `@/one/learning` contract: helped
shares, reveal text/table and source notes are already gated there.

Cars depict a proportion, not individual tracked people. `ratioFor(rate)` allows 1 in N only
within one percentage point of the published rate, otherwise the scene uses 100 small cars.
Falling light and the three flowing lane cars are illustrative motion, **not measured counts**;
bar heights and ring arcs carry the published values. Histogram bands are equally spaced
categories, not a continuous amount axis. The native slider's range uses published edges.
Your marker lands in its amount band; it is not an additional crowd observation.

Helped rings mean “avoided a strain on their buffer”, not action uptake or personal success
probability. The association line appears once at the helped step (once in plain view).
The application lanes deliberately have no percentages: a new answer is not an observed action
subgroup. Karim shows both year-1 and year-3 buffer columns and the gated administration table;
there is no invented histogram, source note or action rate for his fork.

`formatLessonDate(text)` changes valid ISO calendar dates to `1 Jan 2027` in UTC.
`money(value)` formats EUR. Only call it with gated or personal/explicit guess values.
`images.d.ts` references Next's own static image declaration for fresh-checkout typechecks.

## v10 wiring and reward boundary

`missions/Missions.tsx` mounts cinema after all pickups, before choosing a preparation.
The controller still requires the actual bump crossing. Wrong preparation opens rewind without
awarding anything. Correct preparation triggers slow paving and a camera swoop. `MissionWorld`
previews the rising floor during pave; durable completion and the passport stamp remain after
`passed`. Replays remain idempotent, and test drives cannot stamp or save.

## Verification

Run from `kbc-one-v10`:

```sh
KBC_AI=off ./node_modules/.bin/next dev -p 3711
bun run typecheck
bun run test
MISSIONS_URL=http://localhost:3711/dev/missions node src/one/lessonfx/browser-check.cjs
```

The browser check drives using the map and Drive for me controls. It exercises Tom's guess,
median, ratio, helped lanes, note, wrong preparation/rewind, correct preparation, pave, stamp,
save and reload; Karim's own fork; and a reduced-motion/plain equivalent.
Screenshots: `docs/screenshots/r2-lesson-*.png`.

## v11 storm variant

`StormHouses({ rate?, prepared?, reducedMotion? })` is an optional R3F alternative to
`GhostConvoy` for the world. Pass `lessonFxData(lesson).rate`; the same ratio rule makes seven
houses and seven drops for a published 1-in-7 outcome, with one flooded house. Other rates
use 100 small houses. Missing rates render nothing. `prepared` is an explicit 0–1 lesson
preparation progress, which raises an illustrative seven-brick dam; it does not reduce the
published historical rate or imply a forecast. Pair with the data headline and a plain DOM
alternative. The world host owns its cloud framing, progress and camera.

Verified v10 integration: the headless Chrome script passes on 3711 with `KBC_AI=off`,
including Tom's two outcomes, Karim's own company lesson, reduced motion, 390px plain view,
save/reload and idempotent replay. Fourteen `r2-lesson-*.png` screenshots accompany the
integration. Typecheck and all 251 tests pass. The world host remains responsible for
integrating and framing the optional `StormHouses` primitive in v11.
