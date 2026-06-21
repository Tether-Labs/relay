# Relay MCP Server

Local stdio MCP server for publishing HTML or zip artifacts to [Relay](https://relay.tether-labs.com) from Cursor and other MCP clients.

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

```bash
cd packages/mcp
npm run build
npm publish --access public
```

Published under the [`@tether-labs.com`](https://www.npmjs.com/org/tether-labs.com) npm org. Requires org publish access and `NPM_TOKEN` in GitHub for tag-based releases (`relay-mcp-v*`).
