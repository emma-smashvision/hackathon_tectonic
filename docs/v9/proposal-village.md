# v9 world proposal: Your village, the roads ahead

**Goal on screen: "Learn from people ahead. Prepare one step. Build your village."**

Your village is a small Belgian neighbourhood on a sculpted island. Five familiar silhouettes show your financial life. Roads carry lessons home as visible improvements. Within five seconds, you see your place, your car, one destination, and progress: "Energy lesson: 0/3 steps".

## 1. A village you recognise

Use five fixed plots around a pedestrian square. Buildings stay in place across visits. Home remains the visual anchor. No balance controls building size. Renting, modest savings, and retirement deserve equally beautiful places.

| Place and silhouette | Tap: plain banking overview | Bare -> growing -> prepared decoration |
|---|---|---|
| Home: brick gable or apartment | Rent or mortgage payment; home insurance; next known payment or renewal. Future purchase appears as "Exploring", never ownership. | Simple frontage -> planted doorstep -> lit porch and finished path |
| Car: low garage with carport | Car loan or lease, if held; insurance cover and renewal; saved maintenance reminder. | Plain carport -> green roof -> lit workbench and paved apron |
| Savings & investments: glass garden pavilion | Savings accounts and goals; investments with value date; available cash shown separately from investment value. | Empty trellis -> planted trellis -> sheltered seat and warm windows |
| Pension: small pavilion beneath a broad tree | Pension products and contributions; estimate with source/date, if available; saved pension question. | Simple pavilion -> fuller canopy -> lanterns and path |
| Family / Business: courtyard house / workshop | Sofie & Pieter: joint accounts, child savings and family plans. Karim: business account, reserves and saved tax/adviser questions. | Plain courtyard -> garden or awning -> lit table or workshop |

The fifth plot adapts to known context. If both contexts apply, one "Family & business" panel has two sections. If a place is irrelevant, its plot becomes garden. Unknown facts say "Not available". A future goal uses a labelled outline, never a false owned asset. Account totals count each product once.

Each panel starts with three facts and "View all details", then one relevant lesson. Amounts follow the app's privacy setting. No car metaphors in account details.

"Bare" means no lesson decoration yet; the actual home remains complete. Reading earns "Seen". Applying a principle to a new example earns the growing decoration. Saving a checklist, reminder, or adviser question adds the prepared decoration for that topic. Show "Energy step saved", never "Your finances are safe". Saving is not completing the real task. Free actions earn the same improvements as any product-related action. No decay, wealth score, or purchase requirement.

After Save, the road patch smooths, three lamps illuminate toward home, and the relevant decoration unfolds over 1.2 seconds. A brief village view shows exactly what changed. Each topic rewards once; replay cannot farm upgrades. Learning progress persists independently of product balances.

```text
                     Retirement -> park
                             |
              .------ EVERYDAY LOOP ------.
 First home <-|  [Pension]   [Family/Work] |-> Freelance
              |                           |
              | [Savings]   square [Home] |==> Moving house
              |                [Car]      |     next lesson
              '--- Oct -- Nov -- Dec -----'
                      Today ^
       Other exits continue into mist; names appear nearby.
```

## 2. All roads, one readable world

Every catalogue life road gets a stable exit from the ring. The 12 calendar sectors belong only to Everyday; road exits are independent. One Everyday lap previews one year, with seasonal stops and a fixed Today marker. Driving never advances real account dates.

Destinations give roads distinct silhouettes:

| Catalogue roads | Destination forms |
|---|---|
| First home; Moving house | Gabled street; apartment courtyard |
| First job; Going freelance | Office square; workshop district |
| First child; Kid goes to university | Family garden; campus court |
| Moving abroad; Retirement | Harbour; park pavilion |
| Separation; Caring for a parent; Losing a parent; Losing your job | Quiet support signposts opening the plain support path |
| Heat-pump owners | Unlit proposed exit, "Under review"; no playable route |

Care routes remain catalogue destinations, with no drive, ghosts, rewards, or victory destination. Their signposts request consent before plain support content. Nadia's Home entry goes directly to that invitation, without the game transition.

From the village, light the selected exit and two nearby junctions. Other roads fade into blue-grey mist, with low silhouettes. Show at most three road labels. The next lesson has one amber marker; later stops stay quiet. Forks appear when relevant, never as a forest of choices.

"All roads" raises the camera and opens one searchable catalogue panel. Six group signposts organise the horizon. Selecting a row highlights its exit and destination; only that road expands. Keep all 14 entries discoverable, including care and review status. "On now", "Exploring", and "Past" use the v8 pointers. Exploring never changes confirmed placement; an unknown stage never gets a "You are here" marker.

## 3. The entry is the first spectacle

Portrait Home keeps its banking overview and Kate. A visible "Your village" card gives every persona one-tap access to the appropriate experience.

1. **0-0.7 s:** the existing phone lifts, rotates 90 degrees, and expands into landscape. The screen goes dark inside the visible bezel.
2. **0.7-1.15 s:** the screen powers on; the village appears from above. Preload the scene while Home is visible.
3. **1.15-2.2 s:** hold the five silhouettes and goal sentence. A light traces from Home to the selected road.
4. **2.2-3.4 s:** swoop along that trace into a high follow view. The car waits at the current stage. "Go to next lesson" starts travel.

Use the confirmed road, then an explicitly labelled preview, otherwise Everyday. A Home lesson card preserves its road/stop target. A building tap interrupts the swoop and opens its overview.

"Village" returns to the aerial view without leaving. Persistent "Back to Home" saves progress, powers down for 320 ms, then reverses the 700 ms rotation. Restore Home scroll and focus; show a small saved-step receipt there. No mandatory exit questionnaire. Reduced motion uses a short fade. Margaret's Large & simple entry opens equivalent plain overview and lesson cards. WebGL failure offers that same path.

## 4. A camera that does the work

Three preset views: village at 55 degrees, road follow at 35 degrees, and catalogue overview. No required orbit, pinch, or camera controls. Keep the car in the lower-left safe area when a panel opens. Tap a building, sign, or next-stop button to auto-drive along connected roads. Trips take 2-4 seconds; offer "Arrive now". Stop before a lesson and pause movement while it is open.

```text
+------------------------------------------------------------+
| < Home   Moving house       Energy: 1/3     Village All roads|
| Learn from people ahead. Prepare one step.                  |
|                                   +-----------------------+|
|      village on horizon           | ENERGY LESSON     X   ||
|             . . light trails      | Guess / reveal / apply ||
|         road ======> next stop    | One question or fact   ||
|        [your car]                 | One primary action    ||
|                                   +-----------------------+|
| Auto-drive [Pause] [Steer]    Synthetic demo data            |
+------------------------------------------------------------+
```

One panel occupies the right 36%; close it before opening another. Hide route lists and steering during lessons. Optional Steer reveals arrows/WASD with lane assistance, no collisions or time penalty. Auto-drive resumes immediately on request. Use keyboard-focusable HTML labels, 44 px targets, and text alongside colour.

## 5. Projector art, one-day scope

Aim for a warm Belgian blue hour: pale brick, terracotta roofs, teal water, soft hills, amber windows. Keep ground and facades bright enough for a projector. Chunky silhouettes, stepped island edges, broad shadows, and restrained bloom give depth. Avoid black streets and tiny neon text.

Ghost cars leave short pearl-blue trails ahead. Use only published v8 ghost groups; withhold suppressed groups entirely. The current model is synthetic illustrative stage density, not real tracked journeys. Keep that disclosure visible and expose its basis on tap. A later real aggregate source can replace it. Never imply individual people, live traffic, or guaranteed outcomes. Show outcome associations in lessons using "associated with".

Reuse v7 `LandscapeCity.tsx` rotation and settled-canvas mounting; `neighbourhood.ts` grouping/travel; `Places.tsx` meshes; `Player.tsx` interpolation; `WorldLabels.tsx` and `PlacePanel.tsx`. Check restoration carefully: `World` currently exports `MapWorld`, `Stops` returns null, and `Player` uses map gates. Reconnect geometry, stops, and runtime together. Replace `network.ts`'s fixed avenue order with catalogue IDs. Replace legacy raw ghost counts and readiness percentages with v8 gated groups and lesson state.

Build five modular plots, ring, catalogue exits, one detailed Tom road, three camera poses, and one reward animation. Other published roads reuse geometry and existing content. Reuse instancing; cap ghosts at 24 and pixel ratio at 1.5. Disable bloom first on slow hardware. Target 30 fps at 1366x768; verify projector contrast, all persona entries, return flow, and 2D parity.

**90-second reveal:** rotate and swoop (5 s), inspect Home (10 s), travel and learn from crowd evidence (45 s), save and watch Home improve (15 s), show All roads and return (15 s).
