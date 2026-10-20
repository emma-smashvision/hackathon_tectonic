# Motivation: learn one thing before you need it

**Design proposal · engagement and motivation lens · 18 October 2026.**

The reward is a useful lesson, a chosen next step, and the chance to help the next traveller. Driving gives those discoveries a place. It cannot be the reason to return.

**1. The first session and the core loop**

Offer “Try a 45-second situation” beside “Read what helped”. Begin with a familiar decision, then reveal something the traveller did not consider. Never hide essential information behind an answer.

```text
Choose a relevant road / seasonal stop
                 |
       Consider a small situation
       [Choose] or [Show me]
                 v
   Reveal the crowd's experience
   surprise -> what helped -> note
                 |
       Try a different example
       [Check my understanding] (optional)
                 v
 Save a lesson + choose a next step / Not now
                 |
       Leave with something useful
                 v
 Return at a chosen date or relevant season
                 |
 After lived experience: pass on a reviewed note
                 +------> next traveller's reveal
```

Use one gentle visual reveal: an amber stop unfolds into evidence and a handwritten-style note. Reduced motion shows the same change instantly. No countdown, failure sound or compulsory tutorial. Keep v8's stop-sheet order and optional Drive view. This adds an optional learning interaction to v8; it does not restore its rejected readiness game.

**2. Incentives with a purpose**

[Self-determination research](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/) connects autonomy, competence and relatedness with game enjoyment and sustained engagement. These are design hypotheses here, not proof that banking lessons improve financial outcomes.

| Need | Mechanic | Meaningful reward |
|---|---|---|
| Autonomy | Choose the road, Read or Try, and a useful action or Not now. Explore without changing placement. | Control over the session and next step. |
| Competence | Explain an answer, then offer a different example. Retry privately. | “I understand why this matters.” |
| Relatedness | Read a contextual note; contribute after lived experience. | “Someone helped me; I can help someone else.” |

Collect **Lessons from the crowd**: a small road stamp containing the principle, source stop, evidence date and saved action. Everything remains readable without collecting stamps. Labels distinguish “Read”, “Practised”, “Reminder saved” and “Done — you marked this”. A correct answer does not mean a real task is done. There is no combined preparedness percentage, financial safety claim, scarce set or reward for buying a product.

Ghosts remain anonymous groups of earlier travellers. Do **not** make them competitors whom the player overtakes or falls behind in preparation. The adapter measures illustrative stage bins, not customers' preparation. A future personal before/after marker could show “Previously read → now practised”; it must stay separate from the life timeline. No wealth comparison or public rank.

**3. What is learned, and what counts as evidence**

The learner should identify a possible surprise, explain a relevant action, and distinguish a crowd association from a personal forecast.

Example: after a handover lesson, ask: “A flatmate joins mid-month. Which record helps distinguish usage before and after arrival?” Choose “A dated meter photo” or “Only the monthly payment amount”, then explain why. Another check asks whether a crowd outcome guarantees that flatmate's result; the answer is no.

Record optional checks separately from reading, saving and self-reported completion. A new scenario at the next visit checks recall; repeating the same answer only measures familiarity. Skipping never blocks help. Large & simple offers the same explanations, optional checks and saved steps as large cards, with no game language.

Pilot with consent: compare the same content in Read and Try modes, using immediate transfer and delayed recall. Also ask whether people felt pressured or judged. Clicks, return visits and stamps do not establish learning. Adviser conversations can assess whether saved questions became more specific; commercial conversion is not the success measure.

**4. The crowd IS the content**

Every lesson references an existing `roadId:stopId`. Use the published surprise, outcome-ranked help and reviewed notes to form the situation and explanation. Do not attach generic financial trivia to a car game.

`stopEvidenceFor` supplies the evidence. Every crowd number, chart and ghost density must use its gated result, with visible synthetic labels. Below k ≥ 500, explain that evidence is unavailable; disable any question that needs it. Do not invent a correct statistical answer. Cost “surprise” means simulated costs exceeded absorption capacity, not surveyed emotion. Help is associated with outcomes, never guaranteed to cause them.

Notes supply lived context, not proof of effectiveness. The current seed excerpts are synthetic; submitted notes stay in review until moderated. Never turn seed note counts into community activity.

**5. Why return next month?**

Use the **Everyday year**, with an optional monthly invitation: January renewals, tax paperwork, holidays, school costs and December spending. These are editorial hooks, not claims about statutory deadlines. Reuse published stops; show the actual evidence date. No content refresh means no “new” badge.

Let someone choose “Remind me before handover” or simply keep a lesson. On return, offer their saved question and one relevant next lesson. No daily streak, missed-day penalty, expiring stamp, escalating notification or endless feed. “Nothing to prepare today” is a successful session.

The contribution loop is **experience → note → review → another traveller → optional thanks**. Initially show “Your note is published”. Later, verified usefulness feedback could support an impact receipt. “Your note helped 312 people” is OUT: the count is below the gate, and views do not prove help. Only publish a suitably gated aggregate of distinct explicit usefulness responses, with honest wording and a defined period. This needs abuse controls and a separate privacy review; defer it beyond the hackathon. Never fabricate impact to create attachment.

KBC benefits through customers who understand their options and bring clearer adviser questions. Share chosen questions with the adviser only with consent. Lesson results must not affect credit, pricing or access to service.

**6. Four concrete journeys**

| Person | First discovery | Useful reason to return |
|---|---|---|
| Tom | Moving house: learn why a handover meter photo matters; save a reminder at `energy-new-address`. | Reopen the saved lesson at handover; later share his experience. |
| Karim | Freelance: compare `sole` and `bv` outcomes at `company`; explain why a withheld subgroup cannot support a conclusion. | Bring a saved question to his adviser; contribute from his completed First home road. |
| Sofie & Pieter | Explore First home with no purchase date. Practise the meter example at `energy-settlement`; save an undated question. | Review it before Thursday's appointment without claiming the home is bought. |
| Lina | Everyday: distinguish a recurring monthly amount from a seasonal expense at `december`. | Revisit her chosen holiday or school stop; no inferred life event. |

**7. The 50-second jury moment**

Within the existing five-minute pitch, replace part of the first stop explanation:

1. **0–10 s:** Open Sofie's First home preview. Ask the juror to choose a record useful at handover.
2. **10–25 s:** Reveal the labelled synthetic crowd evidence, associated actions and the meter note from ahead.
3. **25–40 s:** Offer the flatmate example. Explain the answer without grading the juror publicly.
4. **40–50 s:** Save an undated question. The lesson stamp says exactly what was practised and saved.

Say: “You just used someone else's experience to prepare a question for your own life.” The later Karim-to-Sofie note roundtrip proves contribution. Keep simulated review labelled; never simulate real impact counts.

**8. Build boundary and risks**

All paths below are relative to `kbc-one-v8`. Estimate: 10–12 hours on working v8, including integration and checks.

| Work | Files/modules | Budget |
|---|---|---|
| Four authored scenarios and answer explanations | New `src/one/learning/lessons.ts`; consume `src/one/crowd/index.ts` | 2 h |
| Optional choice, reveal and transfer card | New `src/one/learning/LessonCard.tsx`; integrate `src/one/RoadTab.tsx`, `yourroad/Sheet.tsx` | 3 h |
| Private lesson record and stamp list | New `src/one/learning/progress.ts`; reuse existing plan actions in `hindsight/components/store.tsx` | 2 h |
| Note link, parity and rehearsal | Reuse `src/hindsight/components/phone/{NotesView.tsx,useLiveNotes.ts}`; six-persona checks | 3–5 h |

Keep engine `roads.ts`, `simulate.ts`, `gate.ts` and `lives.ts` unchanged. Do not use their legacy readiness weights as learning scores. Defer new 3D work, impact analytics and production persistence. Store demo progress per persona and lesson version, with a reset.

Verify withheld evidence, preview purity, duplicate saves, keyboard access, reduced motion and Large & simple parity. Care roads bypass the entire lesson/stamp/ghost system; show human support and consented quiet information. No gambling, loot boxes, real-money stakes, product rewards, shame, speed tests or “you will” forecasts. Main risks are false confidence, patronising quizzes and synthetic evidence mistaken for real outcomes. Test comprehension and perceived pressure before expansion.

Design basis: [original feedback](../00-origin-and-feedback.md), [v8 decisions](../v8-design.md), [game proposal](../proposal-game.md), the four `critique-*.md` reviews, and the [crowd contract](../../../src/one/crowd/README.md). V7's local road and city entry were inspected read-only. This proposal has not undergone user testing; learning and return benefits remain hypotheses.
