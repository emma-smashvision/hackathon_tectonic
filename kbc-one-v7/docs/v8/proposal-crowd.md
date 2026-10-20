# v8 proposal — The crowd is the product

## 1. Diagnosis

v7 turns a shared map into a personal calendar. In the running app, Tom's **Your road** leads with assets, salary, bills and insurance renewal. Moving house is a small branch. Karim gets a similar calendar; Sofie's First home leads to an appointment. Lina gets no visible invitation to explore other lives. Margaret gets three bills. Nadia correctly gets a person first.

This follows `src/one/roadmap/model.ts`: Everyday is the root; personal payments, nudges and the selected life road supply its tracks. It never builds the full catalogue. `src/one/RoadTab.tsx` replaces the original crowd-led phone view. The crowd survives inside detail text; it no longer explains the screen.

The [city opening](shots/crowd-tom-city.png) presents home, car and savings buildings. “Try another road” offers Tom's two fork branches, not other life situations. Even leaving requires a [readiness debrief](shots/crowd-tom-debrief.png). This teaches asset management and task completion, not shared hindsight.

The original `hindsight-v4/README.md` and `src/components/stage/Stage.tsx` expose Atlas beside App and Adviser. Its `phone/RoadView.tsx` starts with road, month, crowd and ghost riders. These survive under v7's `src/hindsight/components/`. Restore that logic.

## 2. Concept

**KBC One: your banking today, the crowd's hindsight for tomorrow.** Home handles immediate needs. Your road shows the shared situations you are living, your position and people ahead. An always-visible All roads button opens the Atlas, including roads you have never travelled. Each stop joins a surprise, observed outcomes, practical help and a note from someone further along. A small set of road pointers connects app, push, Kate and adviser to the same evidence. Remove the 3D city from v8: animated ghost riders on a readable 2D road provide the spectacle and explain the value.

**Jury sentence: “Thousands of people have already lived your next twelve months—KBC lets them help you.”**

## 3. Information architecture

| Place | Job |
|---|---|
| Home | Balance, payments, useful quick actions; one crowd-led road card. |
| Your road | “On now”, “Preparing for”, “Travelled”; explicit position on each road. Everyday remains a separate lane. |
| All roads / Atlas | Persistent button in Your road and every road header. Search plus topic groups; accessible list and metro-map views. |
| Single road | Road name, position, elapsed-month axis, ghost riders, stops, forks and notes. Persistent Back to all roads. |
| Stop | What surprised people → what helped → notes → optional action. Personal amounts appear separately. |
| Kate / push | Open the same road and stop; Kate explains existing evidence. Private push says “People ahead left a tip”, without the situation. |
| Adviser | Same road, selected stop, crowd questions and agreed actions; customer controls sharing and sees access history. |
| Notes / passport | Notes belong to roads and stops. Passport contains past roads, contribution status, consent and correction controls. |

List every catalogue road: First job, Moving house, First home, First child, Kid goes to university, Going freelance, Moving abroad, Caring for a parent, Retirement, Separation, Losing a parent and Losing your job. Include Everyday. Show Heat-pump owners as **Under review**, without preview claims. This is 12 live life roads plus one pending in `engine/roads.ts`, not an invented set of 16.

Each road has **Open my road** or **Test-drive**. Test-drive moves only an exploration cursor, preserving position, finances and consent. “This is my situation” confirms placement and start date. Multiple confirmed situations can coexist. Distinguish that small pointer set from the original single-pointer demo.

## 4. Road experience

1. Open a road. Read “Moving house · before the keys”, why it is shown, and a gated alumni count. Correct or remove the placement.
2. See a solid **You are here** marker and translucent riders ahead. Label them “Illustrations of grouped past journeys”; never imply live identifiable customers.
3. Scroll through elapsed months. Keep your marker fixed; label the cursor **Exploring month…**. Amber stops mean reported surprises, not predicted bills.
4. Tap a stop. Show a gated frequency, distribution and cohort period. Compare what people did and their outcomes. Rank practical options by an explicit outcome measure, never margin. Show uncertainty; association is not proof.
5. Read a moderated note. Save a reminder or draft a preparation action. Inspect its effect before any money moves. After completing a road, leave one anonymous line for its next travellers.

| Person | Concrete path and benefit |
|---|---|
| Tom | Home → Moving house, before month 1 → month 3 energy bill → meter-photo note → save moving-day reminder. Other tenants make the hidden setup costs visible. |
| Karim | Your road → Going freelance, month 20 → month 24 sole-trader/company fork → compare 1- and 3-year outcomes → share the question with his adviser. Preserve withheld subgroups. |
| Sofie & Pieter | Your road → Preparing for First home → Test-drive → month 5 settlement and later repairs. Their actual lane remains Everyday; no invented purchase date. They save questions before the mortgage meeting. |
| Lina | Everyday, October → next energy settlement → crowd experience beside her own last-year amount. All roads → Kid goes to university previews a possible future without enrolling her. |
| Margaret | Large & simple: “Your everyday money year”, three upcoming items and **See all roads**. Large list rows open the same crowd evidence. **Read tips** and **Talk to An** remain available; no steering or percentage scores. |
| Nadia | Person first → optional “Show what helped others” → one calm step on Losing a parent, month 1. Future detail stays covered until requested. No offers, celebratory animation, urgency or readiness scores. |

No 3D dependency. If restored later, the city must be this exact Atlas made spatial: one avenue per shared road, distance equals time, identical stops and safe previews.

## 5. Five-minute pitch

| Time | Beat and clicks |
|---|---|
| 0:00–0:35 | Tom Home: show one immediate banking action; tap Moving house. “The next surprise is already someone else's experience.” |
| 0:35–1:15 | Tap energy stop, reveal ghost riders, outcomes and meter note. Save a reminder. Tap All roads to reveal the complete network. |
| 1:15–2:05 | Ask the jury for a situation. Type it into Find a road; confirm the catalogue match and stage. Example: “Bought my first home, three months ago.” First home appears at month 3, with riders ahead. Unknown situations return “No published road yet”, never invented statistics. |
| 2:05–2:50 | Tap energy settlement. Offer a clearly labelled synthetic alumni contributor role. Juror writes one line from experience and taps Leave a note. Show “In review”; explicitly label the demo's simulated review. |
| 2:50–3:25 | Switch to Sofie → First home test-drive → same stop. The approved note appears. If review fails, keep it pending; show a separate approved example without claiming it is theirs. |
| 3:25–4:00 | Karim → fork → withheld subgroup → Everyone. Open adviser context to prove the same evidence crosses channels. |
| 4:00–4:35 | Margaret's readable list, then Nadia's person-first gate. Same service, different pace. |
| 4:35–5:00 | Atlas → presenter scale view: 2.3M synthetic customers, shared road views, small pointers. Close with the jury sentence. |

## 6. Keep / cut / rebuild

Paths below are relative to `src/`. Estimates are engineer-days, including focused verification.

| Work | Scope | Effort |
|---|---|---|
| Keep | `hindsight/engine/{roads,lives,simulate,gate,moderation}.ts`; `one/people.ts`; Home banking shell. Audit evidence before reuse. | 0.5 |
| Rebuild navigation | `one/RoadTab.tsx`, `one/roadmap/*`, `hindsight/components/stage/Atlas.tsx`; catalogue, positions, safe previews, list alternative. | 1.5–2 |
| Reconnect crowd | `hindsight/components/phone/{RoadView,RouteView,StopView,ForkView,NotesView,PassportView}.tsx`; stop/road notes, consent, honest outcome ranking. | 2–3 |
| Unify channels | `hindsight/components/store.tsx`, `one/nudge/*`, Kate and `stage/Adviser.tsx`; same evidence and stop identity. | 1–1.5 |
| Cut from v8 | `one/LandscapeCity.tsx`, `one/TripDebrief.tsx`, `hindsight/game/**` entry points; keep source archived. | 0.5 |

Total: about 6–8 engineer-days. Prioritise Atlas → road → stop → note → next person.

## 7. Risks, trust and privacy

- Gate **every** crowd output at k ≥ 500, including subgroups, ghost density, counts and histogram bins. `simulate.ts` currently exposes raw bins; `RoadView` and Atlas show raw catalogue counts.
- Keep noise and rounding. `gate.ts` noises counts/rates; medians are only rounded. This prototype is not a complete privacy guarantee; production needs disclosure-budget review.
- `StopView` preserves catalogue behaviour order. Its bars show behaviour prevalence among outcome groups, not the probability of success after an action. Rebuild ranking and labels; include non-bank help.
- All current crowd numbers are synthetic. State this throughout. Show observed timing, never “your bill will be”; no “perfect road” promise.
- Require opt-in, correction and withdrawal. Never infer sensitive categories. Care consent precedes placement and disclosure; extend gentle treatment to Caring for a parent too.
- `moderation.ts` uses limited word lists. Human review must catch identity clues, harmful advice and commercial spam. `app/api/notes/route.ts` currently simulates approval after five seconds; do not present that as real human review.
- Reuse one evidence version across channels. Separate public notes from identity and account history. A road pointer is only the crowd lookup.
