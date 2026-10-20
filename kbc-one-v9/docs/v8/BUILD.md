# v8 build: workstreams and ownership

Design: `docs/v8/v8-design.md` (read fully) + mock-ups `docs/v8/design/V8*.dc.html` + the debate (`proposal-*.md`, `critique-*.md`). App folder: `kbc-one-v8/`, port **3500** (dev per workstream on its own port). Hindsight engine to build on: `src/hindsight/engine/*` (roads.ts ROADS/LIVE_ROADS, simulate.ts statsFor/forkStats/crowdFor/convoySize, gate.ts K_MIN/gate*, moderation.ts, lives.ts, placement.ts), phone screens `src/hindsight/components/phone/*`, `stage/Atlas.tsx`, notes API `src/app/api/notes/route.ts`, `phone/useLiveNotes.ts`.

| WS | Branch | Port | Owns |
|---|---|---|---|
| A Crowd model | `v8-model` | 3501 | new `src/one/crowd/*` (catalogue, pointers + provenance, stop evidence, matcher, gate coverage), tests. GOES FIRST: publish the API in `src/one/crowd/README.md` + broadcast. |
| B Your road | `v8-road` | 3502 | `src/one/RoadTab.tsx`, new `src/one/road8/*` (single road 2D, ghosts, switches, stop sheet UI), road CSS section in `src/one/one.css` |
| C All roads | `v8-atlas` | 3503 | new `src/one/atlas8/*` (All roads screen, Find a road UI, presenter scale view), adapt `src/hindsight/components/stage/Atlas.tsx` |
| D Notes | `v8-notes` | 3504 | `src/app/api/notes/*`, new `src/one/notes8/*` (Pass it on, review status, demo alumnus, cross-persona roundtrip), `phone/useLiveNotes.ts` |
| E Channels + cut | `v8-channels` | 3505 | Home road card (`src/kbc/ui/HomeMix.tsx` card slot), `src/one/nudge/*`, Kate matcher hook (`src/kbc/kate.ts` minimal), `stage/Adviser.tsx`, `StagePanels.tsx`, Large & simple + Nadia care, removing v7 city/asset entry points in `App.tsx` |
| F Drive this road | `v8-drive` | 3506 | `src/hindsight/game/**`, `src/one/LandscapeCity.tsx`: one avenue = one road, ghosts, surprise markers, Show me ahead, same stop sheet. STARTS after A, BUILT LAST. |

Rules: only edit owned files; minimal hook-ups elsewhere marked `// v8-<ws>` and listed in your status. Synthetic data only, no secrets, no push, `git -c user.name="Thomas Vrolix" commit`, no Co-Authored-By. `bun run typecheck` + `bun run test` pass. Verify in a headless browser on your port for Tom, Karim, Sofie, Lina, Margaret, Nadia; screenshots `docs/screenshots/v8-<ws>-*.png`. Every number shown goes through the gate (k ≥ 500) and is labelled synthetic; "what helped" is outcome-ranked; no readiness %, no asset city.
