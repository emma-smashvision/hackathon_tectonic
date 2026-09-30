# Tectonic

A minimal hackathon starter with a shared word list for verifying Supabase. Add a word, reload the page to check persistence, and remove it when done. The list has no seed data.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Motion, Supabase PostgreSQL, Inter and Geist Mono, Bun, and Biome. This is a single app, so Turborepo is not needed. It builds as a fully static site (`output: "export"`) and deploys to DigitalOcean App Platform.

## Local development

Use Node.js 24 (`nvm use`) and Bun 1.3.9.

```sh
bun install --frozen-lockfile
cp -n .env.example .env.local
bun dev
```

Open http://localhost:3000. The word list needs the Supabase URL and publishable key in `.env.local`, plus the database migration below. Without the connection, the page displays a list-loading error.

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
| `bun run lint:fix` | Apply safe lint and formatting fixes |
| `bun run format` | Format source files |
| `bun run build` | Export the static site to `out/` |
| `bun start` | Serve `out/` locally |
| `bun run db:types` | Generate types from the linked Supabase database |
| `bun run db:push` | Apply migrations to the linked database |

CI runs lint, type checks, and a production build on pull requests and pushes to `main`.

## Start building

- `src/app/page.tsx`: welcome homepage.
- `src/app/word-list.tsx`: shared word list, with loading, validation, add/remove, and error states.
- `src/app/layout.tsx`: metadata and fonts.
- `src/app/globals.css`: Tailwind and base styles; `font-sans` uses Inter and `font-mono` uses Geist Mono.
- `src/lib/supabase/client.ts`: Supabase client for Client Components.
- `supabase/config.toml`: local Supabase configuration, without seed data.

For animations, import from `motion/react` in a `"use client"` component, or `motion/react-client` in a Server Component.

## Supabase (connected)

The hosted project **SmashVision x SuperiorSwarm** (`riejgyofzdvrkpwbuyab`, eu-central-1) is set up. The browser client uses `src/lib/supabase/database.types.ts`. The entries table is defined by the migration above. CLI linking is local to each checkout and is not included in Git.

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

### 4. Configure DigitalOcean

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the App Platform component with **Build Time** scope (see [Deployment](#deployment-digitalocean)). Next.js embeds them in the static files, so redeploy after changing them.

If you add Supabase Auth later, set its **Authentication → URL Configuration → Site URL** to the DigitalOcean app URL and allow the exact callback URLs your auth routes use. This starter does not include sign-in or callback routes.

### 5. Add schema when needed

Once the challenge is known, create migrations with `bunx supabase migration new NAME`, write SQL in the generated file, and apply it with `bun run db:push`. Run `bun run db:types` after schema changes; the Supabase client factories already use the generated `Database` type.

Enable row-level security on tables exposed through the API and add policies for the access your app needs.

### Local-only alternative

For an optional local database, install Docker and run `bunx supabase start`. Use the local URL and publishable key it reports. No Docker installation is needed to use hosted Supabase.

A local database does not consume a hosted project slot, but the deployed site cannot reach a database running only on your laptop.

## Deployment (DigitalOcean)

The app is exported as static files, so it runs as an App Platform **Static Site** with no server. Proxy/middleware, Server Actions, Route Handlers, and server-side Supabase clients are unavailable; talk to Supabase from Client Components, protected by row-level security.

Create an app from the GitHub repository and set the component to:

| Setting | Value |
| --- | --- |
| Resource type | Static Site |
| Source directory | `/` |
| Build command | `npm install -g bun@1.3.9 && bun install --frozen-lockfile && bun run build` |
| Output directory | `out` |
| Catch-all document | `404.html` |
| Environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Build Time) |

`.nvmrc` and `package.json` select Node.js 24. Enable autodeploy to rebuild on pushes to the selected branch.

## Setup status

- Supabase project `riejgyofzdvrkpwbuyab` was verified by Emma. Local app configuration uses `.env.local`; CLI linking must be done per checkout.
- The word-list UI and entries migration are ready. Applying the hosted migration is pending access to a Supabase account that can manage Emma's project; the publishable API key cannot create tables.
- The static export builds and serves locally. The DigitalOcean app has not been created yet.

Reference: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) and [App Platform static sites](https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/).
