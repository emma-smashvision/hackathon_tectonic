# v8 crowd adapter

Import from `src/one/crowd` (the `index.ts` barrel). Pure, local TypeScript; no HTTP API, React, storage, requests or model calls. The Hindsight engine remains the source of catalogue definitions, synthetic populations, stop simulations, fork comparisons and privacy gates. `people.ts` is read-only. This module creates no personal dates or new life situations.

## Quick use

```ts
import {
  catalogueFor, pointersFor, previewRoad, confirmRoad, roadViewFor,
  stopEvidenceFor, forkEvidenceFor, findRoad, homeCardFor,
} from "@/one/crowd";

const pointers = pointersFor("tom"); // PersonRoad objects also accepted
const roads = catalogueFor(pointers);
const view = roadViewFor("tom");
const stop = stopEvidenceFor("moving-house", "energy-new-address");
const preview = previewRoad(pointers, "first-home");
// preview.confirmed is still Moving house; no plan or source person was changed.
const previewView = roadViewFor("tom", "first-home", { pointers: preview });
const match = findRoad("I am planning to go freelance");
// After an explicit confirmation in the UI, use a user-confirmed stage:
const confirmed = confirmRoad(preview, "first-home", {
  month: 0, label: "Before the keys", date: null,
});
```

## Public contract

| Export | Returns / use |
|---|---|
| `catalogue` | Read-only 14 entries: 12 live life roads, Everyday, Heat-pump under review. |
| `catalogueRoad(id)` | Entry or `undefined`; `id,name,tagline,group,status,months,care,hue,driverCount,currentCount,synthetic,disclosure`. Groups: Home, Work, Family, Abroad, Later life, Support. Status: `live` or `review`. Caring for a parent is care and Support. |
| `pointersFor(person)` | `{personId,everyday,confirmed,exploring,past,largeSimple}`. `confirmed` is a single `RoadPointer` or null. Every life pointer has `roadId,provenance,stage`; stage has `month,label,date`. Date is the event date, not an invented consent timestamp. Everyday has no claim of life-event consent. |
| `catalogueFor(personOrPointers)` | Catalogue with `badge`: `On now`, `Exploring`, `Past`, `Under review`, or null. |
| `previewRoad(pointers,id,stage?)` | New pointers with a preview; never changes confirmed placement, source persona, past roads or any plan. Unknown stage has null month/date. |
| `confirmRoad(pointers,id,stage)` | Pure explicit-confirmation transition; replaces the one confirmed life pointer, marks provenance `told`, removes that preview. Requires a valid month and optional ISO event date. Unknown/review/Everyday roads cannot become confirmed life roads. The UI owns consent and persistence. |
| `roadViewFor(person,roadId?,options?)` | View or null for unknown road. Default = confirmed life road, then existing preview, then Everyday. `{road,roadId,position,available,reason,care,largeSimple,canDrive,canNudge,ghostGroups,convoy,stops,nextStops,fork,synthetic,disclosure}`. Position has stage fields plus `confirmed,preview,provenance`. Stops use stable identities plus `title,short,kind,month,offset,year,passed`. Everyday wraps into next year; life-road `offset` is relative to the supplied stage. Unknown preview stage is not a personal position. |
| `stopEvidenceFor(roadId,stopId,options?)` | Stop evidence or null for unknown/review road/stop. `{roadId,stopId,id,title,short,month,kind,available,reason,denominator,surprised,helped,noteCount,notes,actions,synthetic,disclosure}`. Care without opt-in returns an unavailable shell with no values, notes or actions. |
| `forkEvidenceFor(roadId,{likeYou?,careOptIn?})` | Fork or null. `comparisons` contains all-road outcomes at horizons 1 and 3 years; `subgroup` contains the same horizons for supplied buffer/income bands. Each comparison has a gated denominator and branches with `id,label,driverCount,share,metrics`. Each metric has `key,label,kind,goodHigh,value`. Karim's matching subgroups are correctly withheld. |
| `questionsFor(roadId,options?)` | Adviser questions with gated `share` and `denominator`; requires care opt-in and a published road. These are road-level question frequencies, not invented per-stop frequencies. |
| `findRoad(text)` | `{kind:'match',match,choices:[match]}`, `{kind:'choices',choices}`, or `{kind:'none',choices:[],message:'No published road yet'}`. Each match has `roadId,name,suggestedStage` (`before/during/after/exploring`). Local synonyms only; never numbers, placement, dates or evidence. Heat-pump can match but stays review-only. |
| `homeCardFor(person,options?)` | One card or null: `{roadId,stopId,id,title,line,button,source,synthetic,disclosure}`. A gated cohort-backed synthetic note or gated outcome line. Nadia gets a person-first invitation until opt-in. |
| `stopKey({roadId,stopId})` | Composite `<roadId>:<stopId>`. Use the pair, not stopId alone, across Map, Drive, Home, nudge, Kate, adviser and Notes. |

Exported types include `CatalogueRoad, RoadGroup, PersonPointers, RoadPointer, RoadStage, Provenance, CrowdNumber, StopRef, StopEvidence, CrowdAction, HelpedAction, EvidenceBin, EvidenceOptions, ForkOptions, RoadViewOptions, HomeCrowdCard, RoadMatchResult`. Constants: `EVERYDAY_ONLY_ID`, `CROWD_MIN` (500), `SYNTHETIC_LABEL`.

## Stable IDs and seed placement

| Person | Confirmed | Preview | Relevant past |
|---|---|---|---|
| Tom | `moving-house`, month 0, told, before `2026-11-01` | None | Source passport |
| Karim | `freelance`, month 20, told, no precise start date | None | `first-home`, completed 2012 |
| Sofie & Pieter (`sofie`) | None | `first-home`, suggested, null month/date | Source passport |
| Lina | None | None | Source passport |
| Margaret | None; Large & simple | None | `retirement`, completed 2016 |
| Nadia | `losing-parent`, month 1, told, no precise event date | None | Source passport |

Every person also has `everyday-only`, October (the engine's fixed demo calendar). Existing `persona.driven` roads are copied as completed; none are inferred from balances or activity.

Tom's Home card opens `moving-house / energy-new-address`. Sofie's opens `first-home / energy-settlement`. Karim's opens `freelance / company`; fork branch IDs are `sole` and `bv`. Everyday uses public road ID `everyday-only` and bare stop IDs such as `december` and `school`; its internal simulation still uses the engine's `everyday`. Recurring plan keys retain `ev:<stopId>:<year>`.

## Number and evidence rules

Every **crowd measurement** is a `CrowdNumber`: `{shown:boolean,value:number|null,reason:string}`. Render only `.value` when shown. Withheld is always null with a reason; no raw `n` or small sample size escapes. All counts, rates, money, histogram cells, ghost densities, fork subgroups and adviser question shares pass `gate*`. Configuration (road duration, stop month, horizon), known personal stages/dates and explicit plan amounts are not crowd measurements.

`surprised` has `label,share,median,threshold,range`. For costs, `share` means the simulated cost exceeded capacity to absorb it; it is not a survey of emotional surprise. For milestones the label describes the actual measured event. Boosts have no made-up surprise percentage. Range is a histogram of `{id,lower,upper,count,share}`; each bin needs its own minimum crowd, and the last upper bound is withheld as open-ended. It is not a claimed percentile interval.

`helped` is sorted descending by **published P(calm | took action)** via engine `calmIf`, not the inverse P(action | calm), product value, readiness or margin. Each item includes `outcome,denominator,association,kbcProduct,action`. Unavailable outcomes sort last. Wording says **associated with**, never causes. Non-product meter photographs, reminders, checks and other actions remain alongside product actions.

`noteCount` counts actual seed notes and therefore is withheld below 500. Never fabricate a large contribution count from alumni. `notes` are explicitly synthetic illustrative excerpts; their availability requires a published road cohort. This adapter does not contain or count user-submitted Notes API records. The Notes workstream owns their moderation and persistence.

Ghosts are aggregate equal-width **illustrative synthetic stage bins**, calculated from engine alumni divided by road months. They are not tracked people or a measured travel-time distribution. Each group includes its `basis` label. Count/density is withheld if the bin is too small. Care and Large & simple have no ghosts. Care never enables Drive or nudges, even after opt-in. Review roads have no counts, stops, evidence, fork outcomes or actions.

## Actions and integration

`EvidenceOptions` accepts `careOptIn,life,advisor,year`. `RoadViewOptions` adds `pointers,largeSimple`. Supply a real `LifeState` for confirmed placement when an existing action needs a date: `stopEvidenceFor(id,stop,{life,advisor})`. The adapter uses the engine's `specForTip` and the same `tip:<roadId>:<key>:<actionId>` pick IDs. `CrowdAction` has `id,label,kind,kbcProduct,source,pick`; kind is reminder/checklist/adviser-question. A preview without replay saves an undated checklist/question; it never invents a personal date or moves money. Passing a live replay is the caller's responsibility. Use `pick` with the existing plan store on an explicit tap; merely asking for evidence has no side effects.

`roadViewFor` includes definitions and fork comparisons, not all stop simulations. Load `stopEvidenceFor` on sheet open. Notes/Drive/Map can all reuse the same `{roadId,stopId}`. Keep `disclosure` visible. A care Home invitation is not authorization for unsolicited care nudges.

## Verification

`bun test src/one/crowd` covers all six personas, preview purity, confirmation validation, all catalogue evidence, suppressed histogram cells, boundary 499/500, real fork subgroups, outcome ranking, product flags, existing action picks, matching and Home identities. Run `bun run typecheck` and `bun run test` from `kbc-one-v8` for repository checks. This module has no UI; consumer workstreams own browser layout and end-to-end channel checks.

The browser-targeted bundle also passed a headless Chrome check on port 3501: all six views/cards, preview purity, matching, the withheld Karim subgroup, non-product actions and care/Large & simple rules. No page errors. `docs/screenshots/v8-model-browser.png` is explicitly a model test report, not a screenshot of the integrated consumer UI.
