# World scene — round 2 (WS)

```tsx
import { WorldScene } from '@/hindsight/game/world11';
<WorldScene world={worldFor(personaId, progress)} onArea={setAreaId}
  focus={areaId} onOverview={() => setAreaId(null)} ahead={comparison}
  calm={personaId === 'margaret'} />
```

`WorldSceneProps` retains `world`, `onArea`, `focus`, `onOverview`, `ahead`, `storms`,
`className`. The only addition is optional `calm`: tap-only navigation, no pan/pinch,
slower flights and larger labels. Reduced motion always takes precedence and uses static frames.
The host owns consent, plain lessons, UI panels, the disclosure footer and all model writes.
The scene never changes progress or financial data. It consumes WM's typed `area.finance`,
`area.unlock`, `area.attachments` and model storms. No fixture remains.

## Districts and navigation

Owned places occupy an inner harbour on 1.6× plateaus; locked chapters are 0.7× outer islets.
Each has an independent shoreline, a neon boundary, a bridge and a distinct building.
Geography remains stable within a persona session. Unlocking grows the existing islet,
raises its land, lifts its fog and assembles its first building. A persona change resets
that layout; previewing a locked island only moves the camera. The host shows the gated
crowd line after unlock. Map labels show a key; hover, keyboard focus or selection reveals
the model's unlock hint. Outer labels point away from the harbour to preserve building visibility.
Bridge lights travel along their routes; reduced motion holds one light at each midpoint.

## Finance visuals

- Owner Home: the mortgage's repaid share fills the structural frame. Every known monthly
  payment creates one brick in the front wall. Fixed-rate/balance cover adds a foundation stone.
- Renter Home: the current flat is complete; a recorded future-home goal fills a separate scaffold.
  Tom gets Leuven plus the Gent goal at 72%. Unknown Leuven history creates no invented bricks.
- Home and Car insurance add a translucent protective dome and rim.
- A prepared Home-energy lesson adds a **solar roof preview**, labelled `Energy plan`.
  Source data does not record solar ownership; this is a preparation illustration.
- Savings has one transparent tank per own goal, with independent fill levels and tick marks.
- Pension grows from annual contributions relative to the person's annual maximum. Historical
  years contribute only when the model supplies them; current source years are unknown.
- Kids grows from the child's own goal. No goal means a starter building, not a guessed percentage.
- Unknown car loans and maintenance remain unknown. Source insurance renewals are in the model summary.
- Lesson stage still adds architecture in non-financial areas and remains distinct from finance stage.

The single active storm is an explicit miniature: seven homes, seven falling drops, one flooded
home. Preparing it raises seven dam blocks in order and drains that flood. It is a synthetic
lesson illustration, not a prediction for the user's building. The focused caption explicitly says “Illustrative storm”; these seven homes do not claim
a 1-in-7 personal crowd rate. The host lesson uses the actual gated share.

## Rendering and review

DPR is capped at 1.5. Opaque architecture, bridge geometry, payment bricks and moving bridge
lights use instancing. Keys share merged geometry; the ocean has one bounded reflection.
The approved night palette, emissive windows, bloom, shadows and SMAA remain.

Run `KBC_AI=off bunx next dev -p 3812`, then `/dev/world11?p=tom`.
`?focus=home`, `?stage=0..4`, and `?calm=1` are development-only review controls.
`Preview unlock` changes only the local review state; the real UI calls the model unlock API.

`round2-browser-check.cjs` runs isolated hardware Chrome at 1366×768 / DPR 1.5, captures
`docs/screenshots/r2-world-*.png`, measures the four game personas and checks Margaret Calm and Nadia ordinary districts,
finance buildings, unlock, dam, every overview label in frame, no scene persistence, pointer pan,
native touch pinch, compact reduced motion and Calm pan/zoom suppression.
`round2-results.json` records the final run. `world11.test.ts` guards district separation,
finance/lesson independence, exact known payment counts and absent-history handling.

`WorldPicture` remains the approved static round 1 postcard. It is illustrative art, not live data.
Older `browser-check.cjs` and `camera-browser-check.cjs` are round 1 evidence scripts.

## Verification

The final scene source is `67623dd`. Typecheck passes; the full suite passes with
229 Bun tests and 48 engine tests. A detached checkout of `8b5cbc0` also passed
typecheck before any `next-env.d.ts` or `.next` files existed. WM's canonical tracked
image declaration supplies the static image types. The all-profile model follow-up
`9d71925` is included as `1468ff7`; the final source also passes typecheck with that model.

Final isolated hardware Chrome on Apple M5 / ANGLE Metal measured **60.0 scene fps** for
Tom, Karim, Sofie and Lina at 1366×768, DPR 1.5. Independent RAF measurements were
60.02, 60.13, 60.18 and 60.17 fps. Total render calls were 262–294 (including secondary
passes), with 41,638–49,166 triangles. No page errors occurred. All six scene profiles,
unlock and dam animation, all 11 overview labels, exact finance displays, no scene storage
writes, pointer pan, native touch pinch, reduced motion and Calm gesture/weather suppression pass.

After that full browser pass, `f8fadd7` only clarified the illustrative storm caption and fixed
the compact development-review header. Targeted Home/dam captures and the compact capture were
refreshed and checked. The desktop scene and performance code remain those of `67623dd`.
Final evidence is in `round2-results.json`; screenshots use `docs/screenshots/r2-world-*.png`.
