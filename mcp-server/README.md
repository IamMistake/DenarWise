# mcp-server

Generated with the NextSignal basic Next.js scaffold.

## Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environments

Configuration starts with `config/default.json`, then overlays env vars with the `NEXTSIGNAL_` prefix from `nextsignal/config.ts`.

For local development, copy `.env.example` to `.env.local`. Next.js loads `.env.local` automatically.

For production on Vercel, set the same `NEXTSIGNAL_` variables in Vercel Project Settings for the Production environment, including `NEXTSIGNAL_APP__ENVIRONMENT=production`. The deploy runs `pnpm build`, so it uses Vercel's production environment variables rather than a local env file.

Use double underscores for nested config paths, for example `NEXTSIGNAL_DATABASE__URL` maps to `database.url`.

### WorkOS AuthKit

The public home page describes the MCP server. The `/spaces` page uses WorkOS AuthKit browser sessions so signed-in users can create spaces and join spaces by invite code. The MCP endpoint uses WorkOS-issued bearer tokens through MCP OAuth resource metadata. MCP clients should call `space_list`, choose a returned `id`, then pass it as `spaceId` to `space_list_members`, shopping tools, and todo tools.

Required local envs:

```bash
NEXTSIGNAL_DATABASE__URL=postgres://user:password@localhost:5432/denarwise
NEXTSIGNAL_WORKOS__CLIENTID=client_your_client_id
NEXTSIGNAL_WORKOS__APIKEY=sk_test_your_api_key
NEXTSIGNAL_WORKOS__COOKIEPASSWORD=generate_at_least_32_characters
NEXTSIGNAL_WORKOS__REDIRECTURI=http://localhost:3000/callback
NEXTSIGNAL_WORKOS__AUTHKITDOMAIN=https://your-subdomain.authkit.app
NEXTSIGNAL_MCP__RESOURCEURL=http://localhost:3000/api/mcp
NEXTSIGNAL_NOTIFICATIONS__FROM__NAME=DenarWise
NEXTSIGNAL_NOTIFICATIONS__FROM__EMAIL=denarwise@example.com
NEXTSIGNAL_EMAIL__SMTP__HOST=smtp-relay.brevo.com
NEXTSIGNAL_EMAIL__SMTP__PORT=587
NEXTSIGNAL_EMAIL__SMTP__SECURE=false
NEXTSIGNAL_EMAIL__SMTP__USER=your_smtp_user
NEXTSIGNAL_EMAIL__SMTP__PASS=your_smtp_password
```

For production, use your public HTTPS origin for both `NEXTSIGNAL_MCP__RESOURCEURL` and `NEXTSIGNAL_WORKOS__REDIRECTURI`.

When developing through a tunnel such as ngrok, set `NEXTSIGNAL_WORKOS__REDIRECTURI`
to the tunnel callback URL, for example `https://your-ngrok-domain.ngrok-free.dev/callback`.
The app uses this value as the canonical public origin for AuthKit redirects and sign-out.

### Interactive shopping UI

The shopping tools use the portable MCP Apps extension, so the same embedded UI can render in ChatGPT and Claude:

- `shopping_add_item` prepares a read-only draft and renders it with quantity steppers, a shared space picker, and a store field for each item. Nothing is persisted until the user clicks **Add**.
- `shopping_list_items` renders a selectable list with a button to clear the selected items.
- `shopping_ui_add_items`, `shopping_ui_update_items`, and `shopping_ui_clear_items` are marked with MCP Apps `visibility: ["app"]`, so compatible hosts expose them to the embedded UI but not to the model. Once added, edits remain local until the user clicks **Update**.

The UI source is `nextsignal/mcp/ui/shopping-app.tsx`. `npm run dev`, `npm run build`, and `npm run check` bundle it into a self-contained HTML resource automatically. Run `npm run mcp-ui:build` directly when you only want to regenerate that resource.

For your current ngrok shape, use:

```bash
NEXTSIGNAL_MCP__RESOURCEURL=https://subocean-olevia-securely.ngrok-free.dev/api/mcp
NEXTSIGNAL_WORKOS__REDIRECTURI=https://subocean-olevia-securely.ngrok-free.dev/callback
```

In WorkOS, configure the same public URLs:

- Redirect URI: `https://subocean-olevia-securely.ngrok-free.dev/callback`
- Sign-in endpoint: `https://subocean-olevia-securely.ngrok-free.dev/login`
- Sign-out redirect: `https://subocean-olevia-securely.ngrok-free.dev/`
- MCP resource indicator: `https://subocean-olevia-securely.ngrok-free.dev/api/mcp`

If ngrok gives you a new domain, update both the `NEXTSIGNAL_` env values and the WorkOS dashboard URLs.

### Spaces

Run migrations after pulling this version:

```bash
pnpm db:migrate
```

The previous static `family.members` config is gone. Users are saved in `home_users` the first time an authenticated process sees their WorkOS user id. Spaces live in `home_spaces`, memberships live in `home_space_members`, and shopping/todo rows are scoped by `space_id`. Emails are sent to the other members of the requested space. All joined spaces are available; MCP tools require an explicit `spaceId`.

## Worker

This starter does not configure a recurring scheduler yet, but the worker entry is present so you know where production background runtime code belongs.

```bash
pnpm worker
```

## Shape

- `nextsignal/app.ts` is the composition root.
- `nextsignal/processes` contains API and business processes.
- `nextsignal/adapters` contains auth, logger, scheduler, and validation wiring.
- `nextsignal/services` is the app-owned service/data-access boundary.
- `config/default.json` and `.env.example` show configuration conventions.

## DenarWise catalog matching

Shopping review matches user queries against NajdiCena, then displays canonical products and clearly labeled alternatives. The user still confirms before anything is added. Saved products keep their identity while their recommended offer can change. An entered supermarket is a strict restriction. Quantities count retail packages; manual and legacy items remain supported without catalog prices.

All inference uses **Vercel AI Gateway only**, with exactly two server-side model identifiers:

- `typesafe-ai/jev-1.14.0` for relevance and identity verification.
- `alibaba/qwen3-next-80b-a3b-instruct` for grounded structured attributes and grouping proposals.

There are no local models or other-model fallbacks.

### Configure production and local development

Use Node.js 22 or newer. Create a team-scoped key in **Vercel Dashboard → AI Gateway → API Keys** and make sure the team can access both models and has Gateway credits.

For production, add `AI_GATEWAY_API_KEY` in **Project Settings → Environment Variables**, select Production and any required Preview environments, then redeploy. The implementation explicitly uses this key for the same authentication behavior locally and on Vercel.

For local development, add this server-only variable to `mcp-server/.env.local` alongside your existing database and WorkOS settings:

```dotenv
AI_GATEWAY_API_KEY=your_gateway_api_key
```

Do not use a `NEXT_PUBLIC_` prefix or commit the key. Next.js loads `.env.local` automatically; restart the development server after changing it. No separate Jev or Qwen provider keys are required. `.env.example` is intentionally unchanged.

After deploying, reconnect your MCP client so it refreshes the tool schemas and bundled widget.

Install dependencies, apply the catalog migration to your configured database, and start:

```bash
cd mcp-server
npm install
npm run db:migrate
npm run dev
```

The catalog migration adds products, offers, caches, confirmation records, and nullable product references on existing shopping rows. Existing rows remain manual items; no AI backfill runs. Migrations were checked against an isolated PostgreSQL-compatible test database; `db:migrate` must also be run for your local and production databases.

Verify a review request with `Mleko 3.2% bitolsko plavo` and `Zhito luks proteinski leb 500g`. Check product choices and warnings, explicitly select any alternatives, confirm, then list the saved items. In Vercel AI Gateway logs, confirm that requests use only the two identifiers above. Missing authentication or failed upstream calls produce retry/manual states and server diagnostics.

Official setup: https://vercel.com/docs/ai-gateway/getting-started

### Module boundaries and diagnostics

`nextsignal/integrations/najdicena` owns source HTTP behavior; `nextsignal/integrations/ai-gateway` owns model calls. `nextsignal/catalog` owns normalization, matching, persistence, retrieval, and recommendations in separate modules. MCP registrations and response handlers are separate from those services. The widget has separate review, checklist, controls, price, and style modules.

The MCP protocol wrapper logs every call, including SDK validation failures. Process wrappers log authorization, validation, execution, returned faults, and thrown failures. Integration and persistence stages log attempts, outcomes, durations, and safe identifiers with a shared correlation ID. Logs use the existing database sink, with a sanitized structured-console fallback if persistence fails. API keys, authorization headers, prompts, and unrestricted payloads are redacted. Catalog cache records expire on read and are pruned by the existing maintenance process.

Matching uses bounded search and concurrency: 20 items per batch, pages of 200 capped at three pages per search, six catalog requests, four model requests, 80 candidate names, eight displayed choices, and a 25-second matching cancellation deadline. Thresholds and limits are centralized in `nextsignal/catalog/policy.ts`. Cached matches and offers expire after 15 minutes; product extraction and identity decisions are versioned separately.

Prices are **cheapest found**, not a guarantee of exhaustive market coverage or live inventory. The widget preserves source branch names, source timestamps, promotion conditions, incomplete-search warnings, and stale snapshots. Fresh observations take precedence over obsolete low prices. Offer mappings retain their initial identity evidence and matching version independently of expiring decision caches. Universal products are grouped conservatively; uncertain duplicates may remain separate.

### Verification and benchmarking

```bash
npm test
npm run check
npm run build
npm run benchmark:matching
npm run preview:shopping
```

Tests include source response validation, pagination, cancellation, product grouping, alternatives, strict stores, caching, stale refreshes, confirmation idempotency, space-scoped persistence, protocol/process logging, redaction, logger fallback, model allowlisting, and widget rendering. Database tests use PGlite; its single-session advisory-lock substitute does not validate real PostgreSQL concurrency. Confirm simultaneous retries against PostgreSQL before a production rollout.

The local widget preview serves a fixture MCP host at http://127.0.0.1:4318 and exercises the actual bundled widget without database or model calls. Its fixture prices are illustrative.

The benchmark uses your configured database and Gateway key and makes paid calls to the approved models. It reports first-pass and cached five-item timings and match counts. First-pass results may already benefit from durable caches. The goals are 10 seconds for a cold five-item review and two seconds cached; no live model performance or Macedonian matching accuracy is claimed without running the benchmark and evaluating labeled examples. Host-specific ChatGPT/Claude widget checks require an authenticated connected host.
