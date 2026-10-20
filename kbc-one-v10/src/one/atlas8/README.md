# All roads (v8)

```tsx
import { AllRoads } from "./atlas8";

<AllRoads
  person={person} // PersonRoad from one/people
  onClose={() => setAllRoads(false)}
  onOpenRoad={(roadId, mode, stage) => {
    // mode: 'exploring' | 'confirmed'
    // stage: { id, month, label, date: string | null, confirmedAt?: string }
    // stage.date is compatible with crowd.previewRoad / crowd.confirmRoad.
    // confirmedAt is a compatibility alias for the event date, not a consent time.
    // Exploring must not replace the confirmed road or change the plan.
    // Confirmed is only emitted after explicit stage + date + confirmation.
    openRoad(roadId, mode, stage);
  }}
/>
```

The parent owns pointers, persistence, and navigation. Optional `pointers` accepts
the live `PersonPointers` so badges follow persisted changes; optional `large`
forces Large & simple for any persona. Pass the returned stage directly to
`previewRoad(pointers, roadId, stage)` or `confirmRoad(pointers, roadId, stage)`.
An open callback for a care road guarantees that the person opted in on this screen.
Everyday can be explored but cannot replace the confirmed life road.

Catalogue, badges, counts and matching use the shared `one/crowd` model. Stage
choices use its underlying engine definitions; no model invents stages or figures.

`AllRoads` never mutates the store. Mount inside the phone content with a bounded height; it owns vertical
scroll. CSS is imported with the component. `person.noGame` selects the large list;
`.st-large` also enlarges cards for a user-selected Large & simple theme.

Care roads show no counts in any list. Opening one asks for explicit consent before
stage selection. For a person on a care road the entire atlas stays quiet (no
counts or metro toggle). A persona switch resets search, selection and consent.
Under-review roads have no preview action or published evidence. Unknown searches
show “No published road yet” and nearby catalogue roads. Wide containers offer the
same buttons in a metro overview; narrow containers always use the list.

`ScaleAtlas` is the presenter proof. `stage/Atlas.tsx` exports it as `Atlas`;
`StagePanels.tsx` mounts it in Behind the glass (`// v8-atlas`). It calls the existing
`runPlacement` in chunks. The elapsed time is wall time, including UI pauses.
Shared views are occupied road/month slots, including unpublished candidates.
Technical measurements pass `gateNumber` with the processed population as the
support denominator; crowd counts pass `gateCount`. Unpublished candidates never
become customer insights. Synthetic matching does not confirm any customer road.

## Verification

Headless Chrome on port 3503 exercised all six personas in an isolated mount:
Tom's “we just bought our first house” search → First home → explicit stage →
Exploring callback; a separate date and confirmation emitted the confirmed mode.
Margaret used the large list. Nadia had no counts and required care consent.
Unknown and under-review searches never opened evidence. A wide mount exercised
Metro overview. Screenshots are in `docs/screenshots/v8-atlas-*.png`.

The actual app's Inside → Behind the glass drawer also ran the live placement.
The run processed 2.3M synthetic records, used about 0.7 seconds of elapsed browser
time, and returned 271 occupied shared road/month views. Timing varies by machine.
The temporary isolated mount was removed after QA. WS-E owns the App mount and
pointer persistence; this workstream verified callback payloads, not host storage.
