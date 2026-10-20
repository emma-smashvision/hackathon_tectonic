## Round-2 all-profile access (r2-wu)

Every known profile now has `playable: true`. Margaret uses `mode: "calm"`;
her UI offers plain lessons, large tap controls and no storm urgency. Nadia uses
`mode: "game"` for ordinary Home, Savings and Work districts. Her care district
stays locked until `careOptIn`, has no quests, stages, storms or financial data,
and accepts no game unlock actions. Ordinary Nadia goals, unlocks and lessons use
the same validated persona-local store as other profiles. Her source mortgage
bill is €720/month; no principal balance or repayment percentage is invented.
Unknown profile IDs remain non-playable. This supersedes the earlier whole-profile
care/plain gating described below. The orchestrator assigned these minimal model
changes to WU after WM completed round 2.

# v11 world model

Import from `@/one/world`. Pure synthetic local data, except the optional React progress hook.

| Export | Contract |
| --- | --- |
| `worldFor(personaId, progress?, options?)` | `World`: name, mode (`game/plain/care`), playable, areas, storms, signposts, lanterns, kids, today, disclosure. |
| `stormsFor(personaId, progress?, options?)` | `WorldStorm[]`: stable id, areaId, roadId, **bare** stopId, dueDate, daysAway, dateBasis, gated share/denominator, lessonId, saveId, prepared/status, repairQuestId. |
| `worldAhead(personaId, areaId)` | Gated `WorldAhead` with denominator, basis, buildOrder, stormHits. Never an individual neighbour. |
| `signpostsFor(personaId, areaId?, notes = [])` | Approved Notes API records only. Actual useful counts; no seeded activity. |
| `kidsWorldFor(personaId, progress?)` | Sofie/Lina parent-only mini-world, otherwise null. Sofie is explicitly a preview: source has no child record. |
| `questsFor(personaId, areaId)` | `Lesson[]`, directly usable in `LessonCard`. |
| `worldLessonsFor(personaId)` / `worldLessonById(id)` | World quest catalogue / exact persona-scoped lookup. |
| `useWorldProgress(personaId)` | Existing village store `{personaId,done,saved,unlocks?,complete,save,reset}` plus `prepareStorm(stormId)` and `unlockArea(areaId,key,goal?)`. Preparation saves only after lesson completion. |
| `AREA_CATALOGUE`, `WORLD_TODAY`, `WORLD_DISCLOSURE` | Stable area definitions; source calendar `2026-10-17`; single host footer. |

Types: `AreaId, WorldStage, WorldProgress, WorldGoal, AreaDefinition, WorldArea, WorldStorm, WorldSignpost, WorldAhead, KidsMiniWorld, WorldOptions, World, WorldProgressStore`.

```tsx
const progress = useWorldProgress(personaId);
const world = worldFor(personaId, progress);
// WorldScene: world.areas have id/title/hue, stage 0–4, locked/explore,
// quests: Lesson[], goals with percent 0–100, storms, signposts, lanterns.
// UI: <LessonCard lesson={area.quests[0]} variant={world.mode === 'plain' ? 'plain' : 'game'} />
// onDrive receives the quest.id; shell resolves worldLessonById(id).
```

Stable area IDs: `home,car,family,kids,savings,investments,pension,work,abroad,private-banking,care`.
Exploration does not change placement, progress, goals, or dates. Locked areas have stage 0.
`WorldOptions` accepts `careOptIn`, `notes` (fetched Notes API records), `today` (ISO demo clock).
Nadia has no quests, storms, rewards, lanterns, or kids world. Care needs opt-in; no game after consent.
Margaret receives the plain mode. Never use euro balances to size plots. `area.goals` exposes percentages; `area.finance` also exposes personal amounts for panels.
A storm shield requires both the lesson completion and its saved action. “Not now” still builds through learning.
A missed storm gives a repair quest; no building is removed. Shares and denominators are `CrowdNumber`: render only when shown.
Tom's energy date is estimated from the confirmed 1 November move plus source stop month 3; it is **not** an invented storm in 3 weeks.
Everyday dates are the fixed synthetic seasonal calendar, not personal bill deadlines. Undated previews stay undated.
## Authored paths and progress

Every initially active area for Tom, Karim, Sofie, Lina and Margaret has at least 2 quests. Newly unlocked areas expose available authored quests; no unsupported lesson is invented.
Original 7 lessons keep their IDs. New IDs use `<persona>:world-<area>-<key>`.
`worldLessonsFor` also contains Sofie's 2 parent co-build preview quests. The tiny
`// v11-wa` hook in village/progress.ts validates these IDs in the existing
`kbcone.v9.village:<personaId>` store. LessonCard saves/completes before onDone;
all same-tab, cross-tab, SSR, storage fallback and reset behavior remains shared.
Invalid, duplicate and cross-persona progress is rejected. No second progress
key, child profile, money transfer, notification or account action is created.
The 2 investment quests are education-only, with no crowd figures or product
reward. Their `education-investments` road ID is explicitly not an engine road.
No synthetic engine road was needed. Only offer Drive when the v10 mission
catalogue has the exact quest; original lessons remain directly driveable.

Sofie and Pieter share the `sofie` persona and family progress; this is a local
demo shared view, not cross-account synchronization. Their kids preview contains
no child name, account or invented goal. Lina uses only the existing Noor name.
Both mini-worlds have `publicSharing:false`; do not show a public composer,
world-ahead comparison or children's social counts there. Parent co-build
completion uses the parent progress store. A preview never unlocks an adult area.

Stages are `floor(max(4 × ownFinanceFraction, 4 × completedQuestFraction,
preparedStorm ? 1 : 0, explicitUnlock ? 1 : 0))`, capped at 4. Locked/care areas stay at 0. Own goals are
rounded percentages from existing target/saved values. Scene geometry uses `finance.percent`/`finance.stage`; personal amounts are for panel facts.
Prepared storms require both completion and a saved step. Time passing never
reduces a stage. Occurrences stay anchored to WORLD_TODAY, so advancing the demo
clock beyond a date produces a repair quest instead of silently rolling the
storm to next year. Tom’s car renewal remains in `finance.car` as 2 Nov 2026 (+8%); it is not a second storm. His single storm is Home energy on 1 Feb 2027.

## Worlds ahead and notes

`worldAhead` combines two explicitly distinct sources. Build order comes from
`ahead.ts` authored synthetic aggregate fixtures, 2400 anonymous adult paths per
broad life context. These are not observed customer behavior. The selected rank
must have ≥500 supporting paths; count/rate values pass the existing noise,
rounding and publication gates. Source crowd storm hits retain their own gated
denominator and come from stops within 24 months. The `basis` string states the
limit. Locked, care, unknown and kids areas return no aggregate. The model never
claims an individual neighbour, matched financial profile or personal forecast.

`signpostsFor` accepts fetched approved Notes API records; duplicate IDs are
collapsed. Only useful events on one's own records produce lanterns and the area
Guide flag. An empty feed means zero lanterns. No “read by” count is fabricated.
Totals describe supplied records, not a lifetime total outside the fetched feed.
The minimal notes extension is documented in `../notes8/README.md`:
`useNotes(scope).markUseful(id)` calls POST `{action:'useful', id, ownerToken}`.
Self-votes/pending notes are rejected; retrying the same reader token is
idempotent; reset removes feedback. Never add a lantern optimistically.

## Verification

`bun test src/one/world` verifies all personas, every active area, source-backed
reveals, original IDs, authored persistence, idempotence, SSR, privacy gates,
preview purity, percentages, fixed dates, shields/repair, care/plain modes, parent
co-build isolation and reviewed useful feedback. Tests exercise actual local
Notes route handlers with controlled time, not an external mocked service.
World data is verified through these tests; WB/WC/WD own visual and integrated
browser checks. The shared crowd adapter remains the only crowd evidence source.

Round-two validation: `bun run typecheck` and `bun run test` pass (222 Bun tests + 48 engine tests). The concurrent
feedback regression sends 8 simultaneous retries and records exactly 1 event.

## Round 2: unlocks and finance API

```tsx
const progress = useWorldProgress(personaId);
// Include progress.unlocks in any worldFor useMemo dependencies.
const world = worldFor(personaId, progress);
// A deliberate tap confirms local demo intent; no bank account or road placement changes.
progress.unlockArea("kids", "life-event");
progress.unlockArea("kids", "goal", { label: "Uni savings", target: 100, saved: 0 });
// Existing products open an area automatically; the product key cannot invent ownership.
// Read-only preview: do not call complete/save/unlockArea from an Explore button.
const preview = exploreArea(personaId, "kids");
```

`area.unlock.keys` always contains `life-event`, `goal`, `existing-product`, each with
`label`, `hint`, `available`, `satisfied`, and optional source `roadId`. Render the
three keys as alternatives, not a three-part purchase requirement. `unlockedBy`
can also be `demo-context` for existing persona context. Every normal area can be
opened through explicit intent or a positive goal of any amount (including €0.01).
Care remains opt-in through `WorldOptions.careOptIn`; these actions cannot enable
care games. Nadia never gains unlocks, finance data, quests, or storms.

`unlockArea(state, areaId, key, goal?)` is the pure transition; the hook delegates
to `advanceProgress({type:'unlock',areaId,key,goal})` and the existing local-storage
key. Restore rejects unknown/care areas, invalid keys, fake existing products,
invalid amounts, duplicate entries, and cross-persona data. Reload, shared-tab
updates, storage fallback and reset use the existing store. Goal inputs are
`{label,target,saved?}`; saved defaults to zero. They are local demo plans, not
transfers. Reset removes explicit unlocks; source-backed areas remain available.

`exploreArea(personaId,areaId)` returns `{areaId,title,quests,crowd,disclosure}` or
null for care/unknown areas. It changes no progress, dates or placement. Crowd
entries retain `CrowdNumber` gates. Kids previews have no crowd comparison;
private banking and areas without authored source lessons have empty evidence.
`worldAhead` retains its separate authored-group publication gates.

`financeFor(personaId,areaId,progress?,today?)` and `area.finance` expose:

| Field | Use |
| --- | --- |
| `label` | Always **Your demo numbers**. |
| `percent`, `stage` | Own ratio 0–100 (or null when absent), stage 0–4. Use these for finance geometry. Learning still uses `area.stage`. |
| `summary`, `facts` | Human panel copy; amounts are local synthetic persona facts, not relative wealth. |
| `goals` | `{id,label,saved,target,monthly,percent,source}`; each goal uses its own target. Multiple goals have an unweighted mean for the area. |
| `attachments` | `{id,label,kind,visual}`. Also exposed as `area.attachments`. `visual` is shield/foundation/tank/tree/account. |
| `mortgage` | Original, repaid principal, remaining, own percent, payments made/total, computed monthly payment, fixed rate, balance insurance and home insurance. |
| `rent` | Current city, monthly/paid/paymentsMade (nullable), tenant cover, basis, optional `nextHome` with lease date and own goal percent. |
| `car` | Insurance, ISO renewal and formatted label, annual/previous premium, change %, nullable loan %, maintenance list. |
| `pension` | Contributions, the source demo yearly maximum, own %, nullable contribution years. This is not a claim about current statutory limits. |
| `child` | Existing child name/account balance and the explicitly chosen local child goal, or null goal. Parent-only. |

At the fixed 17 Oct 2026 snapshot, Karim has €118,051.23 principal repaid from
€240,000 (49%), with 176 of 300 scheduled payments. The shared `mortgageAt`
annuity convention counts payments **before the current month**. Payment history
is an estimate from the source schedule, not a transaction ledger. Rent counts
scheduled lease payments through the current due day and states this assumption.
Tom’s recorded lease starts in Gent on 1 Nov 2026; his current Leuven payment
history and amount are absent, so both remain null. His Gent flat fund is 72%.
Lina’s City trips goal is 45%; Sofie’s home goal is 69%. Karim’s pension is 83%
(€870 / €1,050); Sofie and Lina have 0% paid this year.

Source limits remain visible: no recorded pension contribution years, car loan,
maintenance reminders, solar ownership, or preset Noor goal. No amounts or
products are invented to fill those gaps. A parent can set a child goal through
the local goal action. A solar roof must not imply an owned product; a scene may
show an energy-learning improvement after preparation separately.

There is one stable demo storm for each non-care persona, even after preparation
or advancing the demo date. Tom’s is always Home energy. Nadia has none. ISO dates
remain machine fields; `formatWorldDate` produces `1 Jan 2027` in UTC, and all
storm/car/lease display labels use it. Missing dates stay missing.

`src/types/images.d.ts` references Next’s canonical `next/image-types/global`.
It defines no competing ambient modules. Verification ran full non-incremental
`bun run typecheck` with a Next declaration file present, then temporarily moved
`next-env.d.ts` aside and repeated it. Both pass; the original absent-file state
was restored. No temporary worktree was created.
