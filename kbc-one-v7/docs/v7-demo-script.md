# KBC One v7 — five-minute jury demo

**One app for each person. One click to the next useful step. One road from what you have to what comes next.**

Use Tom → Margaret → Nadia. Budget: **5:00**, including the clicks and the landscape transition. This is a presenter-led demonstration, not a timed playback of transactions. The spoken lines below are the pitch; the other lines are presenter notes.

All people, payments, investments, cohorts and appointments are synthetic. “23M users' hindsight” is the product ambition from the brief, not a claim that this prototype is connected to 23 million real customer records.

## Before the jury arrives

1. From `kbc-one-v7/`, run `bun install` if needed, then `KBC_AI=off bun run dev`. Open `http://localhost:3400/?p=tom`. The verification port was 3403; the presentation port is **3400**.
2. Use a **fresh private browser window**. The server retains each customer's theme/layout; the browser retains chats, plans and journey state. A fresh window alone does not reset the server.
3. In Tom, click the rail's activity icon (**Inside: Kate, the crowd gate and presenter controls**) → **Director** → **Reset this customer (home, theme, chat, road)**. Close the drawer with its header **×**. Reset Margaret and Nadia as well if their server layouts changed during rehearsal, then return to Tom.
4. Leave **Auto nudge after selecting a person** unchecked. Keep the rail tour stopped during the manual pitch.
5. Warm the city once: **Your road** → **Explore it in your city**; wait for the neighbourhood, then **← Back to the app**. If you opened a place, finish the saved-next-steps sheet with **Go back**. Return to **Home**.
6. Check the starting state: the split suggestion is present; Coffee is absent; Tom's renewal has **0 of 3** steps prepared; the **Set aside € 35 a month** action is enabled.
7. Keep the browser at 100% zoom on a laptop or projector. The stage was checked at 1440 × 1080. Scroll **inside the phone** to reveal lower sections; the stage itself is not the app scroll area.

`KBC_AI=off` is the reliable rehearsal mode. The exact pink/Coffee request uses local customization rules even when Claude is enabled. Do not present that request as evidence of a live model call. For a live-model presentation, start without `KBC_AI=off`, with the `claude` CLI signed in; warm the Home before starting the clock.

## The five-minute sequence

### 1. A home Tom understands — 0:00–0:20

- **Click:** Select **Tom** on the portrait rail. Start on **Home**. Point to **Fixed**, **Yours**, then scroll to **For you**.
- **Say:** “The essentials stay fixed, Tom owns his blocks, and KBC explains its suggestions.”
- **Jury sees:** Balance and Transfer/Pay/Scan/Cards; Yours with Edit; at most three For you suggestions.
- **Promise:** **1 app**. The three zones explain who controls each part.

### 2. A suggestion with a reason — 0:20–0:35

- **Click:** Under **Split the € 128,40?**, click **Why?**. Use the split's Why, not the journey's Why.
- **Say:** “Tom can see why we suggested this, and he can say not now.”
- **Jury sees:** A reason based on the Bar Bidon payment; the suggested group is Lien, Arne and Sam. **Not now** remains available.
- **Promise:** **1 app**. The suggestion is personal and explainable.

### 3. A prepared split — 0:35–0:55

- **Click:** **Ask € 32,10 each** → **Send requests**.
- **Say:** “One tap prepares the split; one confirmation sends the three requests.”
- **Jury sees:** The three recipients and equal shares, then “Requests for € 32,10 sent to Lien, Arne, Sam.”
- **Promise:** **1 click** to the prepared task. **This currently takes two taps to send.** Do not say the requests were sent in one tap. The demo request does not transfer money or require Face ID.

### 4. Tell Kate what fits — 0:55–1:20

- **Click:** **Kate** in the bottom navigation. Enter the exact text below, then click the send arrow (**Send**).
- **Say:** “Tom can describe the app he wants in his own words.”
- **Jury sees:** One request produces a combined style and Coffee proposal.
- **Promise:** **1 app**.

> I like a pink, calm style and show my coffee spending

### 5. See the change first — 1:20–1:35

- **Click:** Pause on **Preview changes**. Do not apply yet.
- **Say:** “Kate shows both changes before touching the home.”
- **Jury sees:** **Style: calm, Rose**, **Add Coffee · size M**, a mini phone, **Coffee this month · € 44,40**, **Apply**, and **Change**. The underlying Home remains unchanged.
- **Promise:** **1 app**. Tom approves the result before it changes his screen.

### 6. Tom stays in control — 1:35–1:55

- **Click:** **Apply**. Kate closes automatically. Point to the pink Home and Coffee in Yours, then click **Undo within 10 seconds**. Use the rest of this beat to explain the result.
- **Say:** “Apply changes the style and adds Coffee together; Undo restores the previous home.”
- **Jury sees:** The Rose theme and Coffee block arrive together, then the previous theme and layout return. The fixed essentials remain.
- **Promise:** **1 click** per Apply or Undo. Do not wait for applause before Undo.

### 7. Help before the next event — 1:55–2:15

- **Click:** Rail activity icon → **Director** → **Send a journey nudge**.
- **Say:** “KBC can offer help before something needs attention, without exposing details on the lock screen.”
- **Jury sees:** The drawer closes and a simulated lock screen shows “Something coming up could use a little preparation.” There is no name, amount or bill type.
- **Promise:** **1 road**. The demo trigger represents proactive help; it is not an operating-system push notification.

### 8. Preparation from hindsight — 2:15–2:40

- **Click:** Tap the KBC notification, labelled **Tap to open securely**. Point to **People like you** on the journey page.
- **Say:** “The ambition is useful hindsight from 23 million customers; this prototype shows synthetic cohorts, not a prediction about Tom.”
- **Jury sees:** **Your car insurance renews on 2 November**, the current product, the comparison with last year, a gated cohort insight, and **Prepared 0 of 3 steps**.
- **Promise:** **23M users' hindsight**. Explain the distinction: past cohort experience informs the next step; the app does not claim Tom will have the same outcome. If the cohort is too small, the app withholds the number.

### 9. One useful next step — 2:40–3:00

- **Click:** **Set aside € 35 a month** → **See your plan** → **Close details** (the sheet's ×).
- **Say:** “One tap adds a monthly saving step for next year's renewal; this year's bill is still due.”
- **Jury sees:** **Prepared 1 of 3 steps**, **On your plan**, then the saved monthly step in **Your plan**.
- **Promise:** **1 click** for the preparation action. This is a synthetic plan entry, not a real bank standing order. Do not describe € 35 as paying the imminent € 412 bill.

### 10. The whole picture, in plain words — 3:00–3:25

- **Click:** **Your road** in the bottom navigation. Show **What you have** and **Coming up on your road**; scroll down briefly for **Your goals**.
- **Say:** “What Tom has, what is coming, and his goals now share one clear view.”
- **Jury sees:** Home rent **€ 950/month**, car insurance **€ 412/year**, savings **€ 8.360**, dated next steps, and the **Gent flat fund** at **72%**. Each value has a clear label.
- **Promise:** **1 road**. Optional if ahead of time: tap Home for its products, then close the sheet. Do not prepare an extra item during this beat.

### 11. The same story in his city — 3:25–3:45

- **Click:** **Explore it in your city**. Pause for the phone rotation and the neighbourhood to appear.
- **Say:** “For Tom, that same information can become a place he explores.”
- **Jury sees:** The phone turns to landscape. His neighbourhood opens with Home, Car and Savings; the next journey is signposted.
- **Promise:** **1 app**. The city is an optional view of the same information. Do not use the keyboard to travel during the timed pitch.

### 12. From a place to a next step — 3:45–4:10

- **Click:** In the bottom **Your places** row, click **Car · 1 to check / Your car**. In the place panel click **Take this road →**.
- **Say:** “His car opens its own products and the insurance journey, with one panel at a time.”
- **Jury sees:** The car's product details, then **Car insurance** and its next steps.
- **Promise:** **1 road**. Show the panel; do not select the € 35 action again. The earlier app preparation already exists in the plan.

### 13. Back to the same app — 4:10–4:25

- **Click:** **← Back to the app**. After opening the car, expect **Your saved next steps**. Leave new suggestions unchecked and click **Go back**.
- **Say:** “Exploring is optional; Tom returns to the same app and his existing plan.”
- **Jury sees:** A review of what he explored, then the portrait phone. The earlier app plan remains.
- **Promise:** **1 app**. If you accidentally saved something in the city, use **Go back without these** to discard only that exploration's new choices.

### 14. The same truth, made simple — 4:25–4:45

- **Click:** Select **Margaret** on the rail. Allow her Home to appear, then click **Your road**.
- **Say:** “Margaret gets the same truth in large, simple words, with no game to learn.”
- **Jury sees:** **What you have**, **Next three things**, large sentences, and two large buttons. Her advisor is **An**. There is no city button.
- **Promise:** **1 app**. Do not borrow the mock-up's pension or advisor values: the running app has **€ 1.890**, paid on day **23**.

### 15. A person first — 4:45–5:00

- **Click:** Select **Nadia**, then **Your road** → **Talk to Els**. Show the conversation choices without booking.
- **Say:** “For Nadia, the right experience is calm support and a person first.”
- **Jury sees:** Her advisor first, next steps only when she asks, and no city. End on the human-support choices.
- **Promise:** **1 app**. Do not send a journey nudge or turn this into a product pitch.

## Rehearsal findings and fallbacks

Verified on **18 October 2026**, integrated commit **`acf7d86`**, with headless Google Chrome at **1440 × 1080**, port **3403**, and `KBC_AI=off`. The complete sequence above passed, including Apply/Undo, the privacy check, Prepared 1 of 3, the saved plan, city entry/return, Margaret and Nadia. **No browser page errors** occurred. These are whole automated beat times from one warm run, including clicks and animation, not performance benchmarks.

| Verified interaction | Observed time |
| --- | ---: |
| Home zones and split Why | 0.35 s |
| Split preview and Send requests | 1.49 s |
| Exact Kate prompt to combined preview | 0.48 s |
| Apply, Home/Coffee check, Undo | 0.97 s |
| Director to private lock screen | 0.52 s |
| Unlock, € 35 action, plan sheet, close | 1.99 s |
| Your road | 0.22 s |
| City entry to neighbourhood controls | 4.86 s |
| Car place and Take this road | 11.20 s |
| Back, debrief and portrait return | 2.90 s |
| Margaret selection and simple Road | 1.11 s |
| Nadia selection, Road and advisor choices | 1.46 s |

**Keep these limits visible in the rehearsal:**

- **Split is not one-tap send.** The exact path is two taps. The script says one tap to a prepared task, then a confirmation.
- **Apply automatically closes Kate.** Do not search for a Close button afterward. Undo expires after 10 seconds; click it promptly. If it expires, reset Tom before the next rehearsal rather than promising that Undo remains available.
- **City animation is the slowest beat.** Speak during the transition. If no places appear after about 10 seconds, keep the explanation on the plain Road and skip exploration. If a return button is available, use it; otherwise reopen the app URL and continue with Margaret. Avoid repeatedly clicking a destination while it is moving.
- **Live Home composition varies.** In an earlier run with Claude enabled, terminal logs showed Home composition around 10–11 seconds. The exact customization prompt still took about 1.3 seconds because it used local rules. A separate cold dev-page navigation timed out after 30 seconds; its cause was not isolated. Warm the app, or use the verified rules-mode run. Do not claim a guaranteed model response time.
- **The city can offer the € 35 step again.** After adding it in the app, the city panel and exit suggestions still show the same step. Leave it unchecked and choose Go back. This is a presentation inconsistency reported to the orchestrator; do not sell it as a second recommendation.
- **Plan removal is not exposed in the plain sheet.** The journey footer says it can be removed there, but the current Your plan sheet has no removal button. Do not demo removal; the mismatch is reported for integration.
- **Reset is not a complete plan reset.** Director resets Home/theme/chat and the road journey, but existing plan entries may remain in that browser. Use a fresh private window for the final rehearsal and reset the server-side customer before starting.
- **The 34% shown is a synthetic cohort result.** In this run, People like you said that 34% who spread yearly premiums over 12 months avoided a large renewal bill. It is not an insurance quote, a live 23M-customer query, or a personal forecast. Keep the spoken distinction in beat 8.

No banking action is required in Margaret's or Nadia's section. Nadia's appointment sheet is shown without a booking.

## Guided rail tour handoff

The orchestrator assigned the rail tour implementation to **WS1** during this task. This change supplies the named beats above; it does not edit `App.tsx` or `stage.ts`.

The inspected App implementation used a fixed 18-second timer to cycle through all six personas. It cannot reproduce this script. WS1 needs to replace that timer with the ordered beat captions above, start on Tom/Home, and end with Margaret then Nadia. A presenter-controlled **Next beat** is preferable to automatic progression through actions: the city must finish loading, and Undo expires in 10 seconds. Keep the actual app clicks explicit; do not auto-send requests, Apply a theme, or create a plan entry from a timer.

Required App changes are confined to the existing tour state/effect and rail Play button, plus a presenter cue showing the current title/clicks. The tour must stop when the presenter chooses another persona. No changes to the banking actions are required for the story; the split's two-tap behavior is documented rather than hidden.
