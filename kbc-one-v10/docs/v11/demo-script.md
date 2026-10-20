# KBC One v11 — Your world

Run locally from `kbc-one-v10/` with `KBC_AI=off bunx next dev -p 3804`.
Open `http://localhost:3804/?p=tom&reset=1`. The fixed synthetic calendar is shown in the world.
The URL reset clears only Tom's lessons and saved steps, including the v10 mission rewards.
For a clean sharing demonstration, use **Inside → Director → Reset demo notes**. That separate control clears submitted demo notes for all personas.
Leave sound off. Use a landscape browser window, ideally 1512 × 806 or larger.

## 90-second jury run

| Time | Action | Say |
| --- | --- | --- |
| 0–10 s | Open Tom's **Your world** card. Let the phone turn into landscape. | “Your financial life becomes a world you can understand. Each area is one part of your life.” |
| 10–20 s | Select **Home**, open its storm preparation, and read the source date. Return to the area. | “A storm is a moment people ahead found difficult. We show the source date, and the crowd only when the group is large enough.” |
| 20–35 s | Start **First energy bill**. Guess, reveal the crowd, show what helped, apply the lesson, choose **Not now**, then **See my area grow**. | “You learn what people lived through, then try the lesson on a new case.” |
| 35–65 s | Return to Home's quest path. Choose **Drive this road** for **First energy bill**. Open **Map · M** and choose **Autopilot there →**, then **Drive for me**. The selected energy route is already set. Choose the useful preparation and cross the bump. | “The same lesson is a road you can drive. Hindsight helps you prepare for the bump.” |
| 65–75 s | On **Lesson passed**, choose **Save reminder**, then **Back to your world**. Select Home again. | “The lesson grows the building. A saved preparation step builds the shield. The world grows through progress.” |
| 75–90 s | Open **Signposts & lanterns**. Show a reviewed note and its actual useful count. | “You can leave what helped you for the next person. A lantern lights when another person marks it useful.” |

Rehearse the drive before presenting. Driving and review use real state transitions; do not claim a note is reviewed or useful before it is.
If the live route needs more than the allotted time, explain the drive while it runs and extend the demonstration. Do not skip the physical crossing or award a result manually.
Prepare the signpost before the jury run: complete **First energy bill**, plant the meter-photo note, and wait for **Approved**. Open that note in a second browser profile, leaving **Mark useful** ready. Reset Tom with `?p=tom&reset=1`; this keeps the reviewed note and clears learning progress. At 75 s, mark it useful in the reader profile, then return to the author to show the actual lantern. If a reader has already marked it useful, show the existing count without claiming a new event.
The interface never invents “312 readers”, a lantern count, or a 3-week deadline. Tom’s Home card currently rounds his recorded Car renewal in 16 days to 3 weeks; Home’s energy lesson has its own displayed source date.

## Six-persona tour

- **Tom:** Home and moving lessons; a real v10 drive returns the earned reward to the world.
- **Karim:** Work and business trade-offs. Compare administration and timing; no recommendation to choose the largest group balance.
- **Sofie:** Shared family world with Pieter, own-goal percentages, and the parent co-build mini-world. The child preview is labelled where no child record exists.
- **Lina:** Family and seasonal planning; learning and saved preparation grow the world.
- **Margaret:** **Open plain world** opens large areas and lesson buttons. No rotation, canvas, or driving controls.
- **Nadia:** **See support options** opens consent first. **Show what helped others when I’m ready** opens the care garden. Practical help opens only after her choice. No quests, storms, scores, or rewards.

## Reset and return

- **Back to your world** exits a drive without losing the lesson or an optional saved step.
- **Back to Home** returns the landscape phone to the banking app.
- `?p=<persona>&reset=1` resets that person's world and drive progress, then removes the reset parameter.
- **Inside → Director → Reset** resets the current person's app state, world progress, and care consent.
- **Reset demo notes** clears the shared note submissions separately. Resetting one person's learning does not remove other people's notes.
- Reload preserves completed lessons and saved preparation. Changing persona never transfers another person's reward.

The host displays one “Synthetic demo crowd · not a forecast” footer. World growth uses learning, preparation, and percentages of each person's own goals. Gated lesson evidence can explain amounts, but those amounts never size the world.

## Integrated verification on port 3804

Headless Chrome verified all 6 personas, no canvas during the phone transform,
portrait-to-plain fallback, compact landscape, one world footer, and the exact
world lesson → v10 mission → physical crossing → saved step → world reward path.
The automated lesson-plus-drive-plus-return sequence took 38.6 s, leaving time
for narration in the 90-second run. Reload, persona isolation, and URL reset passed.
The sharing check also passed: a reviewed note received exactly 1 useful event from a separate reader profile, and the author’s lantern survived reload.
Typecheck passed. The full test command passed 214 Bun tests and 48 engine tests, with zero failures.
The completed-lesson replay regression is covered in the mission controller test:
a saved-step refresh must preserve the explicitly selected quest.

Repeatable scripts (run from `kbc-one-v10/` with an installed Playwright module):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node docs/v11/verify-shell.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node docs/v11/verify-responsive.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node docs/v11/verify-world-drive.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chrome node docs/v11/verify-signposts.cjs
bun run typecheck
bun run test
```

Evidence is in `docs/screenshots/v11-shell-*.png`. The Home card, world, and area
screens were compared with `docs/v11/design/W11Home.png`, `W11World.png`, and
`W11Area.png`. Crowd and deadline text follow the source model where mock-up
numbers differ. The Home image is a generic scene postcard, with no live canvas.
