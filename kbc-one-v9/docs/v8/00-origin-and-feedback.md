# v8 starting point: the original idea and the user's feedback on v7

## The original road idea (user's words, the spec to match)

**KBC Hindsight, "Waze for your money".**
The flip: every team asks how KBC can understand Tom better. Ask instead: how can 2.3 million customers help each other through KBC?
KBC's most valuable asset isn't Tom's data. It's that tens of thousands of customers have already lived Tom's next 12 months. Nobody has to predict Tom. You just show him the road others already travelled.

How it works:
- **Situations are roads, not labels.** Anonymous transaction sequences show where a customer is on a shared path, e.g. "first home, month 3".
- **The crowd lights up what's ahead.** For each road, aggregated outcomes from everyone who's been there: costs that surprised people, where cash got tight, what the people who came through well did differently. Outcome-ranked, not margin-ranked, so "what helped" can include things that aren't KBC products.
- **Notes to the next person.** Customers who finished a road can leave one anonymous line of advice, moderated before it's shown.
- **You see your position on the map.** "You're at month 3 of a road 41,000 KBC customers have driven. In month 5, 1 in 3 got hit by the first energy settlement."

Why it fits: scale is the feature (cost grows with roads, not customers; each customer = a pointer: which road, how far); one map for every channel (app, push, Kate, adviser: "40% of people call us at this point about X"); privacy built in (k ≥ 500, noise, no sensitive categories, opt-in); memorable demo: the jury describes a situation, the road appears with "ghost riders" ahead, a juror leaves a note that shows up for the next persona.

## KBC One promise (unchanged)
1 app for each user · 1 click away from what you need · 1 road to your destination. Short-term quick actions (Home + Kate) and the long-term vision (the road), leveraging the data of 23M (2.3M) users. Must demo well: fun, easy to follow, technically impressive, unique.

## User feedback on v7 (18 Oct, late)
- "We used to have all the different roads you can drive, so ideally there is an overview of all roads you can take." (Hindsight v4 had ~16 life roads: first job, moving house, first home, first child, going freelance, losing your job, separation, caring for a parent, losing a parent, moving abroad, retirement, heat-pump owners…, with an Atlas.)
- "The town and driving is not intuitive: what am I seeing? Is this the common track? Is this one of the journeys? How do I move somewhere / explore it? What usefulness does it offer?"
- "The road in 2D just offers one thing, the daily road; same for the game."
- "The original road idea comes from [the text above]. I feel like this approach is far from here."

## What exists to build on
- v7 app: `kbc-one-v7/` (running at http://localhost:3400, pick a person on the right rail). Home (v1 bubbles), Kate looks, Your road 2D map (`src/one/roadmap/*`), the 3D city (`src/hindsight/game/**`), nudges (`src/one/nudge/*`).
- The original Hindsight v4 engine is inside v7: `src/hindsight/engine/*` (roads.ts = all life roads with stops, crowd numbers, `gate.ts` = k-anonymity crowd gate, `simulate.ts`/`lives.ts` = synthetic crowd of drivers, `moderation.ts` = notes moderation), `src/hindsight/components/phone/*` (RoadView, RouteView, StopView, ForkView, NotesView, PassportView), `src/hindsight/components/stage/Atlas.tsx` (2.3M people placed on roads).
- The untouched original Hindsight v4 app: `/Users/t.vrolix/Documents/Repositories/hackathon_tectonic/hindsight-v4/` (read only; `npm run dev` there would use port 3100 — don't start it if 3100 is taken; read the code and README instead).
- v1/v5/v6 docs: `kbc-one-v7/docs/01-04*.md`, `docs/v7-brief.md`.
