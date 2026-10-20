# City10 driving missions

```tsx
import { Missions, MissionWorld } from '@/hindsight/game/city10/missions';
<CityGame personaId={personaId} onExit={onExit} compactHud
  scene={<MissionWorld personaId={personaId} />}>
  <Missions personaId={personaId} onExit={onExit} onReset={resetDemo}
    focusLessonId={focusLessonId} />
</CityGame>
```

Both components use the same `CityApi` identity. `Missions` owns the controller clock and subscriptions; `MissionWorld` reads the same session across the Canvas boundary. `CityGame` owns driving, maps, the camera and the single disclosure footer. Shell can disable that footer and supply its own. Missions never render a disclosure footer.

## Driving loop

A district beam starts a letterbox intro. Follow the ghost convoy while moving, drive through 3 pickups, stop at the preparation area, choose a preparation, then drive across the physical bump. A correct preparation paves amber to mint in slow motion. A wrong preparation jolts and offers a 5-second rewind. The rewind replays the car position from driving history, excludes time spent on cards, and retains collected hindsight. No mission reward is written until the car crosses the bump and the paving animation finishes.

One beam per playable district cycles to the next lesson. The pause menu can select an exact lesson for GPS navigation or replay. Mission locations use `CityApi.pointOn` fractions in `controller.ts`. Free roam resumes after completion; the player can also abandon a mission from the pause list. `focusLessonId` accepts a persona lesson ID, composite stop ID, or road ID.

## Data and rewards

- Authored Tom, Karim, Sofie and Lina lessons retain their preparation choices, gated shares and source notes. Two outcome-ranked helped items and one note form the pickups. When a note or action is absent, the pickup explicitly uses the existing lesson principle or withheld text; it never invents a quote or share.
- Other live, non-care districts use gated catalogue evidence and a test-drive preparation. Care and under-review roads remain visible in the pause catalogue, without missions. Margaret and Nadia render no mission UI or scene.
- `useVillageProgress.complete` runs only after a passed own mission. Replay is idempotent. `save` runs only on an explicit save click. It stores the existing reminder/checklist ID; it does not execute a notification or payment.
- Other personas' roads say **Test drive**. They cannot save a personal reminder, stamp a passport, or change any persona's progress.
- Sound is optional: `onSound('pickup' | 'pave')` and `city10:sound` window events fire once per transition.
- Optional engine hooks `setTimeScale`, `setMissionMarkers`, `jolt` and `boost` enhance feedback. The rules otherwise use only the BUILD.md CityApi contract.

## Validation

`bun run typecheck` and `bun run test` include `controller.test.ts`, which mocks the CityApi contract. The headless browser check uses the real engine and keyboard events. It reads debug route/car geometry only to steer; it never teleports, uses autopilot, or changes mission state.

```sh
KBC_AI=off bunx next dev -p 3703
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome \
  node src/hindsight/game/city10/missions/browser-check.cjs
```

The development-only `/dev/missions?p=tom&debug=1` route is the only outside-owned source hook (`// v10-missions`); it returns 404 in production. Screenshots use `docs/screenshots/v10-missions-*.png`.

Verified on port 3703 with W1 `a51a925` and W2 `7c63c51`: Tom drives from home through the complete first mission, takes the wrong-preparation/rewind path, retries, crosses the prepared bump, saves, opens the passport and reloads. Karim drives the same road as a test drive with no saved action or progress change. The browser checks map/Esc priority, exactly one footer, and zero page errors. 10 screenshots were inspected; the full suite passes 192 Bun tests plus 48 engine tests. The shell/Home entry remains W4’s integration responsibility.

`assisted-browser-check.cjs` checks the same route with the map’s Autopilot button and the mission’s Drive for me buttons. The crossing target is beyond the bump, so assistance can finish without keyboard input.

## Round 2: the crowd becomes the road

After the three pickups, `Missions` opens the shared `@/one/lessonfx` cinema. The learner
places an amount marker, sees the median and proportion cars, explores outcome rings,
reads the source note, then steers into an application lane. Karim gets the actual gated
1-year / 3-year comparison, without invented action rates or a quote. The Plain lessons
button gives the same evidence and application choices without another Canvas. Rewind
returns directly to application; it keeps collected hindsight and awards nothing.

The prepared crossing adds a slow paving shot and a rising-floor preview. The passport
stamp still appears only after `passed`. Reduced motion skips the paving camera shot,
uses static lesson frames and awards only after the physical crossing. The legacy
keyboard and assisted browser scripts select the equivalent plain lesson for their
controller checks; the new cinema script captures the full visual sequence.

Two real-browser route fixes belong to this change:

- Assistance continues past the convoy meeting point, so the car does not stop before
  the moving-follow requirement finishes.
- While GPS has a selected mission, incidental beams cannot start another road on the
  way. Starting or leaving the selected mission clears this restriction for free roam.

Run the round-2 check from `kbc-one-v10` with a dev server on 3711:

```sh
KBC_AI=off ./node_modules/.bin/next dev -p 3711
MISSIONS_URL=http://localhost:3711/dev/missions node src/one/lessonfx/browser-check.cjs
```

The script asserts the actual mission ID, Tom's unprepared/prepared outcomes, no early
reward, save/reload, Karim's own company lesson, persona isolation, reduced motion,
390px plain layout and replay without duplicate rewards. Its screenshots use
`docs/screenshots/r2-lesson-*.png`. See `src/one/lessonfx/README.md` for the reusable API,
publication gates, world/storm variant and host responsibilities.

Verified on port 3711 with `KBC_AI=off`: the full round-2 browser script passes with zero
page errors. All 14 screenshots were captured; the key road, note, comparison, reward and
mobile frames were visually reviewed. `bun run typecheck` and `bun run test` pass (203 Bun
checks + 48 engine checks). The shared API's static image declaration also passed a clean
worktree typecheck at `9aca6e8`, before either `next-env.d.ts` or `.next` existed.
