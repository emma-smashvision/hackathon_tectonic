# Drive this road

`DriveThisRoad` is the optional fullscreen 3D view of one crowd road. Import from `src/hindsight/game/DriveThisRoad` or `src/one/LandscapeCity`.

```tsx
<DriveThisRoad
  person={person}
  roadId={focus.roadId}
  stopId={focus.stopId}
  onExit={(roadId, stopId) => { setFocus({roadId, stopId}); setDrive(false); }}
/>
```

Required props: `{person: PersonRoad | string, roadId: string, stopId?: string, onExit(roadId: string, stopId?: string): void}`. Optional `pointers?: PersonPointers` preserves the host's live confirmed/exploring stage; `large?: boolean` suppresses Drive for user-selected Large & simple. The person must be a known synthetic persona. Mount inside the existing `StoreProvider` for shared stop actions and notes. Unmount when Map view calls `onExit`. The component returns null for care, unpublished roads, and Large & simple (including Margaret).

WS-E owns App integration; WS-B supplies `onDrive(roadId,stopId?)` on RoadTab. Host hookup is marked `// v8-drive`. No App source is owned here.

One world unit mapping is fixed: 10 units = 1 month. The camera and blue preview car move; the actual-position marker remains at `roadViewFor(...).position.month`. An unknown preview such as Sofie's has no invented personal position or date. Selected stop identity survives Map ↔ Drive. Calendar stops wrap forward into the next year.

“Show me ahead →” travels for about 3 seconds, then mounts WS-B's exact `RoadStopSheet`. Fork stops use WS-B's `RoadForkSheet`. Both branch controls preview the fork and open the same comparison; they never select a real financial choice. No plan, placement, or date changes through driving. Holding arrows moves only along the lane and stops at evidence. Reduced motion cuts directly to the destination. Map view returns the selected road and stop, including when a travel is interrupted.

All ghost groups come from `roadViewFor`. Both count and density must be published. Paired translucent vehicles are one aggregate illustration, never individual people or literal counts. Care and withheld groups do not render ghosts. Stop signs, help boards, and synthetic notes use `stopEvidenceFor`. The shared sheets own save actions, notes, comparison gates, and disclosure.

The scene uses simple local geometry, demand rendering, capped pixel ratio (1.25), no textures, physics, shadows, postprocessing, city assets, or downloaded models. Ghost drift redraws at about 14 fps; reduced motion disables it. Window listeners, timers, observers, and travel frames clean up on unmount.

The legacy presenter `City` export is a small adapter to this component. `next.ts` remains because the legacy phone route imports its gated next-road data. The now-unreferenced `TripDebrief.tsx` and `CitySession` were also removed. All other old city scene/HUD/runtime/asset-network code is removed.

## Verification (port 3506)

The isolated browser fixture mounts the real component and existing StoreProvider. Screenshots `docs/screenshots/v8-drive-{tom,karim,sofie,lina}.png` show the first frame. `tom-stop`, `karim-sole`, `karim-company`, and `sofie-stop` show the actual shared sheets. Tom's Map callback returns `moving-house:setting-up`; his marker remains month 0. Karim can preview both branches and switch from withheld subgroup outcomes to Everyone; his marker remains month 20. Sofie has no actual marker or invented date. Her reduced-motion journey opened the sheet in 68 ms on this test run. Margaret and Nadia return null. No browser page errors occurred. These screenshots establish component behavior; an uncoached person's 10-second comprehension test still requires a person.

`bun run typecheck` and `bun run test` pass. Seven Drive tests cover unchanged placement, fork identity, unknown previews, care/large suppression, both ghost gates, live pointer handoff, and calendar rollover. Retired city geometry tests were removed from `tests/city.test.ts`, `tests/landmarks.test.ts`, and `tests/world.test.ts`; retained world-engine tests and next-road gates remain.

At 390 × 844 px, the title, Map button, surprise/help boards, fixed position, and primary action remain readable with no horizontal page overflow (`v8-drive-mobile.png`). Holding an arrow moves the preview along its lane even when the primary button has focus; the actual marker stays fixed.
