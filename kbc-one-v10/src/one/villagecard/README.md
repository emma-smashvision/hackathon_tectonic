# W3 village entry

`App.tsx` owns the open mode and return to Home. `HomeMix.tsx` exposes a React card slot after the unchanged first bubble screen. The full card fits directly after one scroll at 390×844; the bubble geometry, prompt chips, dock and Kate look controls are unchanged.

- Tom, Karim, Sofie and Lina: `LandscapeCity({ personaId, focusLessonId?, frameRef, onExit, onPlain })` owns the turn and `VillageGame`.
- Margaret, or another persona with a Large & simple look: `PlainPath` hosts the same `LessonCard variant="plain"`, an optional live village picture and an adviser question screen. No rotation.
- Nadia: a quiet support card opens `CareEntry`. “Not now” does not opt in. Only the explicit “Show what helped others…” action calls the existing care-consent store and opens the care road. The adviser path saves a question on request, without sending a message or making an appointment.

Progress comes from W2's `useVillageProgress`; the entry layer never awards a lesson. The Home picture and progress react to completed lessons. Receipts compare saved IDs at entry and exit, so declining a save cannot produce a false saved-reminder message. Other saved steps are labelled “Step saved”. Persona changes clear the active entry and receipt.

The road-tab callback maps both bare and composite crowd stop IDs to persona-scoped lesson IDs. It retains the selected stop after its sheet closes. Unsupported lesson topics stay in the existing plain road explanation. Existing v8 `DriveThisRoad` is no longer mounted by App.

## Verification

Run `bun run typecheck` and `bun run test` from `kbc-one-v9`. For the browser run, start `KBC_AI=off bun run next dev -p 3603`, then:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node src/one/villagecard/browser-check.cjs
```

The script uses an isolated headless Chrome session, captures `docs/screenshots/v9-entry-*.png`, and checks all six personas, 390×844 Home/card visibility, shared lesson completion, saved/declined receipts, care consent, the road-tab focus, reduced and full motion, game → plain hand-off and persona-switch cleanup. `ENTRY_URL` can override the verification port.

The demo progress store records saved steps in this browser. It does not schedule real notifications. Village pictures represent lesson progress, not wealth or holdings. Crowd evidence belongs to W2's gated content; the entry card invents no cohort counts.

Final W3 check on port 3603 passed: 176 Bun tests plus 48 engine tests, typecheck, all six integrated persona paths, exact setting-up lesson entry, full turn, plain hand-off and persona reset. The browser recorded no page errors and saved 27 screenshots. Home/plain were checked at 390×844; playable lesson screens at 1366×768. W1 owns the physical mobile orientation treatment.
