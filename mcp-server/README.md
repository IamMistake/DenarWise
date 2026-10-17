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

The public home page describes the MCP server. The `/spaces` page uses WorkOS AuthKit browser sessions so signed-in users can create home spaces and join spaces by invite code. The MCP endpoint uses WorkOS-issued bearer tokens through MCP OAuth resource metadata. MCP clients should call `space_list`, choose a returned `id`, then pass it as `spaceId` to `space_list_members`, shopping tools, and todo tools.

Required local envs:

```bash
NEXTSIGNAL_DATABASE__URL=postgres://user:password@localhost:5432/home
NEXTSIGNAL_WORKOS__CLIENTID=client_your_client_id
NEXTSIGNAL_WORKOS__APIKEY=sk_test_your_api_key
NEXTSIGNAL_WORKOS__COOKIEPASSWORD=generate_at_least_32_characters
NEXTSIGNAL_WORKOS__REDIRECTURI=http://localhost:3000/callback
NEXTSIGNAL_WORKOS__AUTHKITDOMAIN=https://your-subdomain.authkit.app
NEXTSIGNAL_MCP__RESOURCEURL=http://localhost:3000/api/mcp
NEXTSIGNAL_NOTIFICATIONS__FROM__NAME=Home MCP
NEXTSIGNAL_NOTIFICATIONS__FROM__EMAIL=home@example.com
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
