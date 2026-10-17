<div align="center">
  <img src="mcp-server/public/homespace-logo.png" width="96" alt="DenarWise logo" />

  <h1>DenarWise</h1>

  <p><strong>Your shopping list, ready for any AI.</strong></p>
  <p>Shared shopping spaces for households, trips, and teams—accessible from your AI assistant through MCP.</p>

  <p>
    <a href="https://homespace.betta.chat">Open DenarWise</a> ·
    <a href="#connect-your-ai">Connect your AI</a> ·
    <a href="#local-development">Run locally</a> ·
    <a href="#next-macedonian-product-discovery">What's next</a>
  </p>
</div>

DenarWise brings the people you shop with and the AI assistant you already use onto the same list. Create a space, invite others with a code, and ask ChatGPT or Claude to add items, check what's left, or clear the list after shopping.

The web app and authenticated MCP server run together in a Next.js application. Shopping tools use the portable **MCP Apps** extension to render an interactive list inside compatible clients.

## Features

- **Shared spaces:** create separate lists for home, holidays, or work; join with an invite code and see who's in each space.
- **Conversational shopping:** add one or several items, specify quantities and stores, and retrieve lists filtered by store.
- **Interactive review:** adjust quantities, choose a space, and confirm **Add** before saving. Edit saved items and click **Update**, or select items to clear.
- **Account-based access:** WorkOS AuthKit handles browser sign-in and OAuth for MCP clients; operations are scoped to spaces you belong to.
- **Change notifications:** SMTP emails notify other space members about shopping-list updates.

<div align="center">
  <img src="mcp-server/public/images/mcp-carousel/add-shopping-items.jpg" width="260" alt="DenarWise shopping items with quantity controls inside Claude" />
  <img src="mcp-server/public/images/mcp-carousel/check-shopping-list.jpg" width="260" alt="Checking a shared DenarWise shopping list inside an AI conversation" />
</div>

## Connect your AI

1. Open [DenarWise](https://homespace.betta.chat/spaces), sign in, and create a space or join one using an invite code.
2. In a compatible ChatGPT or Claude client, add a custom MCP server using this URL:

   ```text
   https://homespace.betta.chat/api/mcp
   ```

3. Enable OAuth and sign in to authorize your account.
4. Ask your assistant to use one of your spaces:

   > In my Home space, add 2 cartons of milk and 6 bananas.
   >
   > What's on the shopping list for Vero?
   >
   > Clear the milk from our Home list.

> [!NOTE]
> The embedded shopping UI requires a client with MCP Apps support. Adding items prepares a draft; the list is saved when you click **Add** in that view.

### Available tools

Clients should call `space_list` first, choose a returned `id`, and pass it as `spaceId` to space-specific tools.

| Tool | Purpose |
| --- | --- |
| `space_list` | List spaces the signed-in user belongs to |
| `space_list_members` | List members of a selected space |
| `space_leave` | Leave a space; an empty space and its home data are deleted |
| `shopping_add_item` | Prepare one or more items for interactive review |
| `shopping_list_items` | Show the list, optionally filtered by store |
| `shopping_clear_items` | Clear items by ID, name, store, or the entire list |

The embedded UI also uses `shopping_ui_add_items`, `shopping_ui_update_items`, and `shopping_ui_clear_items`. These are app-visible tools, exposed to the UI rather than the model in compatible hosts.

## Local development

### Prerequisites

- A current Node.js LTS release and npm.
- A PostgreSQL database.
- A WorkOS application configured for AuthKit and MCP OAuth.
- SMTP credentials to deliver change notifications.

### 1. Install

```bash
git clone https://github.com/IamMistake/DenarWise.git
cd DenarWise/mcp-server
npm ci
cp .env.example .env.local
```

Run the following commands from `mcp-server/`. Next.js loads `.env.local` automatically.

### 2. Configure the environment

Populate `.env.local` with your own values:

```dotenv
NEXTSIGNAL_DATABASE__URL=postgres://user:password@localhost:5432/home
NEXTSIGNAL_DATABASE__SSL=false

NEXTSIGNAL_WORKOS__CLIENTID=client_your_client_id
NEXTSIGNAL_WORKOS__APIKEY=sk_test_your_api_key
NEXTSIGNAL_WORKOS__COOKIEPASSWORD=replace_with_a_random_value_of_at_least_32_characters
NEXTSIGNAL_WORKOS__AUTHKITDOMAIN=https://your-subdomain.authkit.app
NEXTSIGNAL_WORKOS__REDIRECTURI=http://localhost:3000/callback
NEXTSIGNAL_MCP__RESOURCEURL=http://localhost:3000/api/mcp

NEXTSIGNAL_NOTIFICATIONS__FROM__NAME=DenarWise
NEXTSIGNAL_NOTIFICATIONS__FROM__EMAIL=home@example.com
NEXTSIGNAL_EMAIL__SMTP__HOST=smtp-relay.brevo.com
NEXTSIGNAL_EMAIL__SMTP__PORT=587
NEXTSIGNAL_EMAIL__SMTP__SECURE=false
NEXTSIGNAL_EMAIL__SMTP__USER=your_smtp_user
NEXTSIGNAL_EMAIL__SMTP__PASS=your_smtp_password
```

The SSL override above is for a local database without TLS. For a hosted database, use its required SSL settings; application connections default to SSL enabled.

Generate a cookie password with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Configuration starts with [`config/default.json`](mcp-server/config/default.json), then applies `NEXTSIGNAL_` environment overrides. Double underscores represent nested keys: `NEXTSIGNAL_DATABASE__URL` maps to `database.url`.

### 3. Configure WorkOS

Use matching URLs in your WorkOS application:

| Setting | Local value |
| --- | --- |
| Redirect URI | `http://localhost:3000/callback` |
| Sign-in endpoint | `http://localhost:3000/login` |
| Sign-out redirect | `http://localhost:3000/` |
| MCP resource indicator | `http://localhost:3000/api/mcp` |

The MCP resource indicator must match `NEXTSIGNAL_MCP__RESOURCEURL`, which is used as the token audience.

To connect a hosted AI client to your local server, expose port 3000 through an HTTPS tunnel. Replace the local origin in both the environment variables and WorkOS settings with the tunnel's public origin, restart the dev server, and connect the client to that origin's `/api/mcp` endpoint. The configured callback origin is also used for browser redirects and sign-out.

### 4. Migrate and start

```bash
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>, sign in, and create a space at `/spaces`. A basic health endpoint is available at `/api/health`.

## Development commands

Run from `mcp-server/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run check` | Bundle the MCP UI and run TypeScript checks |
| `npm run build` | Bundle the MCP UI and create a production build |
| `npm start` | Run the production build |
| `npm run mcp-ui:build` | Rebuild only the embedded shopping UI resource |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run worker` | Start the separate background host; no recurring scheduler is configured yet |

The stack is **Next.js 16, React 19, TypeScript, NextSignal, PostgreSQL/Drizzle, WorkOS AuthKit, and the MCP SDK**. The application composition lives in `nextsignal/app.ts`; processes handle application flows, services own data and integrations, and adapters wire infrastructure behavior.

```text
docs/                      Upcoming feature specifications
mcp-server/
  app/                     Pages, auth callbacks, and HTTP routes
  nextsignal/
    mcp/                   Tool registration and embedded shopping UI
    processes/             API and business processes
    services/              Database, shopping, spaces, email, and other services
    adapters/              Auth, logging, and scheduler wiring
    db/                    Drizzle schema
  config/                  Default application configuration
  drizzle/                 Database migrations
  worker/                  Background runtime entry point
```

## Deployment

For Vercel, set the project root directory to **`mcp-server`**, use the Next.js framework preset, and run `npm run build` as the build command.

- Set the same environment variables in Vercel, plus `NEXTSIGNAL_APP__ENVIRONMENT=production`.
- Use your public HTTPS origin for the WorkOS callback and MCP resource URL, and update the corresponding WorkOS settings.
- Apply database migrations against the deployment database as a release step; the build script does not run them.
- The landing page displays `https://homespace.betta.chat/api/mcp`; update that displayed URL in `app/page.tsx` when deploying under another domain.

[`vercel.json`](mcp-server/vercel.json) schedules `/api/maintenance/logs/prune` daily at 03:00 UTC. Log retention defaults to three days. To authenticate Vercel's scheduled request, set `CRON_SECRET` and `NEXTSIGNAL_MAINTENANCE__CRONSECRET` to the same value.

## Next: Macedonian product discovery

The next feature connects shopping-list entry with Macedonian store products and prices through NajdiCena:

1. Interpret a query such as `млеко 3,2% битолско плаво`, including Latin-script input, while preserving brand and variant preferences.
2. Search NajdiCena broadly, then match candidates against the original request using an open-weight model through Vercel AI Gateway.
3. Combine relevant matches with the user's purchase history and let the user choose the exact product to add.
4. On “going to the market, prepare the list,” refresh exact-product offers and show products grouped by store, with complete basket totals and clearly labeled partial subtotals.

This work is planned in the [feature overview](docs/README.md) and [implementation roadmap](docs/implementation-roadmap.md). The [NajdiCena integration notes](docs/najdicena-integration.md) record the observed API and the details that still need verification.
