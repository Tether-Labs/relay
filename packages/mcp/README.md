# Relay MCP Server

Local stdio MCP server for publishing and managing HTML or zip artifacts on [Relay](https://relay.tether-labs.com) from Cursor and other MCP clients.

## Install

1. Sign in at [relay.tether-labs.com](https://relay.tether-labs.com)
2. Open **Account → MCP & tokens** and create an agent token (`relay_pat_...`)
3. Add this to your Cursor MCP config:

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

4. Restart the Relay MCP server in Cursor

You can also save a token at `~/.relay/session` instead of setting `RELAY_TOKEN`.

## Auth

The server reads credentials in this order:

1. `RELAY_TOKEN` environment variable (recommended — use a `relay_pat_...` agent token)
2. `~/.relay/session` file

Optional: `RELAY_API_URL` (defaults to `https://relay-tether-labs.fly.dev`).

Use `auth_status` to verify configuration without exposing the token.

## Tools

| Tool | Purpose |
|------|---------|
| `auth_status` | Diagnose token configuration |
| `publish_artifact` | Upload HTML/zip and get a share URL |
| `list_artifacts` | List owned and shared artifacts |
| `get_artifact_analytics` | View counts, trends, and viewers |
| `update_artifact_permissions` | Change title or visibility |
| `invite_artifact_viewers` | Email invites for restricted access |

### Visibility levels

- **public** — anyone with the link
- **private** — owner only (cannot have invitees)
- **restricted** — owner plus invited emails

---

### `auth_status`

Reports which token source is configured (`env`, `file`, or `missing`) without revealing the secret.

**Example prompts:**

- "Check my Relay MCP auth status."
- "Is Relay MCP configured correctly?"

---

### `publish_artifact`

Publish a local file or raw HTML to Relay.

**Inputs:**

| Param | Required | Description |
|-------|----------|-------------|
| `filePath` | one of filePath/html | Path to `.html`, `.htm`, or `.zip` |
| `html` | one of filePath/html | Raw HTML when no file exists |
| `title` | no | Display title (defaults to filename) |
| `visibility` | no | `public`, `private`, or `restricted` (default: `public`) |
| `fileName` | no | Filename when using `html` |

**Example prompts:**

- "Publish `./report.html` to Relay as public."
- "Publish this HTML dashboard to Relay with title 'Q2 Board Deck' and restricted visibility."

---

### `list_artifacts`

List artifacts you own (with view counts) and artifacts shared with you.

**Example prompts:**

- "List everything I've published on Relay."
- "What artifacts do I have on Relay?"

---

### `get_artifact_analytics`

View analytics for an artifact you own.

**Inputs:**

| Param | Required | Description |
|-------|----------|-------------|
| `slug` | yes | Artifact slug from the URL (`/a/{slug}`) |

**Returns:** total/unique views, daily trend, top viewers, recent views, invite open rates.

**Example prompts:**

- "Show analytics for artifact `sbitzic4`."
- "How many people viewed my latest Relay report?"

---

### `update_artifact_permissions`

Change an artifact title or visibility.

**Inputs:**

| Param | Required | Description |
|-------|----------|-------------|
| `slug` | yes | Artifact slug |
| `title` | one of title/visibility | New title |
| `visibility` | one of title/visibility | `public`, `private`, or `restricted` |

**Example prompts:**

- "Make artifact `abc123` restricted."
- "Rename artifact `abc123` to 'Board Deck v2'."

---

### `invite_artifact_viewers`

Invite email addresses to view a restricted artifact. Sends invite links and sets visibility to `restricted` if needed.

**Inputs:**

| Param | Required | Description |
|-------|----------|-------------|
| `slug` | yes | Artifact slug |
| `emails` | yes | Array of email addresses |

**Example prompts:**

- "Invite alice@co.com and bob@co.com to view artifact `abc123`."
- "Share my Relay report `abc123` with the finance team at finance@co.com."

---

## Development

From the Relay monorepo root:

```bash
npm run mcp
```

Or from this package:

```bash
npm run dev
npm run build
npm run typecheck
```

## Publish to npm

Published under the [`@tether-labs.com`](https://www.npmjs.com/org/tether-labs.com) npm org.

```bash
cd packages/mcp
npm run build
npm publish --access public
```
