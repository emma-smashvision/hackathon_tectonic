# v7.1 City game API (WS4 → WS6)

Read `const { gameApi, panel, setPanel } = useGame()` inside GameProvider.
Existing place APIs (`places`, `travelTo`, `startTour`, `stopTour`) remain available.

`gameApi` is a React-updated snapshot, with stable meaning (do not depend on object identity):

- `roadmap: RoadMap` — exactly the shared model, no extra life roads.
- `currentTrackId: string | null`, `currentTrack: MapTrack | null` — null in the neighbourhood.
- `nextGate: MapStop | null`, `currentGate: MapStop | null`, `currentFork: MapCrossing | null`.
- `readyByTrack: Record<string, number>` — 0–100 from shared `trackReady(track)` (only actionable next/ready/later stops). No stops ahead is represented as 0 for scene shading; HUD must use `trackReady(track) === null` to show “Done ✓”, not a percentage.
- `events: GameEvent[]` — latest 20 events, ascending unique `seq`; types `gateReached` (`stopId`, `trackId`), `stepAdded` (`stopId`, `trackId`, `actionId`), `forkReached` (`crossingId`, `trackId`). Consume once by `seq`.
- `previewBranch: { crossingId: string; branchId: string } | null` — a test drive only.
- `setInput(partial: Partial<Input>)` — up/down/left/right/brake booleans. Pointer-down sets true; pointer-up/cancel sets false. Keyboard arrows/WASD use the same controls. `releaseInput()` clears all held controls. Up accelerates, down brakes/reverses, space brakes. Left/right select a lane at a junction; steering never leaves the road.
- `goToStop(stopId: string)` (also accepts cityFocus aliases or track IDs) — follows the road, stops at the gate, opens `{type:'mapStop', id:stopId}`.
- `goToTrack(trackId: string)` — drives to the first unprepared gate (or first gate).
- `chooseBranch(crossingId: string, branchId: string)` — preview only; drives onto that branch. No financial/store mutation.
- `prepare(stopId: string, actionId: string): boolean` — `actionId` is **action.pick.id**. Adds the real model pick via `store.addPlanItem`, idempotently; emits stepAdded. Returns false for invalid/already-added/locked actions. Disable buttons when the pick is in `store.plan`.
- `dismissGate()` — closes the panel and releases the paused car to continue.

Panels added: `{type:'mapStop',id:string}` and `{type:'mapFork',id:string}`. Reaching a gate or crossing pauses safely and opens that panel. Passing the same gate again does not repeatedly force it open until you leave it. The HUD owns wording, layout, intro and confirmation UI.

An explicit `focus={{kind:'journey',id}}` resolves MapStop.id, MapStop.cityFocus, MapTrack.id or MapTrack.roadId before legacy place destinations. No automatic street tour in v7.1 (WS6 owns the first-open intro); the manual tour API remains.

World coordinates: neighbourhood Home Street and Market Mile stay inside a small ring. Model tracks radiate out; dates set checkpoint distances with a compressed scale (`dayDistance`) for long horizons. A crossing renders real diverging branch lanes. Prepared gates glow green and prepared segments light up. All tap routes use the same network as keyboard driving.

Scene integration: `useGame().mapNetwork` exposes `gates: {stop,pathId,s,pos:{x,z},heading}[]`, `forks: {crossing,pathId,s,pos,heading}[]`, and `trackPaths: Record<string,Path>`. Use these positions in the screen-space label layer. Text stays out of the 3D meshes. `rt.current.paused` is writable for the first-open intro.

### v7.2 — quiet checkpoints

`mapNetwork.gates` remains the complete addressable stop geometry for explicit focus/tap navigation. `majorGates` is the shared-model major subset: only these auto-stop and render arches. `bundles` has one roadside marker per minor month: `{bundle, trackId, pathId, s, pos, heading, title}`; project `title` (`October bills · 4`) at `pos` with height 5. Minor drive-throughs emit `minorPassed` with `stopId` and `trackId`, once per session, and never open panels.

`dismissGate()` (also `setPanel(null)`) clears travel/held input and starts a 3-second automatic gate cooldown. Keep exploring should dismiss, not select an arbitrary incomplete stop. `nextGate` and `goToTrack` select major stops. Explicit `goToStop` remains available for any model stop; minor destinations emit `minorPassed` and keep the panel closed. Driving triggers gates only on forward approach and cannot snap back into passed gates. At most the closest major arch and one faint preview render; arches within 8 metres horizontally of the camera are hidden after the camera update.

Fork signboards also hide within 18 metres of the camera or when they would obscure the car.

With no `focus`, Player starts on Home Street; pass a journey focus only for a deliberate checkpoint entry.
