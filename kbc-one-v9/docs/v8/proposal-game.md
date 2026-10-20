# v8 game proposal — Drive ahead, pass it on

## 1. Diagnosis

V7 has driving controls, but the wrong reason to drive. [Tom’s city](shots/game-tom-city.png) centres his flat, car and savings. Its goal is “Get each road ready before its date.” [His map](shots/game-tom-road.png) makes insurance renewal the next chapter; Moving house becomes a side exit. `src/hindsight/game/hud/CityIntro.tsx` teaches possessions and 100% readiness. The crowd’s experience disappears behind a spatial checklist.

The crowd is also structurally missing: `game/mapNetwork.ts` calls `buildCity([], { streets: true })`, then adds personal map paths. `scene/Ghosts.tsx` still creates ghosts from `net.avenues`, which that call leaves empty. `src/one/roadmap/model.ts` builds personal tracks, not the complete catalogue. “Try another road” exposes fork choices, not all life situations.

V4’s README and `src/game/network.ts` had the stronger idea: distance means time, avenues mean life roads, stops show shared experience. V7 retains `engine/roads.ts`, `simulate.ts`, `gate.ts`, `lives.ts`, the six phone views and `stage/Atlas.tsx`. Restore that meaning; remove clutter and driving-to-advance-life.

## 2. Concept and remembered sentence

**Hindsight is a road trip through experience you have not had yet.** You drive a small car along a named life road, beside ghost riders representing people who already travelled it. Your goal is to understand one surprise ahead and choose whether to prepare. A roadside note lets that knowledge reach someone behind you. Exploration means visiting a future stop, comparing a fork, or trying another life road. It never advances your actual life. Keep a beautiful, driveable world: movement makes time and shared experience tangible. Cut the asset city around it.

**“Drive your next chapter with the people who have already lived it.”**

## 3. Information architecture

| Place | What belongs there |
|---|---|
| Home | Banking actions; one road invitation with its reason. |
| Your road | “On now”, “Considering”, “Previously travelled”; position on each confirmed road, Everyday alongside. Default to the selected life road. |
| All roads | Persistent button, never hidden in More. Searchable interchange map plus equivalent list. |
| Single road | Name, actual position, crowd size, next surprise, what helped, notes; **Map / Drive** switch. |
| Drive | The same road, stops and evidence in 3D. No separate goals or facts. |
| Kate | Match and confirm a stated situation. Open its road or stop; explain the evidence. |
| Notes | Read at each stop; write from a completed road or experienced stop. Private review-status list. |
| Adviser | Same road and stop, shared with permission; saved questions/actions and access log. |

All roads includes First job, Moving house, First home, First child, University, Freelance, Moving abroad, Caring for a parent, Retirement, Separation, Losing a parent, Job loss, Everyday, and Heat-pump owners marked **Awaiting review**.

Use district signs for Work, Home, Family, Abroad, Later life and Support. They group choices without prescribing a life sequence. Badges distinguish **On now**, **Preview**, **Past**; an actual-position pin stays visible while exploring ahead. “This is not my road” removes a placement. Browsing never enrols someone.

Shared selection: road, stop, explored month and mode; actual position stays separate. 2D dots and 3D ghosts use the same gated aggregates. Labels, colours, notes and selected stop survive every view switch.

## 4. The road experience

**The 10-second contract:** “Moving house · before your move. These ghosts represent earlier travellers. Tap the next surprise to drive there.” One button: **Show me ahead**. Skip the slideshow.

1. Choose a road on the interchange. The camera follows its sign into the avenue. Direct selection skips navigation practice.
2. Follow ghosts towards the next labelled stop. Tap to travel automatically; hold arrows for assisted driving. Stop automatically beside evidence, without collisions or steering tests.
3. Open the stop: **What surprised people → What helped → A note from ahead**. Show the same sheet in 2D.
4. Save a reminder, a question or a draft plan. Show “Saved”, never “100% safe”. Money actions require their normal confirmation.
5. Continue, compare a fork, or return. After lived experience, leave one moderated line. The reward is knowledge and contribution.

Month posts make distance legible. Amber potholes mark surprises; they never damage your car. Mint service stations contain “what helped”, including free actions. Roadside signs carry notes. Forks show historical outcomes on both routes; steering selects a preview, not a financial decision. Ghosts are anonymous aggregate illustrations, never individual customers or literal counts.

| Person | Steps, distinct place and useful outcome |
|---|---|
| Tom | Open Moving house, before November’s move. Follow removal boxes and meter landmarks to setup costs, energy bills and deposit release. Read a meter-photo note; save a handover reminder. Switch to 2D at that stop. |
| [Karim](shots/game-karim-road.png) | Open Freelance, month 20. Pass workshop and invoice landmarks to the company fork. Preview both branches; compare available 1-/3-year outcomes. Take a question to his adviser. Small cohorts show a hold, not invented ghost proportions. |
| [Sofie & Pieter](shots/game-sofie-road.png) | Choose First home from All roads, explicitly **Preview: no purchase date**. Drive from keys to energy settlement and first repair. Read homeowners’ notes; save an appointment question.  |
| [Lina](shots/game-lina-road.png) | Stay on Everyday, with month arches and relevant seasonal landmarks. Explore December spending or school costs; read parents’ notes and choose an optional reminder. All roads remains available without inferring a new event. |
| [Margaret](shots/game-margaret-road.png) | Large & simple presents the identical road as large cards: Where I am, Next, What helped, Notes. All roads is a large list. Read, save reminders, or call her adviser. No driving requirement. |
| [Nadia](shots/game-nadia-road.png) | Losing a parent opens with a person and “Show steps when I’m ready”. After consent, show one quiet step and reviewed notes. No ghosts, potholes, completion goals, commercial offers or 3D entry. |

## 5. Five-minute pitch

| Time | Clicks and beat |
|---|---|
| 0:00–0:30 | Tom Home → Your road. “Others have lived the months ahead of you.” Show actual position and synthetic-data badge. |
| 0:30–1:00 | All roads. Ask a juror for a situation they have lived. Type it in Kate; confirm the matched road. Unsupported situations receive an honest “No road yet”, then choose a supported example. |
| 1:00–2:00 | Open road → Drive → Show me ahead. Ghosts appear immediately. Stop at a surprise; open what helped. Explain one crowd result without a promise. |
| 2:00–2:40 | Switch Map → Drive; selected stop stays fixed. Preview a fork, then return without changing actual position. |
| 2:40–3:30 | Open the matched road’s clearly labelled demo alumnus → Leave a note. Juror supplies one safe sentence about their experience. Submit; show Pending review, then the explicitly simulated review approval. |
| 3:30–4:10 | Switch to the next traveller on that same road: Tom for Moving house, Sofie’s preview for First home, otherwise its seeded demo persona. Open the same stop and read the newly approved note. |
| 4:10–4:40 | Margaret → Your road; Nadia → Your road. Show equal access and adviser-first care. |
| 4:40–5:00 | Return to All roads. Explain shared road evidence at 2.3M scale, k ≥ 500, and outcome-ranked help. Repeat the remembered sentence. |

Rehearse the note loop separately; if review stalls, keep Pending visible and use a labelled existing note. Never fake approval.

## 6. Keep / cut / rebuild

Paths are under `src/hindsight/` unless specified.

| Decision | Scope and rough effort |
|---|---|
| Keep | `engine/{roads,simulate,lives,gate,moderation}.ts`; evidence and note patterns from `components/phone/{RoadView,RouteView,StopView,ForkView,NotesView,PassportView}.tsx`. Audit and adapt: 1 day. |
| Cut | Asset streets from `game/{streets,neighbourhood,cityGen}.ts`, asset buildings in `scene/Places.tsx`, CityIntro slideshow, readiness confetti, quests, salary-day progression, compulsory debrief. 0.5 day. |
| Rebuild | Customer Atlas from `components/stage/Atlas.tsx`; catalogue and shared selection in `src/one/roadmap/*`. 1–2 days. |
| Rebuild | `game/runtime.tsx`, `game/mapNetwork.ts`, `scene/{Ghosts,Stops,World}.tsx`, HUD: one avenue at a time, meaningful landmarks, assisted travel, shared stop sheets. Retain suitable player/control and label code. 2–3 days. |
| Verify | All six personas, view parity, every road reachable, note handoff, care suppression and reduced motion. 1 day. |

Total: about 6–8 engineer-days for a focused demo, excluding production services. Cut decorative buildings before cutting the crowd.

## 7. Risks, trust and privacy

Gate every visible statistic and visual encoding at k ≥ 500; merge or withhold small bins. Existing `simulate.ts` histogram shares and ghost population logic need review. Apply consistent noise and rounding; `gate.ts` alone is not a production privacy guarantee.

Historical association is not prediction or proof of cause. Keep “synthetic” visible; no future personal balances or guaranteed arrival outcomes. Rank help by customer outcomes, never product margin. Avoid wealth-based scores and streaks.

Use opt-in placement, no sensitive-category inference, and no identifiable ghost trails. Extend quiet treatment to Caring for a parent despite its current `care: false`. Moderation needs real review; the demo’s timed approval is only a simulation. Do not claim the road pointer is all bank data stored.

Evidence limit: read-only v7 screens and v4 source inspection; no server-changing controls or note submission were exercised in this design round.
