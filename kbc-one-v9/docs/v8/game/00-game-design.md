# v8 game design: learn the road before you drive it

Synthesis of `learning.md`, `motivation.md`, `gameplay.md`, `evidence-and-pitch.md` (four game-design investigations, 18 Oct). All four converged; there was no real disagreement to debate, only different depths.

## The idea in one line

Every stop on a road becomes a 60-second lesson made from the crowd's own experience: **guess → see what earlier travellers lived → understand what helped → apply it to a new case → save one step.** The Drive view turns one road into a **practice run** of your next 12 months, where your choices meet the crowd's surprises with fictional money. Progress is what you *understand and remember*, never money or time spent.

**Pitch:** "Banks give you pages. We give you a rehearsal. People learn more when they take part and recall (Freeman et al. 2014; Roediger & Karpicke 2006), and here the lesson is literally what 58.300 movers lived before you."

## 1. The lesson loop (2D stop sheet AND Drive, same content)

```
 Stop (e.g. Moving house · setting up)
   │  [Try a guess]                    [Show me the facts] ← always available, never blocks help
   ▼
 GUESS  slider / 2-3 choices + "I don't know"
   ▼
 REVEAL gated crowd evidence; your guess marker slides next to it ("below the typical amount")
   ▼
 WHY    outcome-ranked "what helped" (association, not cause) + a note from someone ahead
   ▼
 APPLY  one new example ("A flatmate moves in mid-month: which record helps?") + why
   ▼
 SAVE   reminder / checklist / adviser question  ·  or "Not now"
   ▼
 PASSPORT stamp: Seen → Explained now → (later) Remembered
```

- Authored lessons for the demo personas only (Tom setup + energy + meter, Karim company fork, Sofie & Pieter energy settlement, Lina December); other stops stay facts-only.
- Numbers come only from `stopEvidenceFor` / `forkEvidenceFor`, gated k ≥ 500, labelled synthetic. Withheld evidence disables the numeric question and says why.

## 2. Practice run (the game inside "Drive this road")

One road, 2–3 minutes, replayable, deterministic for the demo. Ship **Tom's Moving house** only.

```
 Moving house | PRACTICE month 0/12 | Map | Exit       Scenario cash ███████ €600 (fictional)
            month 3 · Energy bill  [amber pothole]
                       │
                 [your preview car]
              ⛽ SERVICE STATION: pick one
   [Keep cash available]  [Buy €300 of furnishings now]  [Photograph the meters]
```

1. Station: choose a preparation (free actions count).
2. Drive 3 s to the energy stop: the published cost band reveals; a labelled illustrative bill (€440, inside the gated €350–€530 band) is subtracted from the scenario cash.
3. Shortfall? The car pauses at a station: no crash, no fail screen. **Rewind**, change one choice, replay the identical bill; your previous run shows as a faint car with side-by-side arithmetic.
4. Finish at month 12 with a timing transfer question ("Repair due Tuesday, refund Friday: which money is available Tuesday?") and one save.
- Three lesson checks, never a readiness %, points or speed. No prepared-vs-unprepared ghost race (the data can't support it). Ghosts stay anonymous crowd groups.
- 2D equivalent: the same steps as cards. Large & simple: worked examples, no guessing required. Care roads: never.

## 3. Why come back (no streaks)

- **Recall before it matters:** opt-in, one question 7 days after the lesson and 7 days before a confirmed real date (Tom's energy bill). Max one invitation per week; generic lock-screen text.
- **The Everyday year:** January renewals, tax, holidays, school, December spending as monthly invitations with real evidence dates.
- **Pass it on:** after living a stop, leave a reviewed note for the next traveller. No fake "your note helped 312 people".
- "Nothing to prepare today" is a good session.

## 4. Progress: the learning passport

Private, per road: each topic is **Seen**, **Explained now** (correct transfer answer + reason) or **Remembered later** (unaided answer in a later session). Stamps are "lessons from the crowd" (principle, source stop, evidence date, saved step). No percentages, no scarcity, nothing revoked for absence, never used for credit or sales.

## 5. The jury moment (≈ 60–75 s inside the 5-minute pitch)

1. Tom → setup stop → a juror slides a guess → reveal next to the crowd → "what helped" → new example → save. (≈ 45 s)
2. Drive this road → shortened practice: buy furnishings → energy pothole → cash short → rewind → keep cash → passes. (≈ 25 s)
3. Line: "You just rehearsed a surprise 58.300 movers already lived. Their experience is the lesson."
The juror-note roundtrip stays the climax.

## 6. Build (≈ 1–1.5 days of agent work on top of v8)

| Module | Owner |
|---|---|
| `src/one/learning/{lessons,model,progress}.ts` (+tests): authored lessons for 4 personas, guess/reveal/apply state, passport, evidence fingerprint | L1 |
| `src/one/learning/LessonCard.tsx` mounted in the v8 stop sheet (`src/one/road8/*`), Passport screen, Large & simple worked-example mode | L2 |
| `src/one/practice/{model,levels}.ts` + `PracticeRun` in Drive (`src/hindsight/game/**`): Tom level, station, cash, rewind, checks, 2D card version | L3 |
| Recall invitations in `src/one/nudge/*` (demo clock preview), Everyday-year invitations | L4 |

## 7. Must not
No gambling, loot boxes, real-money stakes, leaderboards, streak pressure, shaming, product rewards, "you will" forecasts, wealth comparisons, invented impact counts, or claims that games are proven to teach better or reduce calls. Measure with a pre-registered A/B (read-only vs guess-then-reveal; primary: unaided recall after 1 week) before claiming benefits.
