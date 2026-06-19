# Relay

Relay turns agent outputs into secure, shareable experiences for humans and teams.

The app is split into a conventional API + web setup:

- `apps/api` — Hono, Drizzle, SQLite, uploaded HTML storage, magic-link auth
- `apps/web` — React, Vite, Tailwind dashboard and publishing UI
- `packages/cli` — lightweight `relay publish` command
- `demo` — sample HTML experiences

## Run locally

API:

```bash
cd apps/api
cp .env.example .env
npm install
npm run seed:demo
npm run dev
```

Web:

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The web app calls `VITE_API_URL`, which defaults to `http://localhost:3847`.

## Flow

1. Home -> Get started -> magic link
2. Dashboard -> your published experiences
3. New experience -> upload -> preview -> visibility -> publish
4. Share `/a/:slug` links hosted by the API

## Environment

API essentials:

```bash
API_URL=http://localhost:3847
WEB_URL=http://localhost:5173
DATABASE_URL=./data/relay.db
STORAGE_DIR=./storage
SESSION_SECRET=change-me-in-production
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM="Relay <noreply@tether-labs.com>"
```

When web and API are on different production origins, API cookies use `SameSite=None; Secure`. Set `COOKIE_DOMAIN` only when both origins share a parent domain.

## Demos

```bash
npm run seed:demo --prefix apps/api
npm run publish -- demo/month-end-financial-report.html
```

## Production

- Deploy `apps/api` to Fly.
- Deploy `apps/web` to Vercel with `VITE_API_URL` set to the Fly API URL.
- Set API `WEB_URL` to the Vercel/custom web URL.
- Set `CORS_ORIGINS` for any additional web origins.

## Follow-ups

- Clerk organizations for team sharing.
- MCP server / skill for publishing directly from agents.
