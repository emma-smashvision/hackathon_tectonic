# Drive this road: practise before it matters

Choose **Practice the next 12 months**: one road, 2–3 minutes, one useful lesson, an optional replay. Preparation choices change a fictional cash scenario. Driving reveals the consequences; it is not a steering test.

This proposal deliberately extends [v8’s optional Drive](../v8-design.md), which excludes scores and debriefs. Keep ordinary road browsing unchanged. Add a separate, explicit practice mode. The player’s reward is understanding a surprise and leaving with a useful question or reminder.

## 1. Core loop and stakes

```text
Choose road / stage → Anticipate the next surprise
                              ↓
                    SERVICE STATION: choose
                    one preparation + reason
                              ↓
                    DRIVE → surprise appears
                              ↓
                   See cash effect + crowd evidence
                              ↓
                    Rewind → change one choice
                              ↓
                  Explain a new example → save / exit
```

The challenge: keep enough fictional cash for an upcoming expense while deciding whether to make an optional purchase now. A shortfall pauses the car at a service station. It invites a revised plan, without a crash, failure screen or penalty. Free actions, such as a meter photograph, also count as preparation.

Choose the **practice run, service stations and own-run replay**. Reject prepared/unprepared ghost races: the current data cannot support their trajectories or a causal comparison. Retain aggregate crowd silhouettes as evidence markers. They never overtake the player or imply winners.

## 2. First 10 seconds, controls and HUD

At 0–3 seconds, show one avenue, a stationary car, a meter landmark and this invitation:

> Moving house · Practice months 0–12. Earlier movers help you prepare. Fictional money; synthetic crowd data.

At 3–6 seconds, ask: **“Which could need cash before your old deposit returns?”** Offer “Energy bill”, “Nothing yet”, and “Show me”. At 6–10 seconds, **Start practice** moves directly to the first service station. No tutorial slideshow.

```text
Moving house | PRACTICE month 0 / 12 | Map | Exit
Actual position: before 1 Nov — unchanged
Scenario cash [======] €600    Lesson: anticipate a cost

             month 3: Energy bill
                [amber marker]
                      |
                [preview car]
             [service station]

          [Choose preparation] [Continue]
Synthetic crowd evidence · illustrative scenario
```

Use a fixed elevated chase camera, about 45° downward, with the car in the lower third. Fit the next stop and month post above it. No orbit, shake or speedometer. Travel lasts 3 seconds; evidence freezes motion.

Tap **Continue** or press Enter on its focused button to auto-drive. Space pauses travel; Escape returns to the road. Tab reaches every action. No steering is required or scored. Reduced motion replaces travel with an instant step. Controls have 48 px targets; labels carry meaning without colour.

## 3. One complete level: Tom

1. **0–35 seconds:** anticipate the energy bill, then enter the service station. Choose “Keep scenario cash available” or “Spend €300 on optional furnishings”. Also inspect outcome-ranked “what helped”, including the meter photograph.
2. **35–65 seconds:** drive past setup costs to `moving-house:energy-new-address`. Reveal the selected published cost band and a labelled illustrative bill within it. Show the subtraction, then the crowd’s range and note.
3. **65–105 seconds:** rewind to the station. Keep the same expense and starting cash; change one choice. A transparent **Your previous practice** car marks the previous stop. Side-by-side cash arithmetic shows the difference without a race.
4. **105–150 seconds:** jump to the deposit stop and finish at month 12. Ask a new timing question, read a note, then offer one explicit save or exit.

Scenario cash starts at a designer-set €600, not Tom’s balance. Cash remaining equals starting cash minus chosen spending minus the illustrative bill. The checked evidence gives a €350–€530 band: a €440 practice bill leaves −€140 after the purchase, or €160 without it. Preparation never creates money. A photograph changes the explanation and reminder, never the bill amount. A shortfall can remain after preparation.

Only published stops appear; empty months have no invented events. This is a few-event exercise across 12 months, not a complete household budget forecast.

## 4. The crowd IS the content

Use [`one/crowd`](../../../src/one/crowd/README.md) exclusively for published evidence. `roadViewFor` provides stages; `stopEvidenceFor` provides surprises, amount bands, ranked help and notes. `forkEvidenceFor` supplies branch outcomes.

For the demo, freeze an evidence snapshot and the finite, fully published `moving-house:energy-new-address:bin:4` band. Use its rounded midpoint as the illustrative bill. Validate that it remains inside the band and satisfies €300 < bill ≤ €600; otherwise disable the demo shortcut. Label it **“One higher-cost practice example from this published band; not a forecast.”** Replay retains it. Do not randomly sample incomplete histograms, reconstruct withheld bins, or imply a full joint distribution across months.

Every crowd number, band boundary, density and comparison must have `shown=true` after the k≥500 gate. Withheld evidence becomes **Not enough published evidence**, with no numeric or visual substitute. If the selected band is unavailable, use the evidence-only stop; omit its cash exercise.

Preserve the adapter’s outcome order and “associated with” wording. Never convert its outcome rates into personal success odds. [`simulate.ts`](../../../src/hindsight/engine/simulate.ts) uses synthetic assumptions; its behaviour multipliers do not establish real causality. [`lives.ts`](../../../src/hindsight/engine/lives.ts) contains illustrative finances, not individual forecasts. Seed notes remain labelled synthetic; contributed notes use existing moderation.

## 5. Learning, parity and other levels

Use **3 lesson checks**, never a financial readiness percentage: identify the surprise, explain a preparation trade-off, and distinguish association from a guarantee. Answers earn one check each; hints and retries remain available. Neither wealth, speed, purchases nor saved actions earn points.

The exit question changes the example: **“A repair is due Tuesday; a refund arrives Friday. Which money is available Tuesday?”** Offer existing cash, the later refund, or a hint. Also ask whether the crowd result guarantees a lower bill; explain why it does not. Record initial and transfer answers separately. A correct transfer answer supports immediate comprehension, not durable learning. Test retention later with consent; compare against the same 2D content before claiming an engagement benefit.

| Person | Level and lesson |
|---|---|
| Tom | Setup → energy → deposit. Cash timing matters; a free meter photograph can support a later dispute. |
| Karim | Freelance month 20 → company fork at 24. Preview `sole` and `bv`; compare gated outcomes at 1 and 3 years. Ask which trade-off needs an adviser. No winning branch; matching subgroups remain withheld. |
| Sofie & Pieter | First home, Exploring, no purchase date. Keys → energy → repair. Reserve flexibility for more than one cost; save an undated appointment question. |
| Lina | `everyday-only`: December and school costs. Practise setting a seasonal limit and keeping money for a later expense. No inferred life event. |

The 2D equivalent uses **Anticipate → Choose → Reveal → Compare** cards with identical scenarios, evidence, explanations and saves. Large & simple defaults to unscored worked examples with optional questions and large text. No driving or quiz unlocks content. Map/Drive preserves road, stop and practice state; actual placement remains separate. Care roads, including both parent roads, have no practice, ghosts, scores or challenges.

## 6. The 45-second jury moment

**0–8:** Tom → Drive → labelled demo practice. **8–18:** choose the optional purchase; drive to the energy stop. **18–28:** reveal cash subtraction beside the published crowd band. **28–37:** rewind, retain cash, replay the identical bill. **37–45:** answer the timing question and save the meter reminder.

Presenter: **“You just rehearsed a surprise that earlier movers encountered. Their shared experience supplies the lesson.”** Use an explicit shortened demo mode, not a claim that the complete level takes 45 seconds. Leave the rest of the 5-minute pitch for notes, trust and scale.

## 7. Build scope and limits

Paths below are relative to `src/`. Estimate: 10–12 engineer-hours on working v8 foundations.

| Work | Scope |
|---|---|
| 3 h | New `one/practice/model.ts` and `levels.ts`: Tom state machine, evidence adapter, fixed scenario, checks and replay. |
| 3 h | New `one/practice/PracticeCards.tsx` and `PracticeDrive.tsx`: shared cards, simple avenue, car and month posts. Reuse suitable geometry from `hindsight/game/`; avoid its city runtime and personal plan effects. |
| 2 h | Integrate `one/RoadTab.tsx`, existing stop sheet and explicit plan save; care/large gates and shared selection. |
| 2–4 h | Gate, replay and no-mutation tests; keyboard/reduced-motion checks; novice orientation test and timed rehearsal. |

Ship Tom only; other rows specify subsequent levels. Karim’s existing fork comparison is reusable; do not promise animated 3-year simulation. If time slips, remove replay-car polish before evidence or accessibility.

Do not add gambling, loot boxes, real stakes, shaming, streak pressure, leaderboards, product rewards or “you will” claims. Do not equate low cash with poor judgement. This design is researched against the source and v7’s live city; learning effectiveness and build time remain unvalidated.
