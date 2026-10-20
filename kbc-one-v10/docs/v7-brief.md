# KBC One v7: the brief

v7 starts as an exact copy of v6 (`kbc-one-v6/`), on port **3400**. The goal of v7 is **not more features**. It is to make what we have clear, calm and easy to find, while keeping the unique look.

Design mock-ups: `docs/v7-design/*.dc.html` (static HTML, open in a browser; ignore `support.js` errors). They show the intent, not pixel-exact specs. Keep v6's visual style (dark glass, bubbles, KBC azure) where it already works.

## The promise

1. **1 app for each user**: you see what you need, in the style you need.
2. **1 click away from what you need**: every suggestion is one tap.
3. **1 road to your destination**: what you have today, and the journeys ahead, with KBC helping before each one starts. Built on what 23M users lived ("people like you"), never a prediction about you.

## What is wrong in v6 (seen in the browser)

- Home: the three zones (Fixed / chosen by you / suggested) exist in code but are not visible as zones. Users can't tell what is theirs and what KBC suggests.
- Too many features at once; hard to see what is there.
- The car metaphor leaks everywhere: speedometer "months of buffer", "Boot", "Tyres", "drivers at your point", "paved", "glovebox", "drive one month forward". It must live only inside the city.
- No clear way to get to the city, and no non-game way to see "what I have and what's ahead". Older users need the plain view.
- The city is overwhelming: a road-progress checklist, a fuel panel, 6 HUD buttons, every life road in the country labelled, a passport, etc.

## The v7 design

### A. Home: three zones, always in this order
1. **Fixed**: balance + Transfer, Pay, Scan, Cards. Never moves, never restyled away.
2. **Yours**: blocks the user chose (pinned / added via Kate / Edit). Max 6. Section header "Yours" + "Edit".
3. **For you**: suggestions by KBC, **max 3**, each with **Why?** and **Not now**. At most one is a road/journey card. The open-intent ("Split the € 128,40?") is the first For you item.
Then the Kate dock. Every block = one component × one configuration (size S/M/L, style Calm / Cards / Dense / Large & simple, theme). No new block types.

### B. Kate makes it yours
Kate can change the style/theme and add, remove, resize or adjust blocks. Every change is a **preview card with Apply / Change**; after Apply a 10-second **Undo** bar. Locked: contrast checks, the Fixed zone, max counts above. Quick chips: "Make text bigger", "Fewer blocks", "Back to KBC style".

### C. Your road (the non-game way) — bottom nav "Road" becomes **"Your road"**
- **What you have**: Home, Car, Savings & investments, Pension (only those that apply), each a tile with its value and its KBC products (loan, insurance, pots, pension saving). Tap → a plain detail sheet with the products and the next step.
- **Coming up on your road**: the next 3 to 5 dated items (journeys and bills) with "ready %" and one-tap prepare.
- **Your goals**: progress bars.
- **Explore it in your city**: one clear button that opens the city.
- **Large & simple** (Margaret): plain sentences, "What you have", "Next three things", two big buttons. No city button. Care road (Nadia): calm, advisor first, no city.

### D. Your city, simplified (optional, playful)
- Start in **your neighbourhood**: max 4 places (home, car, savings/investments, pension) that show what you have. Tap or pull over at one → **one** panel with its products and a "Take this road" action.
- Roads out of your neighbourhood are **signposted journeys** (the next journey highlighted, at most 2 others dimmed). Other life roads (test drives) are reachable but not all labelled at once.
- HUD: one title card top-left ("Your city · next: …"), one "Back to the app" button top-right, one panel at a time at the bottom, a small hint line. Remove the road checklist, fuel gauge panel, passport button, and extra buttons from the default HUD (keep code if needed, hide by default).
- Plain copy in the HUD: "Saved for later" instead of glovebox, "prepared" instead of paved.

### E. Journeys and nudges
- When a journey is about to start (within ~6 weeks, not prepared), KBC sends a **nudge**: a lock-screen-style notification (no amounts, names or bill types on the lock screen) and an in-app banner/For you card.
- The nudge opens the **plain journey page**: what it is, your product, what people like you did, prepared x of y, 2–3 one-tap actions. "See it in your city" is a secondary link that opens the city at that journey.
- Demo trigger: Director tab → "Send a journey nudge".

## Words
Outside the city: buffer (months of bills), savings, cover, people like you, prepared, coming up, journey. Never: fuel, boot, tyres, drivers, paved, bump, glovebox, drive (except "See it in your city").

## Workstreams and file ownership

Each workstream works in its own worktree on its own branch made from `kbc-one-v7`, **only inside `kbc-one-v7/`**, and only edits the files it owns. Need a change in a file you don't own? Make the smallest possible change and say so in your final status. Read-only for everyone: `src/hindsight/engine/world.ts`, `src/one/people.ts`, `src/kbc/personas.ts` (add new exported helpers in your own new files instead).

| WS | Branch | Port | Owns |
|---|---|---|---|
| 1 Home zones | `v7-home` | 3401 | bottom-nav label "Road" → "Your road", `src/kbc/ui/Screens.tsx` (home parts), `src/kbc/ui/Blocks.tsx`, `src/kbc/blocks.ts`, `src/kbc/compose.ts`, home CSS in `src/kbc/ui/kbc.src.css` |
| 2 Kate makes it yours | `v7-kate` | 3402 | `src/kbc/kate.ts`, `src/kbc/theme.ts`, `src/kbc/actions.ts`, `src/kbc/server/*`, new `src/kbc/ui/KatePreview.tsx` (minimal hook-up in Screens.tsx) |
| 3 Your road (plain) | `v7-road` | 3403 | `src/one/RoadTab.tsx`, new `src/one/yourroad/*`, Road CSS in `src/one/one.css` (a new clearly marked section) |
| 4 City simplified | `v7-city` | 3404 | `src/hindsight/game/**`, `src/one/LandscapeCity.tsx`, `src/one/TripDebrief.tsx`, `src/hindsight/hindsight.src.css` |
| 5 Journeys & nudges | `v7-nudge` | 3405 | `src/one/road.ts`, `src/one/LookAheadCard.tsx`, `src/one/StagePanels.tsx`, new `src/one/nudge/*` |

## Done means
- `bun run typecheck` and `bun run test` pass in `kbc-one-v7/`. If you edit a `*.src.css`, run `node scripts/scope-css.mjs`.
- You **looked at it in a browser** (dev server on your port: `bunx next dev -p <port>`), at the phone on the stage, for Tom, Margaret and Karim at least, and saved 2–4 screenshots to `docs/screenshots/v7-<ws>-*.png`.
- One or more commits on your branch. No push. No secrets. Synthetic data only.
- Final status: what changed, what you verified, what you did not do.

## It has to demo well
This is for the hackathon pitch. Every workstream must be **fun, easy to follow on stage, technologically impressive, and unique**. Simpler does not mean plainer: keep the signature moments (bubbles, the phone turning to landscape, Kate restyling the app live, the 3D city) and make each one land in a few seconds with one obvious tap. Think "what does the jury see in 20 seconds?".

---

# v7.1: feedback round (18 Oct, evening)

## What the user saw in v7
- The city: hard to find (only worked for one person), not really drivable, unclear what it shows, what the goal is and why it's useful. Unclear how journeys/roads are reached and when they appear.
- The Home: the explicit "Fixed / Yours / For you" labels feel unnatural. Pressing Edit changes the design. After "KBC look" you can't go back to your earlier Kate style. We lost the strong, unique, intuitive v1 design where everything needed fits on the first screen and you scroll down to explore more.
- Your road should be a **2D map, like Duolingo's path**: tracks with crossing points, a tree you can follow without playing the game.

## Decisions
1. **Home = mix** (mock-up `docs/v7-design/HomeMix.dc.html`; reference the v1 home running on :3001 from `hackathon_tectonic/` main). v1's bubble cluster is the hero: greeting, big centred balance, one italic narrative line, round Transfer/Pay/Scan/Cards, then 3–5 sized bubbles, chips, Kate dock. **No zone labels.** Kate's intent card appears **only when something just happened** (split after a dinner, Margaret's double debit) as one compact card above the bubbles. Suggested bubbles look like the others, with a tiny sparkle; their Why?/Not now live in the bubble's sheet. Everything needed fits on the first screen at 390×844; scroll down for more (rest of your blocks, other suggestions). The caps stay in the composer (max 6 yours, max 3 suggestions). **Edit = the same home in place** (iOS-style jiggle: drag, remove, add), never a different look.
2. **Kate looks history**: every look Kate made is kept. "KBC look" never deletes it. A "Your looks" row (swatches: KBC, Pink Bubbles, …) in the theme card and in Kate's sheet switches back and forth in one tap.
3. **Your road = a 2D tree map** (mock-up `docs/v7-design/RoadMap.dc.html`): a vertical winding path from "You · today" upwards, stops as round buttons (states: done / ready / next / later / locked), crossings as diamond nodes that split into branches, side tracks branching off the Everyday road where a life journey starts. Each track shows **why it's on your map** (origin). Tap a stop → sheet with the one-tap steps. A compact "what you have" chip row on top. "Play it in 3D" opens the city at the same stop. Large & simple: plain list (as now).
4. **City = prepare-the-road game**: your neighbourhood = what you have; each track from the map = a road out of it; stops = checkpoints you drive to and prepare (one tap = a real plan step); goal per road = 100% ready before its date (a ready ring per road in the HUD). Drivable with keyboard **and** an on-screen pad/tap-to-go; the car follows the road. A 3-step intro on first open explains: what you see, the goal, how to drive. One entry everywhere (Your road "Play it in 3D", the nudge's "See it in your city", Kate) for every person with a road (Tom, Karim, Sofie & Pieter, Lina); never for Margaret (Large & simple) or Nadia (care).
5. **One shared road map model**: `src/one/roadmap/types.ts` (contract, committed) and `src/one/roadmap/model.ts` (`roadmapFor(person, store) → RoadMap`, WS5). The 2D map and the city read only this; the nudge's next-up is `RoadMap.nextUp`.

## v7.1 workstreams
| WS | Branch | Owns |
|---|---|---|
| 1 Home mix | `v7-home` | Home in `App.tsx`/`Screens.tsx`, `Blocks.tsx`, `compose.ts`, home CSS |
| 2 Kate looks | `v7-kate` | `theme.ts`, `kate.ts`, server, `KatePreview.tsx`, the theme card |
| 3 Road map 2D | `v7-road` | `src/one/RoadTab.tsx`, new `src/one/roadmap/Map*.tsx`, road CSS |
| 4 City game (world) | `v7-city` | `src/hindsight/game/scene/**`, `runtime.tsx`, `driving.ts`, `network.ts`, `cityGen.ts`, `streets.ts`, game logic |
| 5 Road map model + entry | `v7-nudge` | `src/one/roadmap/model.ts` (+tests), `src/one/nudge/**`, `road.ts`, `StagePanels.tsx`, entry wiring |
| 6 City UX (HUD + intro) | `v7-cityux` | `src/hindsight/game/hud/**`, `src/one/LandscapeCity.tsx`, `TripDebrief.tsx`, `hindsight.src.css` |
