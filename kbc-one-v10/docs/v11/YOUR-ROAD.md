# Your road · round 2

## Purpose
One place to see what is next, prepare one step, and enter your city or world. Every profile has the same access. Care remains a separate, consent-first path.

## Layout and visual direction
Use the existing IBM Plex Sans body and Space Grotesk headings. Night ink #091522, glass #102638, muted blue #a3b9ca, Home cyan #59dcff, Savings mint #68e4bb, Car amber #ffc478, Pension lilac #c2a3ff. Area colour identifies information; it never ranks wealth.

```
Your road                     All roads
Now · [active road]       [Calm mode]
     You ━━━━━ • • • ━━━ next stop
First energy bill · [countdown]
[one published crowd insight]
[Open your world] [Drive it]

Next 12 months              [date range]
DATE  ● area · title       prepared ✓ / not yet
      [small crowd visual]            [one action]

Your areas                 Your demo numbers
[ring] Home  [ring] Savings  [ring] Pension
[locked area + exact unlock hint]
One disclosure footer
```

The track is the visual focus. The timeline is a continuous list, not a stack of identical panels. It merges all confirmed and explored road stops, Everyday dates, and known insurance renewals. Unknown life dates stay “When you’re ready” or relative months; no invented appointment date. Each row has one action: Learn (1 min) with the shared LessonCard where a lesson exists, Remind me for dated preparation, or Drive it for a mapped mission. A saved reminder is labelled separately and does not falsely mean the lesson is prepared.

## Data and interactions
- Read published crowd evidence only. Show a proportion of dots or a tiny bar with an accessible text equivalent. Suppressed values remain suppressed; decorative track dots are explicitly illustrative groups, not individual people.
- Use the replay date, not the system clock, for countdowns. Format dates as 2 Nov 2026. The next stop highlights the next available lesson on the active road; the merged timeline is date sorted.
- Use saved lesson completion and actual plan actions for preparation. Reminders save into the existing local plan.
- Area rings use the person's own goal saved/target, pension paid/limit, and mortgage principal repaid. Where no numeric target exists, show an open ring and an honest label, not a fabricated percent.
- Locked areas explain a life event, goal, or existing holding that opens them. “All roads” provides exploration without silently confirming a life event.
- `onWorld?` is an optional RoadTab callback for v11. Hide its button when absent. `onDrive` opens the v10 city, with an exact lesson focus when one exists.

## Access and Calm mode
- Home and Your road expose a city entry for all six profiles. Existing care support and plain lesson entries remain available.
- Margaret and Large & simple use larger type, at least 52 px controls, and at most 3 timeline rows per page. Paging keeps the rest of the year available.
- Calm city uses the real v10 night scene and engine, autopilot destinations only, large labels, and plain mission cards. Home, Savings and Pension embed the shared P1 PlaceView after arrival. There are no steering controls or required guesses. It works in portrait as well as stage view.
- Nadia can enter the city for Home, Savings and Everyday. Her care road never enters the game. Care evidence appears only after consent for that specific road, with no crowd track or game actions on care rows.
- Respect reduced motion; use one brief track entrance otherwise. Keyboard focus, sheet focus restoration, status announcements, and one disclosure footer.

## Verification
Run dev with KBC_AI=off on 3714 once to generate next-env.d.ts. Run typecheck and the full test suite. Verify Home and road city entry for all six profiles in headless Chrome at 390 × 844 and the stage view. Check Calm autopilot, lesson and reminder actions, care consent, empty targets, date ordering, no horizontal overflow, and console errors. Save r2-road-*.png under docs/screenshots.

## Round 2 verification record

- Dev server: `KBC_AI=off bun run dev --port 3714`, started once before typecheck.
- `bun run typecheck`: passed. Shared P1 image declarations also make the image imports explicit.
- `bun run test`: 212 Bun tests + 48 engine tests passed (260 total). Includes 9 road-model checks for chronology, source-backed ratios, privacy gates, reminders, and separate consent per care road.
- `src/one/yourroad/browser-check.cjs`: all 6 personas × 2 sizes passed. Home and Your road entry, exact lesson sheets, reminders, Margaret plain completion, Savings contents, Nadia care consent, focus/exit paths, one road footer, and no horizontal overflow. No page errors.
- Road/Home viewports: 390 × 844 and 1512 × 982. Standard driving uses the existing phone rotation cue and was checked at 844 × 390 after rotation. Margaret and Nadia enter the real city directly in portrait Calm mode.
- `visual-check.cjs`: final colour and font checks, 54 px Calm controls, reduced-motion/static track and normal track entrance, and fresh road/area captures at both sizes.
- `calm-check.cjs`: motion-enabled autopilot, Stop here, Arrive now, Savings contents, and return to app.
- `place-visual-check.cjs`: final embedded Savings text, full opacity and 54 px controls passed in a DOM-only check; its scene is hidden before layout so no GPU renderer starts.
- Evidence: `docs/screenshots/r2-road-*.png`; the 12-case functional record is `r2-road-verification.json`.

P1 shared place commits are integrated; WU has the optional `onWorld` callback and the final contrast fixes. No changes were pushed.
