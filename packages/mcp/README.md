# Relay MCP Server

Local stdio MCP server for publishing HTML or zip artifacts to Relay from an agent.

## Setup

The server uses the same auth path as the CLI. Create an agent token in the Relay dashboard, then:

```bash
export RELAY_API_URL=https://relay-tether-labs.fly.dev
export RELAY_TOKEN=relay_pat_...
```

You can also save the token at `~/.relay/session`.

## Cursor config

```json
{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/relay/packages/mcp/src/server.ts"],
      "env": {
        "RELAY_API_URL": "https://relay-tether-labs.fly.dev",
        "RELAY_TOKEN": "relay_pat_..."
      }
    }
  }
}
```

## Tool

`publish_artifact`

Inputs:

- `filePath` — path to a local `.html`, `.htm`, or `.zip` file.
- `html` — raw HTML content to publish when no file exists yet.
- `title` — optional artifact title.
- `visibility` — `public`, `private`, or `restricted` (defaults to `public`).
- `fileName` — optional file name when publishing raw `html`.
