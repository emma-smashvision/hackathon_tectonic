# Round 2 for v10 (city) and v11 (world)

User feedback (verbatim intent): "v10 and v11 both look great, continue on both.
1. Both still don't wow me with how the information and lessons are shown.
2. In the village I don't get how I can unlock new areas.
3. The areas should be spaced out further. E.g. my home: if I'm building a home it could show progress based on all payments
   I have made for my home and the amount of mortgage already repaid; later it should show insurances on it, etc."

## 1. Lesson cinema (shared by v10 missions and v11 world lessons) — workstream L1

Stop presenting lessons as text panels. **The data becomes the world.** Every number the crowd gives is shown as a physical,
animated thing first, with one short line of text after it:
- **Guess on the road**: a 3D histogram of the crowd's amounts rises out of the asphalt; you place your marker (drag/keys);
  the bars then fill with falling light particles (the crowd) and your marker lands next to the real median.
- **"1 in 7"**: 7 ghost cars drive into the bump; 6 pass, 1 jolts and flashes red. Shares become proportions of cars/people.
- **What helped**: the road splits into 2-3 lit lanes, one per action; crowd cars flow through each, and the share that made it
  through calm shows as glowing count rings at the end of each lane ("97%"). You steer into the lane you pick (= apply).
- **Note from someone ahead**: a hologram signpost by the road; the quote types itself, with attribution ("— a mover, 2025").
- **Reward**: slow-mo pave, camera swoop, stamp slams onto a passport card, the building floor rises.
- In v11's world: storm = a cloud that rains 7 drops on 7 tiny houses, 1 floods; preparing builds the dam drop by drop.
- One footer "Synthetic demo crowd · not a forecast"; "associated with, not proof of cause" once per lesson, small.
- Plain text equivalent always available (Plain lessons / Margaret). Reduced motion: static frames.
- Copy: short and human. "1 in 7 movers couldn't cover their first bill" — never "the published crowd had a cost above their
  simulated capacity". Dates as "1 Jan 2027", never ISO.
Build as reusable pieces in `src/one/lessonfx/**` (R3F + DOM), wired into `src/hindsight/game/city10/missions/**` for v10.
v11 integrates them into the world lesson flow after L1 publishes.

## 2. Unlocking areas (v11) — WM model + WU UI + WS scene

Every locked area shows **how to unlock** it, as one of three keys (never money spent, never a product purchase):
1. **Life event**: "Tell us you're expecting" / "Moving abroad?" (confirm a life road; Kate or a tap).
2. **A goal**: "Set a goal for uni savings" (any amount; progress is % of your own goal).
3. **What you already have**: holding a product or account opens its area automatically (e.g. a kids account → Kids).
Plus **Explore** (preview the area and its crowd with no change to you). Unlocking is a moment: fog lifts, the land rises,
the area's first building assembles, a crowd line ("9.200 parents walked this before you") appears. The world map shows
locked areas with a key icon and their unlock hint. 

## 3. Spaced-out districts driven by your own finances (v11) — WM + WS + WU

The island grows: areas become **separate districts** (small islands or plateaus connected by lit bridges/roads), far enough
apart that each reads as its own place; camera flies between them. Each district shows **your real progress**, as % of your
own numbers (never absolute wealth vs others):
- **Home (owner, e.g. Karim)**: house construction stage = share of the mortgage repaid (from `people.ts` mortgage: original,
  rate, start, years → repaid principal); each monthly payment made is a brick in a growing wall/path (count shown);
  fixed rate/balance insurance as a foundation stone; **home insurance** as a translucent shield dome; energy as solar roof.
  Panel: "€ 1xx.xxx of € 240.000 repaid · 1xx payments · Home insurance ✓ · Balance insurance ✓".
- **Home (renter, e.g. Tom)**: Leuven flat (rent paid, tenant insurance shield) + the Gent flat scaffold (moving lessons +
  Gent flat fund % from the goal); later: deposit back.
- **Car**: car loan repaid % / insurance shield + renewal date; maintenance reminders as garage lights.
- **Savings**: reservoir/vault fill = % of each goal; **Pension**: tree/tower grows with years contributed and % of the
  yearly tax-advantaged maximum used; **Kids**: kids account island grows with the child's own goal.
- Products appear as attachments on buildings (insurance dome, loan foundation, savings tank) so "what you have" is visible.
Synthetic amounts only, computed from persona data; label "Your demo numbers".

## Polish (both)
Single storm per persona in the demo (Tom: Home/energy, not Car on the Home card); human copy; formatted dates; v11 overview
framing larger; add the image type declaration so `bun run typecheck` passes on a fresh checkout (e.g. a tracked
`src/types/images.d.ts` that does not conflict with Next's, or `next-env.d.ts` handling) — verify with a clean worktree.

## 4. Your places must be usable (v10 city + v11 world) — workstream P1

User: "I can't see or do anything with my savings" (v10: driving up to the Savings glass tower shows only a label
"Savings · Your accounts and goals" and a glowing pad). Every own place (Home, Car, Savings, Pension, Business, Kids) must be
a **destination you can pull into**:
- Drive onto the glowing pad (or tap the building / "Go there" on the map) → the car parks, the camera swings to the building
  and the building **opens**: a place view with the real content of that part of your life:
  - Savings: each account and goal with balance and % of goal, shown as fill levels inside the glass vault (one tank per goal),
    monthly standing orders, "Move € to a goal" as a demo action (local demo state only, clearly not a real transfer),
    and the 1-2 lessons/missions that belong here ("What helped savers like you").
  - Home: the finance progress from section 3 (mortgage repaid %, payments, insurance), lessons for the home.
  - Car: insurance + renewal date (+8% on 2 Nov for Tom), loan if any, "check your cover" mission.
  - Pension: contributions this year vs the tax-advantaged maximum, lesson.
- Labels on own buildings show a live one-liner (e.g. "€ 6.200 · 2 goals · 64%") instead of "Your accounts and goals".
- Leaving: "Back on the road" puts you back in free roam. Same place view component is reused by v11 districts.
Numbers from persona data (`people.ts`, world model), synthetic, never sent anywhere.
