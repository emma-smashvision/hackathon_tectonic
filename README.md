# Tectonic

Our entry for the KBC challenge at the Tectonic Hackathon: **One KBC. Your version.** It is a banking home screen that rebuilds itself around each customer based on their situation, behaviour and intent.

The V1 prototype runs entirely in the browser and uses synthetic data only. It has no Supabase calls, no real personal data and no secrets. The left side shows a phone mock-up of the home screen. The right side is an **engine inspector**: pick a persona, inject live signals and watch the home screen reorder itself.

### Demo script

1. **Tom, 29**: click *IKEA purchase*. A furniture purchase alone is weak evidence (35%), so the home asks "Planning a move?" instead of changing the layout. Then click *Moving company payment* and *Rent to new city*. The evidence adds up, the moving checklist jumps to the top and a budget card flags the new rent.
2. **Sofie & Pieter**: their house savings goal and two mortgage-simulator views prompt "Thinking about buying a home?". Click *Viewed mortgage simulator* (or answer Yes) and "Can we buy a house?" moves to the top, with an affordability slider, goal progress, a document checklist and a button to book an advisor.
3. **Jana, 74**: large text, frequent zooming and mis-taps produce the simple density: large type, big buttons and at most three adaptive cards. Click *Booked flight to Lisbon* and the travel card appears in its simple variant, because needs combine.
4. **Marc, 71**: he checks his portfolio 12× a week and shows no accessibility signals, so he gets the detailed view with full investments. Behaviour overrides age.
5. **Karim, 45**: a freelancer whose income is irregular and who invests actively. He sees a tax-reserve tracker and detailed investments.

Every adaptive card has a **Why am I seeing this?** explanation, plus pin and hide buttons. Pins and hides persist in `localStorage`. **Reset** restores the current persona's data and layout.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Motion, Supabase PostgreSQL, Vercel Analytics and Speed Insights, Inter and Geist Mono, Bun, and Biome. This is a single app, so Turborepo is not needed.

## Local development

Use Node.js 24 (`nvm use`) and Bun 1.3.9.

```sh
bun install --frozen-lockfile
cp -n .env.example .env.local
bun dev
```

Open http://localhost:3000 for the prototype; it needs no environment variables. The (currently unused) word list needs the Supabase URL and publishable key in `.env.local`, plus the database migration below. Without the connection, the page displays a list-loading error.

## Word-list database setup

Apply [the entries migration](supabase/migrations/20260930113000_create_entries.sql) **before deploying the word-list UI**. With an account that can manage the Supabase project:

```sh
bunx supabase link --project-ref riejgyofzdvrkpwbuyab
bun run db:push
```

Alternatively, paste the complete migration into the project's Supabase SQL Editor and run it once. If it was applied manually, use `bunx supabase migration repair 20260930113000 --status applied` after linking to record it before future CLI migrations.

The `public.entries` table contains `id`, `word`, and `created_at`. The database rejects blank words and words longer than 80 characters. Row-level security permits visitors to read, add, and delete entries; updates are not granted. This is intentionally a shared public test list, not a private per-user list.

To verify the connection: add a unique word on the website, reload and confirm it remains, remove it, then reload and confirm it is gone. The **Refresh** button also loads changes made by other visitors.

For a repeatable API check, run `bun run db:check`. It uses the public app key to add a unique test word, read it back, delete it, and verify deletion; it never changes existing entries.

| Command | Purpose |
| --- | --- |
| `bun dev` | Start development server |
| `bun run check` | Run Biome and TypeScript |
| `bun test` | Run the engine unit tests |
| `bun run lint:fix` | Apply safe lint and formatting fixes |
| `bun run format` | Format source files |
| `bun run build` | Create production build |
| `bun start` | Serve production build |
| `bun run db:types` | Generate types from the linked Supabase database |
| `bun run db:push` | Apply migrations to the linked database |

CI runs lint, type checks, and a production build on pull requests and pushes to `main`.

## Start building

The engine is a pure TypeScript pipeline: **signals → inferred needs → ranked components → homepage config → render**.

- `src/lib/engine/types.ts`: the profile, transaction, behaviour-signal, need, widget and `HomepageConfig` types.
- `src/lib/engine/infer.ts`: rules that turn signals into needs with a confidence (0–1), a source (`declared`, `inferred` or `behaviour`) and human-readable reasons. At 60% or above, a need changes the layout. Between 25% and 60%, it becomes a question card instead: Yes declares the need at 100%, and Not relevant suppresses it. Accessibility needs come from behaviour only (large text, zoom, mis-taps); age is never an input.
- `src/lib/engine/rank.ts`: scores each adaptive widget as base + Σ(need weight × confidence) + usage, respects pins and hides, picks the density (`simple`, `standard` or `detailed`) and tone, and assigns each card a size and variant. The core zone (balance, pay and transfer) is fixed.
- `src/lib/engine/personas.ts` and `signals.ts`: synthetic personas and the injectable live signals.
- `src/lib/engine/engine.test.ts`: `bun test` coverage for combining needs, behaviour overriding age, low confidence becoming a question, pins and hides, and the fixed core zone.
- `src/components/widgets/`: the widget library. Every widget has a simple and a detailed variant. Currency and eSIM are marked as *proposed services*.
- `src/components/phone/`: the phone home renderer, which uses Motion layout animations, and the card shell with the why/pin/hide controls.
- `src/components/inspector/`: the engine inspector.
- `src/components/prototype/`: the demo state, a reducer that stores pins and hides in `localStorage` wrapped in try/catch.
- `src/app/layout.tsx`: metadata, fonts, and analytics.
- `src/app/globals.css`: Tailwind, the KBC-style colour tokens, and the density-driven type and tap-target scale.

To add a widget: add its ID to `AdaptiveWidgetId`, add a scoring rule in `WIDGET_RULES`, then register a component and its metadata in `src/components/widgets/registry.tsx`. To add a need: add a rule to `RULES` in `infer.ts`.

The Supabase starter code is unused by the prototype but kept intact: `src/app/word-list.tsx`, `src/lib/supabase/*`, `src/proxy.ts` and `supabase/config.toml`.

For animations, import from `motion/react` in a `"use client"` component, or `motion/react-client` in a Server Component.

## Supabase (connected)

The hosted project **SmashVision x SuperiorSwarm** (`riejgyofzdvrkpwbuyab`, eu-central-1) is set up. The browser, server, and proxy clients use `src/lib/supabase/database.types.ts`. The entries table is defined by the migration above. CLI linking is local to each checkout and is not included in Git.

Each developer still needs their own `.env.local`, since it is git-ignored. The steps below cover that and describe the original setup for reference.

### 1. Create a project

Already done for this repo, so skip to step 2. To set up a fresh one: in the [Supabase dashboard](https://supabase.com/dashboard), create a project, choose a nearby region (Frankfurt is suitable), save the database password in your password manager, and wait until the project is ready. Then apply the entries migration.

Open the project's **Connect** dialog and copy its **Project URL** and **publishable key**. The project reference is the identifier in its dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`.

### 2. Configure local development

Create `.env.local` if it does not exist (`cp -n .env.example .env.local`), then set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Restart `bun dev` after changing environment variables. `.env.local` is ignored by Git. These two public values are intended for browser use; never put database passwords or secret/service-role keys in `NEXT_PUBLIC_*` variables.

### 3. Link the CLI

Linking lets migration and type-generation commands find the hosted database. It is separate from configuring the app's environment variables.

```sh
bunx supabase login
bunx supabase link --project-ref riejgyofzdvrkpwbuyab
```

Enter the database password if prompted. On macOS, allow the Supabase CLI's Keychain prompt when it reads your saved login.

Verify access without creating any tables:

```sh
bunx supabase db query --linked 'select 1 as connected;'
```

### 4. Connect Vercel

With both Supabase values saved in `.env.local` and the Vercel CLI logged in, run:

```sh
bun run deploy:configure
```

This reads only the two public Supabase values from `.env.local`, verifies them against Supabase, adds or updates them in Development, Preview, and Production for `hackathon-tectonic`, then deploys to production. It stops before changing Vercel if the credential check fails. It requires Node.js 24, Bun, and network access. It never uploads the other values in `.env.local` as Vercel environment variables.

For manual setup:

In the [Vercel project settings](https://vercel.com/thomas-projects-18c8a57b/hackathon-tectonic/settings/environment-variables), add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the same values. Select **Development**, **Preview**, and **Production** for both. Using one database across environments is sufficient for this starter; use separate projects later if you need isolation.

Deploy again so Next.js picks up the values:

```sh
bunx vercel deploy --prod
```

If you add Supabase Auth later, set its **Authentication → URL Configuration → Site URL** to `https://hackathon-tectonic.vercel.app` and allow the exact local and deployed callback URLs your auth routes use. This starter does not include sign-in or callback routes.

### 5. Add schema when needed

Once the challenge is known, create migrations with `bunx supabase migration new NAME`, write SQL in the generated file, and apply it with `bun run db:push`. Run `bun run db:types` after schema changes; the Supabase client factories already use the generated `Database` type.

Enable row-level security on tables exposed through the API and add policies for the access your app needs.

### Local-only alternative

For an optional local database, install Docker and run `bunx supabase start`. Use the local URL and publishable key it reports. No Docker installation is needed to use hosted Supabase.

A local database does not consume a hosted project slot, but Vercel cannot reach a database running only on your laptop.

## Vercel

```sh
bunx vercel login
bunx vercel link
```

After configuring Supabase and applying the entries migration, deploy the app:

```sh
bunx vercel deploy --prod
```

Both `NEXT_PUBLIC_SUPABASE_*` variables must be configured in the project's Development, Preview, and Production environments.

`vercel.json` selects Next.js and a frozen Bun install; `.nvmrc` and `package.json` select Node.js 24. Link the GitHub repository in Vercel to enable deployment on pushes and preview deployments for pull requests. Public environment variables are embedded during builds, so redeploy after changing them.

Web Analytics is enabled. The Speed Insights component is mounted, but the activation API returned a plan restriction; review availability in the Vercel dashboard. If you add authentication later, configure the production site URL and required callback URLs in Supabase.

## Setup status

- Production: https://hackathon-tectonic.vercel.app
- Vercel project: https://vercel.com/thomas-projects-18c8a57b/hackathon-tectonic
- Local lint, TypeScript, production build, and live HTTP checks passed.
- Supabase project `riejgyofzdvrkpwbuyab` was verified by Emma. Local app configuration uses `.env.local`; CLI linking must be done per checkout.
- The word-list UI and entries migration are ready. Applying the hosted migration is pending access to a Supabase account that can manage Emma's project; the publishable API key cannot create tables. The word-list UI has not yet been deployed.
- The Supabase URL and publishable key are configured in Vercel Development, Preview, and Production and verified against Supabase. Run `bun run deploy:configure` when updating these values; a production rebuild is required for changes to take effect.
- Vercel could not connect the private GitHub repository. Grant the Vercel GitHub integration access to `VrolixThomas/hackathon_tectonic`, then connect it in the project's Git settings to enable automatic deployments. CLI deployment already works.
- Speed Insights activation is pending resolution of Vercel's plan restriction. No plan changes have been made.

Reference: [Supabase's Next.js setup](https://supabase.com/docs/guides/auth/server-side/nextjs), [Vercel Analytics](https://vercel.com/docs/analytics/quickstart), and [Speed Insights](https://vercel.com/docs/speed-insights/quickstart).
