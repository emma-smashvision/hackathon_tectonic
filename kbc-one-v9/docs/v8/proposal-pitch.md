# KBC One v8 — pitch proposal

## 1. Diagnosis

V7 turns a shared life road into a personal bill calendar. [Tom’s road](shots/pitch-tom-road.png) gives car insurance the prominent “Next up” card. Moving house sits below rent; ghost riders and advice are absent from the first screen. [Sofie’s road](shots/pitch-sofie-road.png) foregrounds an appointment and bills, rather than life after the keys. `src/one/roadmap/model.ts` starts with `everyday`, adds payments, then life branches. The branches exist but lack priority.

[The city](shots/pitch-tom-city.png) and `src/hindsight/game/hud/CityIntro.tsx` explain possessions, plans and readiness. That is a task game, not the original crowd’s hindsight. City controls consume time needed to explain KBC’s scale.

The lost concept remains in `src/hindsight/components/phone/{RoadView,StopView,ForkView,NotesView,PassportView}.tsx`: position, riders, surprises, outcomes and advice. `stage/Atlas.tsx` retains the catalogue and scale demonstration. The original `hindsight-v4/README.md` and its `RoadView.tsx` make those relationships explicit. Restore their meaning.

## 2. Concept and remembered sentence

**KBC One: your next step, backed by people who have been there.** Keep Home and Kate for today. Make Your road show the customer’s confirmed situation, their position, and the crowd’s next useful lesson. All roads remain one tap away. Replace the city with a clear, animated 2D road: riders gather around the next stop, a useful action opens, and one person’s note reaches another. This supports “1 app, 1 click, 1 road” without pretending people have only one life situation.

**“KBC cannot predict your future. But 2.3 million customers can help you prepare for it.”**

## 3. Information architecture

| Place | Purpose |
|---|---|
| Home | Preserve quick actions, personal bubbles and Kate. One road card opens the relevant stop directly. |
| Your road | “On now”: Everyday plus confirmed life roads, each with position. Default to the selected life road. Show previews separately. |
| All roads / Atlas | Persistent button in Your road. Searchable list plus metro overview, generated from the catalogue. Mark On now, Exploring, Completed, Pending. |
| Single road | Road name, “You are here: month X,” reason and correction control; next 3 stops, ghost riders, crowd surprise and “What helped.” |
| Stop / fork | Outcomes, source cohort, notes, preparation action; compare branches after 1 or 3 years without declaring a winner. |
| Notes | Read beside each stop; “Pass it on” from completed roads or passed stops. Show review status and audience. Include road-level notes. |
| Kate / push | Explain or open the same road and stop. Preserve road context across channels. No separate set of advice. |
| Adviser / passport | Consent-controlled handoff with position, completed actions and common questions; passport holds road history, correction and access log. |

Expose all **12 live life roads**, the pending Heat-pump road, and Everyday. Previewing never changes someone’s confirmed position. The day-one implementation supports Everyday plus one confirmed life road; the design allows several pointers later.

## 4. Road experience

Common sequence: **open road → locate yourself → tap a stop ahead → read what surprised others → choose help → read/pass on a note**. Time runs upward, with explicit month labels and a fixed “You” marker. Riders represent aggregate groups, never identifiable customers. No animated claim that someone “just” did something.

| Person | Concrete sequence and value |
|---|---|
| Tom | Home move card → Moving house, before moving day → setup costs and month-3 energy bill → photograph-meter reminder → read a mover’s note. He sees surprises beyond his known rent. |
| Karim | Your road → Going freelance, month 20 → month-24 sole-trader/company fork → compare later outcomes → month-30 contribution adjustment → prepare questions for his adviser. His completed First home road also lets him help Sofie. |
| Sofie & Pieter | Home fund → First home **preview**, before keys → month-5 energy settlement → crowd’s helpful habits → save a question for Thursday’s appointment. Do not place them at month 3 of ownership. |
| Lina | Your road → Everyday, October → December spending and next school year → crowd advice plus her own last-year amount, clearly separated → optional reminder. All roads remains available without assigning her a new life event. |
| Margaret | Large & simple → “Your road: Everyday” → large text rows for Now, Next, Later → plain advice → Ask An. Keep catalogue and notes accessible through large buttons. |
| Nadia | Your road → Els first → optional “Show what helped others” → one care step and reviewed notes. No offers, readiness score, celebratory stamps or unsolicited care push. |

**Cut 3D from v8’s customer entry points and pitch.** Preserve its code for later. A second spatial system adds no necessary proof. The spectacle is experience passed between people.

## 5. Five-minute live script

| Time | Clicks and words |
|---|---|
| 0:00–0:25 | Tom Home. Point to Split and open Kate without applying changes. “One app handles today. What about the months you have never lived?” |
| 0:25–0:50 | Click move card → Moving house. Point to his position, ghost riders and next surprise. Deliver the remembered sentence. |
| 0:50–1:20 | Click All roads → “Describe a situation.” Invite one short jury example. Type it; show matching catalogue roads; juror confirms the road and stage. |
| 1:20–1:55 | Open that road → next stop. Riders appear ahead. Read one gated surprise and one helpful behaviour. Keep a non-product action visible. |
| 1:55–2:35 | Click “Demo: someone who completed this road” → Pass it on. Juror dictates one short note → submit → visible “In review.” Explain the demo’s simulated review. |
| 2:35–3:05 | Switch to the next driver on that road → same stop → read the juror’s exact approved note. Default path: Karim’s completed First home → Sofie’s preview. Other roads use labelled synthetic demo drivers. |
| 3:05–3:30 | Open the crowd explanation; show one held subgroup below 500, then the broader cohort. Briefly select Nadia to show person-first care. |
| 3:30–4:00 | Atlas → Run placement for 2.3M synthetic customers. Show measured time and actual shared-view count. “Shared road calculations; small customer pointers.” |
| 4:00–4:40 | With explicit demo consent, open Adviser. Show common questions and the saved action. Open a staged push → same stop → Kate explanation. One road across four channels. |
| 4:40–5:00 | “Measure fewer avoidable calls, better-prepared conversations and completed helpful actions.” Close on the juror’s note: “The next customer starts with your experience.” |

Free text selects existing roads; it never fabricates statistics. If unsupported, say so and offer nearby roads or general help. For a care example, suppress riders and keep consent first. Budget 40 seconds for note entry; offer editable starter text. If the live service fails, explicitly label the fallback recording.

## 6. Keep / cut / rebuild — one day

Paths below are relative to `kbc-one-v7/`. Budget **8 hours**.

| Effort | Work |
|---|---|
| Keep | `src/kbc/ui/{App,HomeMix,KatePreview}.tsx`, Home/Kate behaviour; `src/one/people.ts`; Hindsight catalogue, simulation and household data. |
| 2 h | Rebuild `src/one/RoadTab.tsx` around catalogue access and a single road. Adapt `hindsight/components/stage/Atlas.tsx` for customer browsing. |
| 2 h | Adapt `phone/{RoadView,StopView,ForkView,RouteView}.tsx`; separate own/preview state, restore riders, context and outcome order. Keep plan actions. |
| 1 h | Reconnect `NotesView.tsx`, `useLiveNotes.ts` and existing notes storage; display stop-level and road-level notes. Rehearse the real cross-persona roundtrip. |
| 1 h | Repair displayed gate coverage; adapt `stage/Adviser.tsx`, passport consent and channel links. |
| 2 h | Six-persona review, accessibility/care checks, isolated note test, scale run, timed rehearsal and fallback capture. |
| Cut | Entry points into `src/one/LandscapeCity.tsx`, `TripDebrief.tsx` and `src/hindsight/game/**`; asset tour, driving controls and readiness competition. |

**Real:** navigation, gate withholding, synthetic computation, note submission/retrieval, persona switch and shared stop links. **Simulated and labelled:** customer histories, crowd outcomes, review approval, push delivery and adviser booking. Situation matching can use a small local synonym table. No new model dependency or invented live banking integration.

## 7. Risks, trust and privacy

- Apply k ≥ 500 to every displayed aggregate, including subgroups, counts and distributions. `gate.ts` noises counts/rates; money medians are rounded, not noised. Raw histogram shares and adviser call shares need protection or omission. Noise alone does not establish production privacy guarantees.
- Do not claim “40% call us here” from a share of call topics. Existing `callReasons` are synthetic. Specify denominator and time window; call incidence needs separate evidence.
- `placement.ts` uses synthetic probabilities. Its benchmark proves a prototype computation pattern, not transaction classification or production throughput. Customer assignment still grows with customer count; shared outcome computation grows with roads/cohorts.
- Opt in, allow correction and withdrawal, exclude sensitive categories, and require care disclosure. Do not inherit `PassportView.tsx`’s cosmetic hide toggle as real withdrawal.
- Notes need server checks and human review. Existing 5-second approval is simulated; name lists are not sufficient production moderation.
- Rank help by observed outcomes, never margin. Say association, not causation or prediction. Measure useful actions and adviser outcomes before claiming revenue or call savings.
