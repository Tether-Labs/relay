# Relay MCP Server

Local stdio MCP server for publishing and managing HTML or zip artifacts on [Relay](https://relay.tether-labs.com) from Cursor and other MCP clients.

## Install

Create an agent token in the Relay dashboard (**Account → MCP & tokens**), then add this to your Cursor MCP config:

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

Restart the Relay MCP server in Cursor after saving.

You can also save a token at `~/.relay/session` instead of setting `RELAY_TOKEN`.

## Auth

The server reads credentials in this order:

1. `RELAY_TOKEN` environment variable (recommended — use a `relay_pat_...` agent token)
2. `~/.relay/session` file

Optional: `RELAY_API_URL` (defaults to `https://relay-tether-labs.fly.dev`).

## Tools

### `auth_status`

Reports which token source is configured without revealing the token.

### `publish_artifact`

Publish a local file or raw HTML to Relay.

Inputs:

- `filePath` — path to a local `.html`, `.htm`, or `.zip` file
- `html` — raw HTML content when no file exists yet
- `title` — optional artifact title
- `visibility` — `public`, `private`, or `restricted` (defaults to `public`)
- `fileName` — optional file name when publishing raw `html`

### `list_artifacts`

List artifacts you own and artifacts shared with you.

### `get_artifact_analytics`

View counts, recent viewers, daily trends, and invite open rates for an artifact you own.

Inputs:

- `slug` — artifact slug

### `update_artifact_permissions`

Change an artifact title or visibility.

Inputs:

- `slug` — artifact slug
- `title` — optional new title
- `visibility` — optional new visibility (`public`, `private`, or `restricted`)

### `invite_artifact_viewers`

Invite email addresses to view a restricted artifact. Sends invite emails and sets visibility to `restricted` if needed.

Inputs:

- `slug` — artifact slug
- `emails` — array of email addresses to invite

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
