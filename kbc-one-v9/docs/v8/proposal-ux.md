# KBC One v8 — UX proposal: know your road in 5 seconds

## 1. Diagnosis

V7 puts a personal money calendar in front of the shared life roads. In [Tom’s screen](shots/ux-tom-road.png), insurance renewal occupies the centre; Moving house sits below. `src/one/roadmap/model.ts` starts with Everyday, adds bills, then attaches life tracks. `MapRoad.tsx` leads with assets and “0% ready”. Neither explains what earlier customers learned.

[Sofie’s screen](shots/ux-sofie-road.png) says “First home — Starts in Oct”, although `model.ts` says no purchase date exists. An appointment becomes an apparent life transition. [Margaret](shots/ux-margaret-road.png) gets readable bills and an adviser, but loses the crowd and road discovery. `RoadTab.tsx` separates simple/care customers from the map instead of offering equivalent content.

The original v4 README, `components/phone/{RoadView,RouteView,StopView,ForkView,NotesView,PassportView}.tsx` and `components/stage/Atlas.tsx` retain the stronger structure: position, crowd, choices, notes, privacy. The catalogue contains 12 live life roads, 1 pending road, plus Everyday—not 16. The [city](shots/ux-tom-city.png) adds another explanation task: places represent possessions, streets represent time, and driving represents progress.

## 2. Concept

Make Your road a readable transit system for life situations. Show the customer’s confirmed roads, their position, and one useful thing earlier travellers learned. A permanent All roads button opens the full network. Each stop explains a surprise, what helped, a next step and a note. The same content works as a diagram or a large text list; nobody must steer, zoom a canvas or learn game rules.

**Jury sentence: “See what surprised the people before you, before it surprises you.”**

## 3. Information architecture

| Place | Content and navigation |
|---|---|
| Home | Balances, payments, urgent tasks; one named road card links directly to its next useful stop. |
| Your road | Current roads first; “Moving house · before your move” and “Everyday · October”. Switch by named buttons. Keep All roads and Your plan visible. |
| All roads / atlas | All catalogue entries, searchable and grouped: Home, Work, Family, Later life, Support. Metro lines on wide screens; equivalent grouped list on phones. Current, Exploring and Past labels. Pending heat-pump road says “Under review”; no public insights yet. |
| Single road | Title, position, origin, next 3 stops, crowd evidence, notes and adviser. Show the whole timeline on request. |
| Kate | Understand a situation, suggest an existing road, explain the selected stop. Open that same road; never create a competing answer screen. |
| Notes | Read at each stop; road-level Notes includes past-road contributions and submission status. |
| Adviser | Persistent “Talk to [name]”. Preview the road, stop and plan shared before booking. Customer access history lives in “Your roads & privacy”, replacing Passport language. |
| City | Optional “View this road in 3D” inside a road. Guided next/previous stops; same title, position and cards. No driving requirement or exclusive actions. Exclude from the core pitch. |

A line crossing means a shared topic or optional connection, never an inevitable next life event. Two active roads can share an energy stop; show one task with both road labels.

**How roads appear:** “You told us” shows the statement and start date. “Suggested from activity” explains the signal and asks “Does this fit?” with Yes / Explore / Dismiss. Detection never silently activates a road. “You chose to explore” has no personal position until the customer explicitly adds it and supplies a date. Switching roads changes the view, not the customer’s life. Care roads require explicit disclosure and separate consent to reveal ahead. Newly discovered catalogue roads require human review before publication.

## 4. Road experience

1. **Orient:** title, position and origin appear above the fold. Example: “Moving house. You move on 1 November. You told Kate.”
2. **Look ahead:** a vertical line runs from now downward through later stops. Ghost dots mean groups of earlier travellers, never live identifiable people. Text gives the same information. Show “Earlier customers · anonymous groups of at least 500 · not a prediction”.
3. **Open a stop:** “What surprised people”, “What helped”, “Notes from people before you”. Separate the customer’s known bill from crowd ranges and approximate timing.
4. **Act:** one tap saves a reminder, checklist item or adviser question, with Undo. A money action opens its usual review screen. Replace readiness scores with “Reminder saved” or “2 steps saved”; a reminder does not make someone financially prepared.
5. **Return:** Back preserves the selected road and scroll position. Notes and adviser remain reachable without returning Home.

| Customer | Concrete sequence and value |
|---|---|
| Tom | Open Moving house → before-move marker → setup costs → read the second-hand tip → save a room-budget checklist. Everyday stays a separate switch.  |
| Karim | Open Going freelance → month 20 → upcoming sole-trader/company choice → compare crowd outcomes after 1 and 3 years → save questions for his adviser. Show subgroup suppression without treating either branch as a recommendation. |
| Sofie & Pieter | Open suggested First home → see “Exploring; no purchase date” → inspect costs after getting keys → read notes → save questions for Ellen. Browsing does not mean they bought. |
| Lina | Everyday → October position → next seasonal cost and crowd preparation tip → save a reminder. All roads lets her explore any situation; a London transaction does not place her on Moving abroad. |
| Margaret | Same roads and notes in Large & simple: text list, one stop per card, explicit dates, “Read advice” and “Talk to An”. Keep Past Retirement available. |
| Nadia | “Support after losing a parent” → Talk to Els first, or “Show next steps when I’m ready” → one practical step → optional moderated note. No countdown, completion score, animated ghosts, commercial offers or city. |

Use 18 px text, 22 px in Large & simple, 48 px controls, visible keyboard focus and text labels alongside colours. Reflow at 200% text size and 400% browser zoom; avoid horizontal panning. Reduced motion removes animated dots. Screen readers receive an ordered stop list. Validate with all 6 personas: after 5 seconds, can they name the road, their position and its benefit?

## 5. Five-minute pitch

| Time | Clicks and narration |
|---|---|
| 0:00–0:35 | Tom → Your road. Read position and first crowd surprise. “Other customers have already travelled this road.” |
| 0:35–1:10 | All roads → Home group → Moving house → setup stop → save checklist. Show the shared network and immediate value. |
| 1:10–2:10 | Ask a juror for a situation they have lived. Type it into “Find a road”; confirm the matching catalogue road and stage. Ghost riders appear ahead. Unsupported situations get an honest no-match, never invented statistics. |
| 2:10–2:55 | Juror selects a past stop → Leave a note → submits one anonymous line. Show “With a reviewer”. Label the demo’s accelerated review as simulated. |
| 2:55–3:35 | Select the next demo persona → Explore that same road and stop → Notes. Read the approved juror note. Match the road/stop; avoid unrelated feeds. |
| 3:35–4:10 | Karim → crossroads → narrow crowd → suppression → Everyone. Explain the 500-person gate and historical outcomes. |
| 4:10–4:45 | Margaret → Large & simple advice; Nadia → adviser-first screen. Same usefulness, appropriate presentation. |
| 4:45–5:00 | Atlas → shared road views for 2.3M customers. |

Use an openly labelled past-road demo profile for note eligibility. If review is delayed, retain Pending; show a separately labelled approved example.

## 6. Keep / cut / rebuild

| Scope | Decision; rough effort |
|---|---|
| `src/hindsight/engine/{roads,simulate,lives,gate,moderation}.ts` | Keep synthetic foundations; audit displayed evidence and copy: 1 engineer-day. |
| `src/one/roadmap/*`, `RoadTab.tsx`; `hindsight/components/stage/Atlas.tsx` | Rebuild navigation and responsive atlas from catalogue data: 2 days. |
| `hindsight/components/phone/{RoadView,RouteView,StopView,ForkView,NotesView,PassportView}.tsx` | Reuse semantics; unify accessible road/stop/notes/privacy presentation: 2 days. |
| `src/one/people.ts`, `hindsight/components/store.tsx` | Separate suggested/exploring/active states, dates and concurrent pointers: 1 day. |
| `src/hindsight/game/**`, `src/one/LandscapeCity.tsx` | Remove mandatory onboarding, steering and readiness from primary flow; defer city polish. |
| Accessibility and demo rehearsal | Keyboard, zoom, care consent, road switching, note handoff: 1 day. |

About 7 engineer-days, excluding production privacy work and city adaptation.

## 7. Risks, trust & privacy

Apply k ≥ 500 to every displayed cohort, branch and chart bin. `gate.ts` noises counts/rates and rounds medians; it does not prove production privacy. Raw histogram bins and some catalogue counts bypass it today. Suppress small groups; do not expose their exact sizes or draw revealing ghost densities.

Label synthetic data throughout. Crowd outcomes show association, not causation or personal prediction. Rank “what helped” by evidenced outcomes, never margin; include non-product actions. Do not infer sensitive care situations from transactions. Require opt-in, removal and adviser-sharing controls.

`moderation.ts` has limited name/place lists, not reliable anonymity. Retain human review and reporting. Multiple road pointers also invalidate Passport’s “one pointer, that’s all” claim; disclose actual stored choices, plans and access logs.

Review limits: inspected 6 personas read-only, sources and original v4 README/code. No note submission, Kate Apply or reset; no accessibility conformance claim.
