# Usable places (round 2)

Shared synthetic finance model and DOM view for the v10 city and v11 world. No HTTP API, bank connection, storage writes, or real transfers. Source: `src/one/people.ts` and its household/world definitions. These components do not depend on city10 or world11.

## Public interface

```tsx
import {
  buildPlaces, createDemoState, moveToGoal, PlaceView,
  type PlaceId, type PlaceLesson,
} from '@/one/places';

const [demo, setDemo] = useState(() => createDemoState(person));
const places = buildPlaces(person, demo);
const place = places.find(p => p.id === selectedPlaceId);
if (!place) return null;

<PlaceView
  key={place.id}
  place={place}
  embedded
  closeLabel="Back to world"
  onClose={() => setSelectedPlaceId(null)}
  onMoveToGoal={(accountId, goalId, amount) => {
    const result = moveToGoal(demo, accountId, goalId, amount);
    if (!result.error) setDemo(result.state);
    return result.error;
  }}
  onLesson={(lesson: PlaceLesson) => {
    // An optional missionId is the existing persona-scoped lesson identifier.
    // Route it through the host's lesson/drive callback.
    if (lesson.missionId) onDrive(lesson.missionId);
  }}
/>
```

All 6 `PEOPLE` entries are supported, including calm Margaret and consent-gated Nadia hosts. Hosts own whether a place opens; the model never requests consent or enters a game. Margaret shows source pension income and home cover. Nadia shows her known monthly mortgage bill without inventing a repaid percentage.

`PlaceId`: `home | car | savings | pension | business | kids`. Business exists for Karim; Kids exists for Lina. Sofie's fifth shared-plan place uses `kids` with the display title `Family`. `placeIdForPlot('family')` maps the v10 plot ID to `kids`. World hosts can map `work` to `business`.

`Place` exposes `label` (live building one-liner), `color`, `accounts`, `goals`, `facts`, `attachments`, optional `progress`, and `lessons`. All values are already adapted for presentation except numeric goal/progress values. `PlaceGoal.percent` is 0–100; values are relative to the person's own target. `progress.payments` and `totalPayments` drive the mortgage brick wall. Attachments have `ok | check | gap` states. The model never invents missing holdings, loans, contribution years, maintenance dates or child goals.

`PlaceViewProps`:

- `place: Place`, `onClose: () => void` are required.
- `onMoveToGoal?: (accountId, goalId, amount) => string | undefined`: error text or success. Without it the demo allocation form is absent.
- `onLesson?: (lesson: PlaceLesson) => void`: opens the host's existing mission when the user chooses **Drive this mission**. Local short lessons expand inside the place without any host callback.
- `embedded?: boolean`: default false, a focused modal over the scene. True fills an existing panel as a region; the host owns focus, scrolling and Escape. The heading says Your place without a parking metaphor.
- `closeLabel?: string`: defaults to **Back on the road**.
- `lessonLabel?: string`: host action label. Embedded views offer `onLesson` for every local lesson, defaulting to **Explore this lesson**. Standalone city views only offer **Drive this mission** for a real `missionId`, unless this override is supplied.

Key the host by `person.key` to isolate personas. `PlacesProvider`, `PlacesContext` and `usePlaces()` are an optional React state wrapper, used by city10. `usePlaces()` returns null outside the provider. The pure model can be imported directly from `./model` without the DOM/CSS entry point.

## Financial rules

`PLACES_AS_OF` is 1 Oct 2026 (month 9), matching the synthetic demo period. Pass a `MonthPoint` as the third `buildPlaces` argument to use another demo month. Mortgage principal and monthly-payment count reuse `mortgageAt` and `monthsBetween` from `engine/world.ts`; payments made before the as-of month form the bricks. The principal percentage and payment-count percentage are different measures, both labelled separately. The monthly bill follows the persona's household, while amortisation follows the original/rate/term definition.

Savings accounts and goal allocations are separate pots in the source household. The Savings label totals savings pots plus goals, excluding the current account and investments. Its percentage is the sum saved divided by the sum of goal targets. The vault has one tank per goal and shows monthly standing orders. Home and Business reuse these same local goal values. Pension shows this year's contributions against the source's **demo** maximum; it does not present a current legal tax limit.

`moveToGoal` is immutable and cent-exact. It rejects missing/locked accounts, missing goals, non-finite/negative/fractional-cent amounts, overdrafts and goal overfill. It debits one available account and credits one goal; it never mutates `PEOPLE`. It returns `{state,error?}`. State is deliberately in memory only: a new city session/reload resets it. The form, success message and footer explicitly say **Demo only · no real transfer**.

Tom's Home identifies Leuven as the current home (rent history unavailable), next Gent rent, the flat fund and tenant cover. Car shows the source +8% premium change on 2 Nov 2026. Unknown car loans and pension histories remain explicit unknowns. Lina's child balance is separate from the parent's available accounts and cannot fund goal moves.

## City adapter

`city10/scene/CityPlaces.tsx` owns the engine integration, marked `// r2-places`. Driving across a radius-3.2 pad opens a place. The pad lies 40% from the road door toward the building, outside the through lane and building collider. Building taps and map **Go there** controls use the same open state. Arrival stops any mission, parks the car, clears GPS, freezes input, and holds a building camera shot. Reduced motion cuts directly to the shot. Closing ends the shot and restores free roam; a pad must be left before it can trigger again.

`YourBlock.tsx` reads live labels and goal tank fill through the shared provider. Without a provider, art previews use the read-only default model. The DOM map entries are portalled into the existing map aside so its road controls remain unchanged. Hosts without a Missions HUD can provide `CityGame.onPlaceLesson(lessonId)` to route existing lessons themselves. Without either a HUD or callback, local lessons remain available and no inactive drive button is offered. Mission directories are owned by L1; this adapter only calls the existing `useMission` controller's `roam()` and `navigate()` methods.

## Verification

- `bun test src/one/places/model.test.ts`: money conservation, immutability, validation, persona isolation, mortgage boundaries, renewal dates and pension/goal percentages.
- `bun run typecheck`: passes after dev and in a clean detached checkout without `next-env.d.ts` or `.next`. The tracked canonical image declaration also supports a fresh checkout.
- Browser integration evidence is recorded in `docs/screenshots/r2-places-*` and `browser-check.cjs` alongside this README.

### Round 2 verification record

- `KBC_AI=off bun run test`: **203 Bun tests + 48 engine tests passed**. The 6 place-model tests contain 66 assertions, including all 6 personas, conservation of money, invalid moves, mortgage boundaries and missing-data handling.
- Headless Google Chrome on `http://localhost:3712`, with `KBC_AI=off`: Tom, Karim, Sofie and Lina all pass map **Go there**, actual keyboard driving onto a pad, parking/freeze, Back on the road, Escape ownership, goal/account updates, invalid amounts, session retention and reload reset.
- A real pointer clicks the projected Savings building mesh. Its local lesson hands off to the existing mission GPS. The scene uses an explicit `PlacesContext` bridge so building hit targets, labels and tank fill share the DOM state.
- Tab stays inside the place; M cannot open a map behind it. Narrow 390×844 reduced-motion and compact 844×390 views pass. Browser page/console errors: **0**.
- Screenshots: `docs/screenshots/r2-places-*.png`. Machine-readable results: `docs/screenshots/r2-places-results.json`. Captures wait for the parked camera to settle; goal tanks face the arrival pad and the selected building remains visible beside the panel.

Re-run from `kbc-one-v10` with dev running on 3712:

```sh
PLAYWRIGHT_MODULE=/tmp/kbc-game-browser/node_modules/playwright   node src/one/places/browser-check.cjs
```

Use `CHROMIUM_PATH` for another Chrome installation and `PLACES_URL` for another dev port. The browser check uses the existing opt-in `?debug=1` surface to seed a car at the road entrance and project a real mesh; it does not use a debug action to open a place or complete a lesson. Actual pointer, keyboard and DOM controls perform those actions.
