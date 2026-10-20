# v9 learning + village contract

Import from `@/one/learning`. Local synthetic demo content; no HTTP service.
Seven authored lessons cover Tom ×3, Karim, Sofie & Pieter, Lina and Margaret. Nadia stays on the consent-first care path.

| Export | Contract |
| --- | --- |
| `lessonsFor(personaId: string): Lesson[]` | Ordered lessons. Tom starts with energy, then setup, then deposit. Unknown/care personas return `[]`. |
| `lessonById(id: string): Lesson \| undefined` | Exact persona-scoped ID, e.g. `tom:energy-new-address`. |
| `villageFor(personaId: string): Village` | Four base plots with amount-free summaries; a fifth only for known business/family context (Karim, Sofie & Pieter, Lina with Noor). The host renders the unused slot as a garden. Optional lesson destination. Margaret and Nadia have `playable:false`. |
| `useVillageProgress(personaId: string): VillageProgressStore` | `{personaId, done:string[], saved:string[], complete(lessonId), save(actionId), reset()}`. |
| `LessonCard` | `{lesson:Lesson, variant:"game"\|"plain", onStep?:(progress:LessonProgress)=>void, onDone?:(progress:LessonProgress)=>void}`. |

All existing types from `learning/types.ts` and `village/types.ts` are re-exported, plus `LessonCardProps` and `VillageProgressStore`.
The shared contract adds only optional `Lesson.reveal.table: {caption:string, columns:string[], rows:string[][]}` for compact gated fork comparisons. `Lesson.stopId` is the **composite** crowd identity (`moving-house:energy-new-address`), while `Lesson.id` is persona-scoped (`tom:energy-new-address`). Match focus requests against either as needed.

| Persona | Lesson IDs | Destination / mode |
| --- | --- | --- |
| Tom | `tom:energy-new-address`, `tom:setting-up`, `tom:old-deposit` | New flat in Gent / game |
| Karim | `karim:company` | Your workshop / game; both exploration choices earn equally |
| Sofie & Pieter | `sofie:energy-settlement` | Your family courtyard / first-home preview, no invented purchase date |
| Lina | `lina:december` | Your winter garden / Everyday |
| Margaret | `margaret:energy-year` | Your village garden / plain; optional opening question |
| Nadia | none | No destination, lessons or rewards |

```tsx
const lessons = lessonsFor(personaId);
const village = villageFor(personaId);
const progress = useVillageProgress(personaId);
const next = lessons.find(l => !progress.done.includes(l.id));
return next && <LessonCard lesson={next} variant="game"
  onStep={p => { /* p.step === 'apply': provisional pave animation only */ }}
  onDone={p => { /* completed, persisted: build floor / show stamp */ }} />;
```

The card owns local step state and saves/completes progress itself **before** `onDone`. Consumers must not award at guess, reveal or pave. `onStep` runs on user transitions (including `done`), not initial mount. Game starts at `guess`; plain starts directly at `reveal` with an optional opening question. The `apply` transition after “Pave this bump” is only a preview; durable paving/floors/stamps derive from `done`. A correct new-case answer is required before Save/Not now. Both finish equally; replay is idempotent. Wrong answers explain the principle and allow retry. Changing lesson IDs resets the card. Unmounting an unfinished lesson does not award anything.

Progress persists at `kbcone.v9.village:<personaId>`, synchronises same-tab subscribers and storage events across tabs, and has an empty stable SSR snapshot. Invalid/cross-persona IDs are ignored. Storage errors retain in-memory progress. `reset()` affects the current persona only. `save(id)` stores an explicit action ID, never awards a lesson, and does not execute a payment, notification or booking. `Lesson.save.pick` is the existing crowd pick **ID**, not a `TripPick` object. A consumer that wants to write the existing plan must resolve that pick using `stopEvidenceFor` with the actual confirmed life context, then use its existing plan store on explicit save. This module deliberately records a demo step only.

The host renders one footer: **Synthetic demo crowd · not a forecast**. The card does not duplicate it or add per-card demo disclaimers. Crowd measurements come only from gated `src/one/crowd` values. Reveals use rounded “1 in N” phrasing only within one percentage point of the published rate, otherwise a percentage. “Typical” amounts are the gated medians. What helped has exactly one “Associated with these actions, not proof of cause.” line. Notes retain their synthetic source text with short attributions; dates appear only when provided by the source. Plot summaries contain no amounts, so they cannot bypass the app's privacy setting. These lesson buildings represent learning, not holdings or wealth.

Game: mount in the right-side panel (about 440px wide), leave the world visible. Plain: mount at full phone width; no rotation or car language. Nadia has no lessons, destination or rewards: route to the existing consent-first care UI. Host owns close/back, the world, the shared footer, and any actual plan-store hookup.

## Verification

`bun run typecheck` and `bun run test` pass: 178 Bun tests and 48 engine tests, including 10 learning/progress checks. They cover persona IDs, crowd publication gates, readable ratio bounds, concise copy, source-backed attributions, fork horizons, no invented fork notes, idempotent rewards, invalid storage, cross-persona isolation, care exclusions and SSR without browser storage.

`/dev/learning?p=tom` mounts the owned `LearningPreview` story through one tiny `// v9-w2` hook in `src/app/dev/learning/page.tsx`. The route returns not-found in production. Use `?p=margaret&variant=plain` for large cards. This is a component test story, not the integrated village/Home game.

Run the reproducible headless check from this app folder:

```sh
KBC_AI=off bunx next dev -p 3602
PLAYWRIGHT_MODULE=/path/to/playwright-core CHROMIUM_PATH=/path/to/chrome node src/one/learning/browser-check.cjs
```

It checks all six personas and seven lessons; both Karim branches; correct/incorrect application, Save/Not now, replay without extra rewards, reload persistence, two same-tab hook subscribers, cross-tab reset, persona isolation, unavailable storage, keyboard focus, and 390px plain layout. Screenshots are `docs/screenshots/v9-learning-*.png`. Reviewed game guess/helped/apply against V9Guess/V9Reveal/V9Apply and the light cards against V9Plain. No browser page errors. The host still owns validation of Home receipts, actual plan writes, world/crane animation and the phone transition.
