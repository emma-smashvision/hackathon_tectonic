# Tectonic

A minimal hackathon starter. The homepage displays “Welcome to SmashVision x SuperiorSwarm!”; there are no product features, database tables, or seed data.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Motion, Supabase PostgreSQL, Vercel Analytics and Speed Insights, Inter and Geist Mono, Bun, and Biome. This is a single app, so Turborepo is not needed.

## Local development

Use Node.js 24 (`nvm use`) and Bun 1.3.9.

```sh
bun install --frozen-lockfile
cp -n .env.example .env.local
bun dev
```

Open http://localhost:3000. The app works without environment variables; Supabase helpers need the URL and publishable key in `.env.local`.

| Command | Purpose |
| --- | --- |
| `bun dev` | Start development server |
| `bun run check` | Run Biome and TypeScript |
| `bun run lint:fix` | Apply safe lint and formatting fixes |
| `bun run format` | Format source files |
| `bun run build` | Create production build |
| `bun start` | Serve production build |
| `bun run db:types` | Generate types from the linked Supabase database |
| `bun run db:push` | Apply migrations to the linked database |

CI runs lint, type checks, and a production build on pull requests and pushes to `main`.

## Start building

- `src/app/page.tsx`: welcome homepage.
- `src/app/layout.tsx`: metadata, fonts, and analytics.
- `src/app/globals.css`: Tailwind and base styles; `font-sans` uses Inter and `font-mono` uses Geist Mono.
- `src/lib/supabase/client.ts`: Supabase client for Client Components.
- `src/lib/supabase/server.ts`: Supabase client for Server Components, Server Actions, and Route Handlers.
- `src/proxy.ts`: refreshes Supabase session cookies once environment variables are configured. It does not restrict routes or implement sign-in.
- `supabase/config.toml`: local Supabase configuration, without seed data.

For animations, import from `motion/react` in a `"use client"` component, or `motion/react-client` in a Server Component.

## Supabase (optional, not connected)

Hosted Supabase setup is deferred because the account has no free project slots. The app runs and deploys without it. Client helpers and local configuration are included for when a database is needed.

### 1. Create a project

In the [Supabase dashboard](https://supabase.com/dashboard), create a project in the `hackathon-tectonic` organization when a slot becomes available. Choose a nearby region (Frankfurt is suitable), save the database password in your password manager, and wait until the project is ready. No tables are required for this starter.

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
bunx supabase link --project-ref YOUR_PROJECT_REF
```

Enter the database password if prompted. On macOS, allow the Supabase CLI's Keychain prompt when it reads your saved login.

Verify access without creating any tables:

```sh
bunx supabase db query --linked 'select 1 as connected;'
```

### 4. Connect Vercel

In the [Vercel project settings](https://vercel.com/thomas-projects-18c8a57b/hackathon-tectonic/settings/environment-variables), add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the same values. Select **Development**, **Preview**, and **Production** for both. Using one database across environments is sufficient for this starter; use separate projects later if you need isolation.

Deploy again so Next.js picks up the values:

```sh
bunx vercel deploy --prod
```

If you add Supabase Auth later, set its **Authentication → URL Configuration → Site URL** to `https://hackathon-tectonic.vercel.app` and allow the exact local and deployed callback URLs your auth routes use. This starter does not include sign-in or callback routes.

### 5. Add schema when needed

Once the challenge is known, create migrations with `bunx supabase migration new NAME`, write SQL in the generated file, and apply it with `bun run db:push`. Run `bun run db:types` and pass the generated `Database` type to the Supabase client factories when adding typed queries.

Enable row-level security on tables exposed through the API and add policies for the access your app needs.

### Local-only alternative

For an optional local database, install Docker and run `bunx supabase start`. Use the local URL and publishable key it reports. No Docker installation is needed to use hosted Supabase.

A local database does not consume a hosted project slot, but Vercel cannot reach a database running only on your laptop.

## Vercel

```sh
bunx vercel login
bunx vercel link
```

Deploy the app without any Supabase environment variables:

```sh
bunx vercel deploy --prod
```

When connecting Supabase later, add both `NEXT_PUBLIC_SUPABASE_*` variables to the project's Development, Preview, and Production environments and redeploy.

`vercel.json` selects Next.js and a frozen Bun install; `.nvmrc` and `package.json` select Node.js 24. Link the GitHub repository in Vercel to enable deployment on pushes and preview deployments for pull requests. Public environment variables are embedded during builds, so redeploy after changing them.

Web Analytics is enabled. The Speed Insights component is mounted, but the activation API returned a plan restriction; review availability in the Vercel dashboard. If you add authentication later, configure the production site URL and required callback URLs in Supabase.

## Setup status

- Production: https://hackathon-tectonic.vercel.app
- Vercel project: https://vercel.com/thomas-projects-18c8a57b/hackathon-tectonic
- Local lint, TypeScript, production build, and live HTTP checks passed.
- Supabase is intentionally unconnected. Its helpers and local configuration are ready for later; no hosted database or seed data has been created.
- Vercel could not connect the private GitHub repository. Grant the Vercel GitHub integration access to `VrolixThomas/hackathon_tectonic`, then connect it in the project's Git settings to enable automatic deployments. CLI deployment already works.
- Speed Insights activation is pending resolution of Vercel's plan restriction. No plan changes have been made.

Reference: [Supabase's Next.js setup](https://supabase.com/docs/guides/auth/server-side/nextjs), [Vercel Analytics](https://vercel.com/docs/analytics/quickstart), and [Speed Insights](https://vercel.com/docs/speed-insights/quickstart).
