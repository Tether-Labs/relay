# Relay

Relay turns agent outputs into secure, shareable artifacts for humans and teams — with access control, view analytics, and public profiles.

## Monorepo layout

| Path | Stack | Role |
|------|-------|------|
| `apps/api` | Hono, Drizzle, SQLite, Clerk | REST API, artifact storage, `/a/:slug` viewer, analytics |
| `apps/web` | React, Vite, Tailwind, Clerk, shadcn/ui | Dashboard, publish flow, public profiles, landing page |
| `packages/cli` | Node | `relay publish` for agents and scripts |
| `packages/mcp` | MCP, Node | Local stdio MCP server for publishing from Cursor/Claude-style agents |
| `demo` | HTML | Sample artifacts for local seeding |

## Run locally

Run everything from the **repo root**. You need both the API and the web app running.

```bash
npm install

cp apps/web/.env.local.example apps/web/.env.local
cp apps/web/.env.production.example apps/web/.env.production
cp apps/api/.env.local.example apps/api/.env.local
cp apps/api/.env.production.example apps/api/.env.production
```

Paste Clerk keys into those files (`pk_test_` / `sk_test_` in `.env.local`, `pk_live_` / `sk_live_` in `.env.production`). If you still have old plain `.env` files, move their contents into `.env.local` and delete `.env`.

Then:

```bash
npm run dev          # API + web together → localhost:3847 & localhost:5173
npm run dev:api      # API only
npm run dev:web      # web only
npm run seed:demo    # optional demo artifacts
npm run test         # API tests
npm run build        # build web for production
npm run publish -- demo/month-end-financial-report.html
npm run mcp          # local stdio MCP server
```

Migrations run automatically when the API starts.

## Clerk setup

Sign-in uses [Clerk](https://clerk.com). Create an application and copy keys into both apps:

**Web** (`apps/web/.env`):

```bash
VITE_API_URL=http://localhost:3847
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**API** (`apps/api/.env`):

```bash
CLERK_SECRET_KEY=sk_test_...
```

In the Clerk dashboard, set allowed redirect URLs for local dev:

- `http://localhost:5173/login`
- `http://localhost:5173/sign-up`

### Auth bridge

The web app signs in with Clerk, then POSTs to `/auth/sync` to mint an HTTP-only API session cookie. That cookie is required when viewing restricted artifacts at `/a/:slug` on the API origin. API routes accept either:

- `Authorization: Bearer <Clerk JWT>` (web app), or
- `Authorization: Bearer <relay_pat_...>` (CLI, MCP, and other agents), or
- `relay_session` cookie (artifact viewer after sync)

User IDs in SQLite match Clerk user IDs (`user_...`).

## User flow

1. **Home** — hero + publish methods panel (Web / CLI / MCP / Skills) and a marquee of public artifacts
2. **Sign up / sign in** — Clerk modal or dedicated `/login`, `/sign-up` pages
3. **Dashboard** (`/dashboard`) — paginated grid of owned artifacts with view counts, copy/open actions, link to public profile
4. **Publish** (`/publish`) — upload → preview → visibility → publish (HTML or zip)
5. **Artifact detail** (`/artifacts/:slug`) — edit title/visibility, invite viewers, analytics chart, CSV export
6. **Public profile** (`/user/:handle`) — public artifacts for a user; handle derived from email local-part (e.g. `alice@co.com` → `@alice`)
7. **View artifact** — share `/a/:slug` links served by the API

## Publishing

### Web

Signed-in users can drag-and-drop on the home page or use **New artifact** on the dashboard.

### CLI

```bash
# After signing in via the web app, create an agent token in the dashboard:
export RELAY_TOKEN=relay_pat_...
# Or save it to ~/.relay/session

npm run publish -- path/to/report.html

# Optional env overrides
RELAY_API_URL=http://localhost:3847
RELAY_TITLE="My Report"
RELAY_VISIBILITY=public   # public | private | restricted
```

### MCP

Run the local stdio MCP server from the repo:

```bash
export RELAY_API_URL=https://relay-tether-labs.fly.dev
export RELAY_TOKEN=relay_pat_... # Or save it to ~/.relay/session
npm run mcp
```

Example Cursor MCP config:

```json
{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["-y", "@tether-labs.com/relay-mcp"],
      "env": {
        "RELAY_API_URL": "https://relay-tether-labs.fly.dev",
        "RELAY_TOKEN": "relay_pat_..."
      }
    }
  }
}
```

The server exposes `publish_artifact`, which accepts a local `filePath` (`.html`, `.htm`, `.md`, or `.zip`), raw `html`, raw `markdown`, plus optional `title`, `fileName`, and `visibility`.

### Skills

Documented on the home page publish panel:

```bash
npx skills@latest add relay/skills
```

## Implementation

### API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/sync` | Clerk JWT | Bridge to API session cookie |
| `GET` | `/auth/me` | Session | Current user |
| `POST` | `/auth/logout` | — | Clear session |
| `GET` | `/api/artifacts` | Session | List owned + shared artifacts |
| `POST` | `/api/artifacts` | Session | Upload and publish |
| `GET/PATCH` | `/api/artifacts/:slug` | Session | Get / update artifact |
| `GET` | `/api/artifacts/:slug/analytics` | Session | View analytics |
| `GET` | `/api/artifacts/:slug/analytics/export` | Session | CSV export |
| `GET/POST/DELETE` | `/api/artifacts/:slug/access` | Session | Invite list / invite / revoke |
| `GET` | `/api/leaderboard?period=week` | — | Top public artifacts by views |
| `GET` | `/api/users/:handle/artifacts` | — | Public profile + artifacts |
| `GET` | `/a/:slug` | Session if restricted | Serve artifact HTML |

### Visibility

- **Public** — anyone with the link
- **Private** — owner only
- **Restricted** — owner + invited emails (invite emails sent via Resend when configured)

### Analytics

Each artifact view records a hashed viewer ID (and email when authenticated). The dashboard shows total/unique counts per card. The artifact detail page includes a views-over-time chart, recent viewers, invite open rates, and CSV export.

### Web UI

- **Design** — warm cream/paper palette, Outfit headings, IBM Plex Sans body, shadcn/ui components
- **Home** — `PublishMethodPanel` (tabbed Web/CLI/MCP/Skills), `ArtifactShowcase` marquee
- **Dashboard** — paginated `ArtifactGridCard` grid, `@handle` public profile link, inline count badges
- **Profiles** — paginated public artifact grid at `/user/:handle`
- **Header** — hides Dashboard/New links when already on `/dashboard`; no page-level back buttons on publish or artifact detail

### Data

SQLite (`DATABASE_URL`) stores users, sessions, artifacts, access grants, and view events. Uploaded files live under `STORAGE_DIR` (HTML or extracted zip bundles).

## Environment

Relay uses **gitignored env files** — never commit real keys.

| File | Purpose |
|------|---------|
| `apps/web/.env.local` | Local dev (`npm run dev`) — `pk_test_...` |
| `apps/web/.env.production` | Production web — `pk_live_...`; used by `npm run deploy:web` |
| `apps/api/.env.local` | Local API — `sk_test_...` |
| `apps/api/.env.production` | Production API — `sk_live_...`; used by `npm run sync:fly-secrets` |

Copy from the matching `*.example` templates in each app directory.

### Web (Vite)

**`.env.local`** — local dev:

```bash
VITE_API_URL=http://localhost:3847
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**`.env.production`** — deploy source of truth:

```bash
VITE_API_URL=https://relay-tether-labs.fly.dev
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

Deploy web from `.env.production`:

```bash
npm run deploy:web
```

Vite loads `.env.production` automatically for `npm run build`. Local `.env*` files are excluded from Vercel uploads (`.vercelignore`).

### API (Fly)

**`.env.local`** — local dev (see `apps/api/.env.local.example`).

**`.env.production`** — sync secrets to Fly, then deploy:

```bash
npm run sync:fly-secrets   # reads apps/api/.env.production → flyctl secrets set
npm run deploy:api         # sync secrets + flyctl deploy
```

On Fly, env comes from **secrets**, not files. `.env.production` is your local copy of what should be on Fly.

When web and API are on different production origins, API cookies use `SameSite=None; Secure`. Set `COOKIE_DOMAIN` only when both origins share a parent domain.

## Production

- Deploy **`apps/web`** from `apps/web/.env.production`: `npm run deploy:web` (Vercel)
- Deploy **`apps/api`** from `apps/api/.env.production`: `npm run deploy:api` (Fly secrets + deploy)
- In Clerk, add production redirect URLs for `https://relay.tether-labs.com`

Example Fly first deploy:

```bash
cd apps/api
flyctl apps create relay-tether-labs
flyctl volumes create relay_data --region sjc --size 1
flyctl secrets set \
  SESSION_SECRET=... \
  CLERK_SECRET_KEY=... \
  API_URL=https://relay-tether-labs.fly.dev \
  WEB_URL=https://your-web-url.vercel.app
flyctl deploy
```

## Demos

```bash
npm run seed:demo
npm run publish -- demo/month-end-financial-report.html
```
