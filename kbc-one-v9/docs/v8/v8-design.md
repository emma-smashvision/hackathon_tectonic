# KBC One v8: the design (synthesis of the debate)

Sources: `00-origin-and-feedback.md`, `proposal-{crowd,game,ux,pitch}.md`, `critique-{crowd,game,ux,pitch}.md`. Mock-ups: `docs/v8/design/*.dc.html`.

## The idea, back to the original

**KBC Hindsight inside KBC One.** Home and Kate handle today (v7.1 Home stays). The road is no longer a personal bill calendar: it is a **shared road that thousands of KBC customers already drove**. You see where you are on it, the ghost riders ahead, what surprised them, what helped them (outcome-ranked, not margin-ranked) and the notes they left for you. Every road the crowd has driven is one tap away in **All roads**.

**The sentence the jury remembers:** "KBC can't predict your future. But the people who already lived it can help you prepare."

## What the debate decided

| Question | Decision | Why |
|---|---|---|
| What is "Your road"? | A crowd-led 2D road for your **confirmed life road** (e.g. Moving house), with **Everyday · October** as a named switch, not the trunk. Timeline reads **downward**: now at the top, later below. | v7 put bills first and hid the crowd (all 4 agreed). |
| All roads | A permanent **All roads** button on Your road and every road header. 12 live roads + Everyday + Heat-pump owners ("Under review", no insights). Grouped (Home, Work, Family, Abroad, Later life, Support), searchable, metro-style overview + an equivalent list. Badges: **On now / Exploring / Past / Under review**. | User: "we used to have all the different roads". |
| How a road gets on your map | Provenance on every road: **You told us** (date) · **Suggested from activity** ("Does this fit?" Yes / Explore / Dismiss) · **You chose to explore**. Detection never silently places you. | Trust, and answers "when do roads show up". |
| Previews | **Exploring** any road never changes your position or plan. "This is my situation" confirms placement + date. | All 4. |
| Day-one pointers | **Everyday + one confirmed life road.** Unlimited previews. Several concurrent life roads: later. | Consent/date/dedupe complexity. |
| A stop | Sheet: **What surprised people** (gated frequency, range) → **What helped** (outcome-ranked, incl. non-product actions, "associated with", not "causes") → **Notes from people ahead** → one-tap save (reminder / checklist / adviser question). No readiness %. | Core of the original idea. |
| Ghost riders | Aggregate groups of earlier travellers drawn ahead of "You", labelled "anonymous groups of ≥ 500 · not a prediction". | Original demo moment. |
| Home | v7.1 bubbles stay. **One** crowd-led road card: "Moving house · before 1 Nov — Earlier movers: photograph the meters at key handover. See what helped →". Opens that exact stop. | |
| Nudge | Generic lock-screen text; opens the exact road + stop in 2D. No unsolicited care nudges. | |
| Describe a situation | **Find a road** (in All roads): local synonym matcher → existing catalogue road IDs → user confirms road and stage. Kate reuses the same matcher. Numbers only ever come from published, gated evidence; unknown → "No published road yet". | No invented stats by construction. |
| Notes | Read at each stop; "Pass it on" from a passed stop or completed road; status "In review" (demo: simulated review, labelled). | Juror-note roundtrip is the climax. |
| 3D | **Cut the asset city.** Keep an optional **Drive this road** view of ONE road: avenue, month posts, ghosts, amber surprise markers, "Show me ahead" auto-travel to the next stop, the same stop sheet, Map ↔ Drive keeps the selected stop. No neighbourhood, readiness, quests, debrief. Not for care or Large & simple. **Built last**; in the pitch for 15 s only if a fresh viewer names road, position and purpose within 10 s. | 4/4 converged in round 2. |
| Adviser / Kate / push | Same road + stop identity everywhere; adviser sees it with consent; "common questions at this stop" (with a denominator). | One map, every channel. |
| Scale proof | Presenter Atlas: place 2.3M synthetic customers on roads live, show time and the number of shared road views. "Shared calculations, small pointers." | Brief question 5. |
| Large & simple / care | Same roads and notes as large text cards; All roads as a large list; Talk to An. Nadia: person first, "Show what helped others when I'm ready", no ghosts, no Drive, no scores. | |

## Personas
- **Tom**: Moving house · before 1 Nov (you told us). Setup costs → first energy bill at the new address → deposit release. Note: "Photograph the meters at handover."
- **Karim**: Going freelance, month 20 → sole trader / company fork at month 24 → compare outcomes after 1 and 3 years (withheld subgroup shown) → adviser question. His **completed First home** road lets him leave notes.
- **Sofie & Pieter**: First home **Exploring · no purchase date** → after the keys: energy settlement, first repair → save questions for Thursday's appointment.
- **Lina**: Everyday · October → December spending, school year → All roads to explore.
- **Margaret**: Large & simple Everyday + All roads list + Talk to An.
- **Nadia**: Losing a parent, care: person first.

## Five-minute demo (target)
1. 0:00 Tom Home → road card → Moving house stop: position, ghosts, surprise, what helped. *Jury sentence.*
2. 0:50 All roads → **Find a road** → juror describes a situation → match → confirm stage → road opens with ghosts ahead.
3. 1:50 "Demo: someone who completed this road" → **Pass it on** → juror's line → In review (simulated, labelled).
4. 2:30 Next traveller on that road (default: Karim's completed First home → Sofie's preview) → same stop → the juror's note is there.
5. 3:05 Karim fork → withheld subgroup → k ≥ 500 explanation. (Optional 15 s: Drive this road.)
6. 3:40 Adviser view + push → same stop. Margaret and Nadia in 20 s.
7. 4:30 Atlas: 2.3M placed live. Close on the juror's note.

## Build plan (priority order; honest budget ≈ 2 days of agent work)
1. **Road catalogue + All roads** (`src/one/roadmap/*`, `RoadTab.tsx`, adapt `stage/Atlas.tsx`), provenance, Exploring vs On now, Find a road matcher.
2. **Single road 2D** with ghosts and position (adapt `phone/RoadView.tsx`, `RouteView.tsx`), downward timeline, switches Moving house / Everyday.
3. **Stop sheet + notes** (`StopView`, `ForkView`, `NotesView`, `useLiveNotes`, `api/notes`), Pass it on, cross-persona roundtrip.
4. **Home card + nudge + Kate + adviser** on the same road/stop IDs.
5. **Gate coverage** (k ≥ 500 on every number, bins, ghost densities), synthetic labels, care consent, Large & simple parity.
6. **Drive this road** (rebuild `game/**` down to one avenue), only after 1–5 pass.
7. Demo script, six-persona QA, timed rehearsal.

Cut: v7's asset neighbourhood, CityIntro slideshow, readiness rings/percentages, gate debrief, salary-day driving.
