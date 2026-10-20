# v10 build: a real driving game (GTA structure, futuristic look)

App folder `kbc-one-v10/` (copy of v9), port **3700**, `bun install`, `KBC_AI=off`. Nothing is pushed.

## Why v10 (user feedback on v9, verbatim intent)

"Mixed feelings. Still can't go through the village; ideally you can keep driving through it like a game. Unclear how to
explore other roads/trajects. No real game aspect, you just go from question to question. The visuals are a downgrade, very
childish, while the previous version (v6) was futuristic. Think GTA 6: that is the level of game design we need."

So: **free-roam driving through the whole city, missions instead of quiz screens, a premium futuristic night look.**
Be realistic: GTA 6 graphics are impossible in a browser in a day. We deliver GTA *structure and feel*: open city, minimap +
full map with GPS route, mission markers (light beams), cinematic mission intro (letterbox), objectives while driving,
"MISSION PASSED"-style reward, pause menu; plus a premium night look (emissive city, neon, wet reflective roads, bloom, light trails).

## What stays from v9 (do not break)

Home + village card (W4 renames), the phone turn (`src/one/LandscapeCity.tsx`), lessons content + progress store
(`src/one/learning/*`, `src/one/village/*`: lessons become missions, progress = missions passed), crowd model (`src/one/crowd/*`,
gated k ≥ 500), Margaret plain path, Nadia care (no game), Kate, notes.

## Visual + engine reference

v6 is the look the user liked: `kbc-one-v6/src/hindsight/game/**` (night city, districts, avenues per life road, Everyday
ring, driving.ts, Minimap, Ghosts, Stops that pave, Passport). Screenshots: `kbc-one-v10/docs/v10/ref/archive-v6-*.png`
(path: repo `docs/v9/shots/` in the v9-d-archive branch, copied to `kbc-one-v10/docs/v10/ref/`). v6 was too dark, too dense
and too many panels: keep its futuristic identity, make it premium and readable.

## Shared contract (W1 publishes `src/hindsight/game/city10/api.ts` FIRST, this exact shape, extend only additively)

```ts
export type Vec2 = { x: number; z: number };
export type Zone = { id: string; at: Vec2; radius: number };
export type DistrictInfo = { id: string; name: string; roadIds: string[]; centre: Vec2 };
export interface CityApi {
  car(): { pos: Vec2; heading: number; speed: number };
  districts(): DistrictInfo[];
  roadPath(roadId: string): Vec2[];            // centre-line polyline of a life road avenue (or "everyday" ring)
  pointOn(roadId: string, t: number): { pos: Vec2; heading: number }; // t 0..1 along the road
  home(): Vec2;                                // your block in the centre
  setWaypoint(p: Vec2 | null): void;           // GPS line on the road + minimap route
  teleport(p: Vec2, heading?: number): void;
  setAutopilot(target: Vec2 | null): void;     // drives itself along roads (for non-gamers + demo)
  freeze(on: boolean): void;                   // stop input during cinematics/cards
  onEnter(zone: Zone, cb: () => void): () => void;
  cinematic(shot: { target: Vec2; from?: Vec2; ms: number }): Promise<void>;
}
export const CityApiContext: React.Context<CityApi | null>;
```
Scene layers (W2) and missions (W3) render inside `<CityGame>` as children/slots W1 exposes: `<CityGame personaId onExit onPlain>{missions}</CityGame>`.

## Workstreams

| WS | Branch | Port | Owns |
|---|---|---|---|
| W1 Engine & driving | `v10-engine` | 3701 | `src/hindsight/game/city10/{api.ts,CityGame.tsx,engine/**,drive/**,map/**}`. Port v6 city generation + driving into city10 (no dependency on the old v6 store). One continuous city: **your block in the centre** (your Home/Car/Savings/Pension/Business from `villageFor`), the Everyday ring around it, one district per catalogue life road with its avenue leaving the ring. Free driving everywhere (WASD/arrows + on-screen touch pad), arcade handling that feels good (accel, drift-lite, soft collisions, speed-sensitive chase camera with FOV kick). Minimap bottom-left (rotating, district colours, route line), full map on `M`/button with tap-to-set-waypoint and "Autopilot there". GOES FIRST: in ~40 min commit api.ts + a drivable greybox city and broadcast. |
| W2 Look | `v10-look` | 3702 | `src/hindsight/game/city10/scene/**` (materials, buildings, roads, sky, post, ghosts, car model, your-block buildings). Premium futuristic night: emissive window grids, neon edge lines per district colour, holographic district signs, wet reflective asphalt (reflector/env map), car with headlights + red tail-light streaks, ghost cars of the crowd as glowing light trails, fog + skyline glow, bloom + ACES tone mapping + subtle vignette. Your block: Home/Car/Savings/Pension towers with holographic upgrade states (bare → lit → crowned) driven by missions passed. Must stay readable on a projector (labels high contrast, not too dark). 60 fps target on a MacBook, DPR cap 1.5, instancing. Post a screenshot to the orchestrator within ~45 min for art review. |
| W3 Missions | `v10-missions` | 3703 | `src/hindsight/game/city10/missions/**` + mission HUD components. Each lesson from `src/one/learning` becomes a **mission** on its road: (1) light-beam marker in the district + on map; (2) drive in → letterbox cinematic intro "MOVING HOUSE · Mission 1/3 · The first energy bill · 58.300 drove this road"; (3) objective "Follow the earlier movers" (ghost convoy ahead, stay close); (4) "Collect hindsight": 3 glowing pickups on the road = the outcome-ranked *what helped* items (+ a note from someone ahead), each pops a short toast with its gated share; (5) at the bump: "Choose your preparation" from what you collected (= the apply step, as a driving decision); (6) drive over it: prepared → slow-mo, bump paves amber→mint, smooth; unprepared → jolt, "Rewind 5 s" (never lose anything); (7) "LESSON PASSED" screen + your block upgrades + passport stamp + optional reminder save. Free roam between missions. Other roads: every district has a marker; non-own roads are "Test drive" missions (nothing changes for you). Pause menu (`Esc`): Missions by road, progress, passport, Resume / Back to app. Large & simple & care: no missions. Uses `useVillageProgress` (complete/save) so Home shows progress. |
| W4 Shell & demo | `v10-shell` | 3704 | `src/one/LandscapeCity.tsx` (mount `CityGame` after the turn), `src/kbc/ui/App.tsx` + Home card copy ("Your city · Mission 1/3 · ▶ Drive"), HUD frame layout (objective top-left, minimap bottom-left, prompts bottom-centre, map/pause top-right), demo reset (`?reset=1` + pause menu "Reset demo"), optional sound (engine hum, pickup/pave SFX, muted toggle), keep Margaret/Nadia paths, `docs/v10/demo-script.md` (90-s jury run). Integrates W1→W2→W3 as they land. |

## Rules

Only edit owned files; tiny hook-ups elsewhere marked `// v10-<ws>` and listed in your status. Synthetic data only, no
secrets, no push. Commit with `git -c user.name="Thomas Vrolix" commit`, NO Co-Authored-By trailer. `bun run typecheck` +
`bun run test` pass. Verify in headless Chrome on your port (Tom primary; Karim, Sofie, Lina; Margaret/Nadia must stay
non-game), screenshots `kbc-one-v10/docs/screenshots/v10-<ws>-*.png`. One footer "Synthetic demo crowd · not a forecast",
no per-card disclaimers. Rewards only for passed missions; no money, points for spending, streaks, leaderboards, shaming.
