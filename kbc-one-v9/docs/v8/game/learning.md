# Learning roads: guess, discover, remember

Make the reward a useful correction to your expectations. Calibration means comparing your guess with published crowd evidence, then explaining the difference.

## 1. The learning contract

“Discover one thing people wished they had known before your next chapter.” Each supported stop offers a 45–90-second lesson. The road connects lessons in time; driving remains optional.

Keep v8's **What surprised people → What helped → Notes → Save** order. Add **Try a guess** beside **Show the facts**. Neither choice blocks evidence, notes, banking or advisers. All roads stays available; there are no locked levels.

```text
Choose a road / next stop
          |
          v
GUESS cost or outcome + optional confidence
          |                  [Show facts skips guess]
          v
REVEAL gated crowd evidence; compare with your guess
          |
          v
EXPLAIN one useful difference; read a note from ahead
          |
          v
RECALL in a changed example -> optional checklist / question
          |
          v
PASSPORT: topic understood now
          |
          v
OPTED-IN LATER RECALL -> remembered later / review together
          |
          +----> next relevant stop, whenever useful
```

The pleasure comes from an honest surprise and a better second answer. A moving guess marker and crowd reveal provide feedback. No coins, speed bonus or penalty.

## 2. A concrete lesson

At `moving-house:setting-up`, ask: “What was the typical setup cost among earlier movers?” Explain that “typical” means the published median. Offer a slider, keyboard input, and **I don't know**. Use fixed input limits with **More**; limits are controls, not crowd claims.

After commitment, show the guess beside the gated median and available cost bands. Say “Your guess was below the published median”, without grading the person's budget. Show **Synthetic crowd · not a prediction** throughout.

Next ask: “Which action had the higher share of people who covered this cost?” Compare the available setup-budget and second-hand actions. Reveal their outcome-ranked evidence. Explain: “These actions were associated with outcomes. This does not show what caused them.” Accept ties; do not invent a winner when evidence is missing.

Close with a transfer question: “Does this median tell us what your new flat will cost?” Correct response: “No; costs varied. I can make my own list.” Offer an undated room checklist. A saved checklist is an intention, not proof of knowledge or completed preparation.

## 3. What counts as learning

| Objective | Observable check |
|---|---|
| Estimate the scale of a cost | First guess, then a later broad-band estimate against the same evidence version. |
| Understand variation | Identify why the crowd median is not an individual forecast. |
| Interpret what helped | Identify an observed association without claiming a guaranteed benefit. |
| Apply one lesson | Choose the relevant action in a changed scenario and its reason. |
| Retain it | Answer an equivalent question later, before seeing the evidence again. |

The private **Learning passport** lists topics with **Seen**, **Explained now**, or **Remembered later**, plus the check date. “Explained now” requires a correct transfer answer and reason. “Remembered later” requires an unaided answer in a later session. Immediate retries are practice, not retained knowledge. Never show a road mastery percentage or revoke progress for absence.

Ask “Was this different from what you expected?” before recording surprise. An incorrect guess alone does not prove surprise. Feedback can say: “Setup costs surprised you. You can now explain why a room list helps.” Avoid the broader claim “You are now financially prepared.”

For an opted-in pilot, compare delayed transfer accuracy with the same facts-only content. Record exposure, first response, skips and return rate; report denominators and attrition. Product sales, money saved and time spent are not learning measures. The demo proves the interaction, not improved retention.

## 4. The crowd IS the lesson

`stopEvidenceFor` supplies the answer, reveal, variation and ranked actions. `forkEvidenceFor` supplies comparisons. Lesson authors provide prompts and explanations, never duplicate numerical answers. Add a lesson-owned fingerprint of published evidence; freeze it per attempt and refresh changed evidence before another scored recall.

Use only published `CrowdNumber` values with `shown=true`, through the k ≥ 500 gate. Each histogram cell needs its own gate. The adapter's `range` is a histogram, not a percentile interval; do not convert it into “most people spent X–Y”. Never reconstruct suppressed bins, show hidden values in answer options, or use chart geometry to leak them. If required evidence is withheld, disable that numerical question and explain why.

Rank help by published `P(calm | action)`, as the adapter does. Here “calm” means the simulated cost stayed within capacity; it is not reported emotion. Do not copy unsupported causal claims from legacy `roads.ts` advice. Notes explain lived detail; synthetic illustrative notes are not statistical proof. Learning completion never grants alumni-note eligibility.

## 5. Four journeys

| Person | Lesson sequence and useful result |
|---|---|
| **Tom** | Setup-cost guess → energy-bill variation → meter-photo scenario. Recall asks what to record at handover and why. He can save a meter reminder; no savings balance affects his passport. |
| **Karim** | At `freelance:company`, guess which branch had the higher median buffer after 1 year; compare again after 3 years. Ask why neither proves the right choice for him. Withheld subgroups teach “insufficient evidence”, not failure. Save an adviser question about the trade-off. |
| **Sofie & Pieter** | Preview `first-home:energy-settlement`, then `first-repair`. Guess costs, distinguish a monthly advance from a settlement, and identify a check before winter. Save questions for Thursday. No purchase date, placement or financial choice follows from play. |
| **Lina** | On `everyday-only:december`, compare expected seasonal costs with the crowd, then choose an action and reason. `school` is another voluntary lesson. No new family situation is inferred. |

Offer a recall after 7 days and, with a confirmed relevant date, 7 days before the real event. Merge overlapping reminders; no more than one invitation per week. For Tom's energy bill, re-ask the cost lesson and advance-check question. Teach meter photographs before handover, when action remains possible. Unknown dates get no invented deadline. Lock-screen text stays generic; dismissal ends that invitation.

## 6. The 50-second jury moment

1. **0–10 s:** Open Tom's setup stop. A juror enters a guess; keep synthetic disclosure visible.
2. **10–23 s:** Reveal the published median and bands. Move the guess marker beside them. If the guess is close, say so.
3. **23–35 s:** Ask which action had the better observed outcome; reveal the ranking and association caveat.
4. **35–45 s:** Ask the transfer question. Show **Explained now** only after a correct answer and reason; otherwise offer the explanation.
5. **45–50 s:** Show **Demo: later recall preview**, without awarding retained knowledge. Say: “Other customers' experience becomes something you can remember before you need it.”

This replaces 50 seconds of passive stop explanation in the existing pitch. Preserve the juror-note exchange and privacy demonstration. No driving tutorial is needed.

## 7. Build scope: 1–1.5 days on top of v8

Paths below are under `src/`. These are proposed changes only.

| Work | Files/modules and limit |
|---|---|
| Evidence and lesson state | New `one/learning/{lessons,model}.ts`; consume `one/crowd/index.ts`. Author the four persona examples; other stops retain facts-only mode. |
| Shared lesson UI | New `one/learning/LessonCard.tsx`; mount in the v8 stop sheet using `one/yourroad/Sheet.tsx`, reached from `one/RoadTab.tsx`. Same selection in Map/Drive. |
| Passport | New `one/learning/{Passport,store}.tsx`; isolate by persona and `stopKey`, lesson version and evidence version. Keep separate from `hindsight/components/phone/PassportView.tsx` life-history stamps. |
| Recall | Extend `one/nudge/model.ts` and `one/nudge/NudgeProvider.tsx`; preserve road/stop identity. Demo uses an explicit clock preview. Real notification delivery is later work. |
| Verify | Budget the final half-day for gated/withheld states, ties, changed evidence, preview purity, persona isolation, keyboard/reduced-motion access and timed rehearsal. |

## 8. Risks and limits

Care roads never receive lessons, scores, passports or recall nudges. Large & simple receives equal evidence, notes, checklists and optional plain-language comprehension checks. No guessing or animation is required.

Exclude gambling, loot boxes, real-money stakes, public rankings, streak pressure, shame, product rewards and automatic financial actions. Keep learning records private, removable and outside credit or sales decisions.

Basis: [origin](../00-origin-and-feedback.md), [v8 design](../v8-design.md), [game proposal](../proposal-game.md), all four `critique-*.md`, [crowd contract](../../../src/one/crowd/README.md), engine `roads.ts`, `simulate.ts`, `gate.ts`, `lives.ts`, and read-only v7 city inspection. Learning effects remain untested. Production needs reviewed evidence, content validation and a consented retention study.
