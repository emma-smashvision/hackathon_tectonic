# KBC One

**The pitch app for the KBC challenge:** a proactive banking home, Kate, Your road and founder roads built on what 2.3 million earlier customers did. The [main README](../README.md) tells the story and the demo; this file is for running and changing the app.

This build started from KBC One v10, without its 3D city and driving game, and adds the business roadmaps.

## Run

```bash
bun install --frozen-lockfile
bun run dev
# http://localhost:3700/?p=lina
```

| Environment variable | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Kate and the home composer call the Anthropic API through `@anthropic-ai/sdk` (`claude-opus-5-5`, low effort, server-side fallbacks) |
| *(not set)* | The local Claude Code CLI (`claude -p`) is used, with your own login |
| `KBC_AI=off` | Built-in rules only, for stable timed rehearsals |
| `KBC_KATE_MODEL`, `KBC_COMPOSE_MODEL` | Override the model: `opus`, `sonnet`, `haiku` or a full model ID |
| `KBC_CLAUDE_TIMEOUT_MS` | Timeout per Claude call (default 90 000) |

Slow, refused or failed Claude calls fall back to the built-in rules. Production: `bun run build`, then `bun run start` (port **3700**). Run a single instance, because demo state is kept on disk.

## Demo customers

Open `/?p=<id>` or pick a portrait on the rail.

| Id | Customer | Story |
| --- | --- | --- |
| `lina` | Lina, 31 | Weekend in London: pound pocket, trip spending, top-up |
| `tom` | Tom, 29 | Moving to Gent: split the dinner bill, moving checklist, flat fund |
| `sofie` | Sofie, 34 | Physiotherapist: sole proprietorship done, **Become a BV?** |
| `marc` | Marc, 26 | Tech founder: domain bought, **Side activity or BV?** |
| `karim` | Karim, 45 | Freelance designer: sole proprietorship → BV |
| `margaret` | Margaret, 74 | Large and simple |
| `nadia` | Nadia, 47 | Losing a parent: calm, a person first |

For Sofie and Marc, **Your road** and the big Home bubble open their founder road directly.

## State and reset

- **Server state:** Kate looks, layouts and requests are kept in `.data/kbc-state.json`. Reset one customer with `POST /api/kbc/command` and the body `{"persona":"sofie","type":"reset"}`, or with Director → Reset.
- **Founder road progress** (crossroads choices, finished steps) is kept in memory for the session; a reload starts again.
- **Plan reminders and chats** use browser storage.

## Checks

```bash
bun run typecheck
bun run test    # bun tests in src/ plus tsx tests in tests/
bun run build
```

After changing a `*.src.css` file, run `node scripts/scope-css.mjs` to regenerate the scoped CSS. CI runs typecheck, tests and build on every pull request.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/kbc/personas.ts` | Synthetic customers, transactions and advisors (rail order) |
| `src/kbc/compose.ts`, `server/service.ts` | Home composition and Kate, with validation and the rules fallback |
| `src/kbc/server/claude.ts` | Claude access: Anthropic API with a key, `claude -p` without |
| `src/kbc/ui/App.tsx`, `HomeMix.tsx`, `MixBubbles.tsx`, `stage.ts` | Phone shell, Home bubbles, presenter stage |
| `src/one/RoadTab.tsx`, `yourroad/`, `atlas8/` | Your road, All roads and plan |
| `src/one/business/model.ts` | Job roads, Belgian partners and what earlier customers chose |
| `src/one/business/founder.ts` | Founder roads in seven chapters (Sofie and Marc in full), the crossroads, partner teams and the chapter map |
| `src/one/business/BusinessRoads.tsx`, `FounderCard.tsx`, `founder.css` | The founder road screens, the crossroads, *What you need now* with Kate's drafts, Home bubble styling and the road-tab card |
| `public/partners/` | Partner logos used on the *What you need now* cards |
| `src/hindsight/engine/` | Synthetic cohort roads and life calculations |
| `src/app/` | Next.js entry and API routes (`/api/kbc/*`, `/api/notes`) |

## Prototype limits

- **Synthetic data.** All customer, crowd and practice data is synthetic. Percentages describe a synthetic crowd; they are not forecasts.
- **Not legal advice.** The Belgian rules on the business roads are simplified and are not legal or tax advice.
- **Example offers.** Partner offers are examples; the named organisations are where people go, not KBC partners.
- **Demo records only.** Plan actions, bookings and payments are demo records, not real instructions.
