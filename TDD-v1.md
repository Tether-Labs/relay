# Technical Design Document: Relay V1

> **One sentence:** Publish AI-generated HTML artifacts, share via secure links, track who viewed them.
>
> Not HTML hosting. **Google Docs for AI artifacts** — sharing is the product; governance is the monetization.

---

## 1. V1 Scope (Locked — weekend ship)

| In | Out (V2+) |
|----|-----------|
| Magic-link auth (email, no passwords) | SSO, RBAC, audit trails |
| Upload HTML (+ bundled CSS/JS via zip) | Dashboards, simulations, agent workflows |
| Hosted viewer at `/a/:slug` | Custom domains, white-label |
| Permissions: public / private / restricted | Team workspaces, shared ownership |
| Share dialog + email invites (magic link) | Version history, approval workflows |
| Basic analytics (views, unique viewers, last viewed) | Advanced analytics, top viewers by name |
| CLI: `artifact publish report.html` | Billing, Pro/Team tiers |
| Viral footer: "Powered by Relay" | Custom branding |

---

## 2. Architecture

```
Creator (browser or CLI)
  │
  ├── POST /auth/magic-link ──► email with verify URL
  ├── POST /api/artifacts ────► store files + DB row ──► slug
  └── GET  /dashboard ────────► list + analytics

Viewer
  │
  └── GET /a/:slug ──► permission check ──► record view ──► serve HTML + footer
```

Single Node process (Hono). SQLite for weekend prototype (swap to Postgres before scale). Files on disk under `storage/{slug}/`.

---

## 3. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | Node.js 20+ | Same as `eng/`, fast iteration |
| **API** | [Hono](https://hono.dev) | Lightweight, TypeScript-native |
| **Validation** | Zod + `@hono/zod-validator` | Request parsing |
| **Database** | SQLite via `better-sqlite3` | Zero infra for weekend demo; Drizzle migrates to Postgres later |
| **ORM** | Drizzle | Matches `eng/` patterns |
| **IDs** | nanoid (8-char slug) | Short share URLs: `artifact.so/a/xyz123` |
| **Auth** | Magic link + httpOnly session cookie | Lowest friction |
| **Email** | Console (dev) / Resend (prod) | Dev logs link; prod sends real email |
| **Upload** | Multipart + `adm-zip` for bundles | HTML or zip |
| **UI** | Server-rendered HTML (Hono templates) | No React build step for V1 |
| **CLI** | `tsx cli/publish.ts` | Claude Code / Cursor users |
| **Testing** | Vitest | Smoke tests on auth + permissions |

---

## 4. Project Structure

```
artifact/
├── TDD-v1.md
├── README.md
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── cli/
│   └── publish.ts              # artifact publish report.html
├── demo/
│   └── ai-research-report.html # Product Hunt demo artifact
├── drizzle/                    # Generated migrations
├── storage/                    # Uploaded artifact files (gitignored)
├── src/
│   ├── index.ts                # Hono app entry
│   ├── config.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── migrate.ts
│   ├── lib/
│   │   ├── id.ts
│   │   ├── storage.ts          # Write/read artifact files
│   │   ├── email.ts            # Magic link delivery
│   │   └── permissions.ts      # Access checks
│   ├── middleware/
│   │   └── session.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── artifacts.ts        # REST API
│   │   ├── view.ts             # GET /a/:slug
│   │   └── pages.ts            # Dashboard HTML
│   └── views/
│       └── templates.ts        # HTML strings
└── test/
    └── permissions.test.ts
```

---

## 5. Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| email | text UNIQUE | lowercased |
| created_at | integer | unix ms |

### magic_tokens
| Column | Type | Notes |
|--------|------|-------|
| token | text PK | nanoid 32 |
| user_id | text FK | |
| expires_at | integer | 15 min TTL |

### sessions
| Column | Type | Notes |
|--------|------|-------|
| token | text PK | nanoid 32 |
| user_id | text FK | |
| expires_at | integer | 30 day TTL |

### artifacts
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | internal id |
| slug | text UNIQUE | public URL segment (8 chars) |
| owner_id | text FK | |
| title | text | |
| visibility | text | `public` \| `private` \| `restricted` |
| entry_file | text | e.g. `index.html` |
| created_at | integer | |

### artifact_access
| Column | Type | Notes |
|--------|------|-------|
| artifact_id | text FK | |
| email | text | allowed viewer (restricted mode) |
| invited_at | integer | |

### artifact_views
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| artifact_id | text FK | |
| viewer_hash | text | sha256(email) or anon fingerprint |
| viewer_email | text nullable | if authenticated |
| viewed_at | integer | |

---

## 6. API Surface

### Auth
```
POST /auth/magic-link     { email }           → { ok: true }
GET  /auth/verify?token=  → set cookie, redirect /dashboard
POST /auth/logout         → clear cookie
GET  /auth/me             → { email } | 401
```

### Artifacts (session required)
```
GET    /api/artifacts                    → list owned + shared-with-me
POST   /api/artifacts                    → multipart: file | zip, title, visibility
GET    /api/artifacts/:slug                → metadata
PATCH  /api/artifacts/:slug                → { visibility, title }
DELETE /api/artifacts/:slug                → soft delete (V1: hard delete)
GET    /api/artifacts/:slug/analytics      → { totalViews, uniqueViewers, lastViewedAt }
POST   /api/artifacts/:slug/invite         → { emails[] } send magic links
```

### Viewer (public)
```
GET /a/:slug              → HTML artifact + viral footer
GET /a/:slug/*            → static assets (css, js, images)
```

---

## 7. Permission Logic

```typescript
function canView(artifact, session, viewerEmail): boolean {
  if (artifact.visibility === 'public') return true;
  if (!session && artifact.visibility === 'private') return false;
  if (artifact.visibility === 'private') return session.userId === artifact.ownerId;
  // restricted
  if (session?.userId === artifact.ownerId) return true;
  if (!viewerEmail) return false;
  return artifactAccessList.includes(viewerEmail);
}
```

Private artifacts: redirect to `/login?next=/a/:slug`.
Restricted: show "Request access" if email not on list.

---

## 8. Analytics

On each successful view of `/a/:slug`:
1. Insert `artifact_views` row with `viewer_hash = sha256(email ?? ip+ua)`.
2. Owner dashboard aggregates:
   - `totalViews` = count(*)
   - `uniqueViewers` = count(distinct viewer_hash)
   - `lastViewedAt` = max(viewed_at)

---

## 9. Viral Loop

Every artifact page injects a fixed footer before `</body>`:

```html
<div id="artifact-powered-by" style="...">
  Powered by <a href="https://www.tether-labs.com/projects/relay">Relay</a>
  · <a href="/">Publish your own AI artifacts →</a>
</div>
```

Skipped if `RELAY_HIDE_FOOTER=1` (future Pro tier).

---

## 10. CLI

```bash
RELAY_API_URL=http://localhost:3847 \
RELAY_TOKEN=<session-or-api-key> \
  npm run publish -- demo/ai-research-report.html

# Output:
# ✓ Published: http://localhost:3847/a/k7x2m9pq
```

V1 CLI reads session token from `~/.relay/session` after browser login, or `RELAY_TOKEN` env.

---

## 11. Deployment (post-weekend)

| Target | Notes |
|--------|-------|
| **Fly.io / Railway** | Single container, volume for `storage/` |
| **Postgres** | Replace SQLite; same Drizzle schema with pg dialect |
| **Resend** | Magic link + invite emails |
| **Domain** | `artifact.so` or `artifact.tether-labs.com` |
| **CDN** | Cloudflare in front of `/a/*` static assets |

---

## 12. Product Hunt Demo Checklist

- [ ] Seed demo artifact: `demo/ai-research-report.html` (interactive AI research report)
- [ ] `npm run seed:demo` publishes it as public artifact
- [ ] Homepage project page: `/projects/artifact` with live demo link
- [ ] Tagline: *"Built this weekend. Share AI-generated artifacts securely."*
- [ ] Screenshots: publish flow, share dialog, analytics, permission modes

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-13 | Initial TDD — weekend V1 scope locked |
