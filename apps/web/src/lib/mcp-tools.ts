export const RELAY_MCP_PACKAGE = "@tether-labs.com/relay-mcp";
export const RELAY_API_URL = "https://relay-tether-labs.fly.dev";
export const RELAY_MCP_NPM_URL = "https://www.npmjs.com/package/@tether-labs.com/relay-mcp";
export const RELAY_MCP_README_URL =
  "https://github.com/Tether-Labs/relay/blob/main/packages/mcp/README.md";

export type McpToolDoc = {
  name: string;
  summary: string;
  examplePrompt: string;
  params?: string;
};

export const MCP_TOOLS: McpToolDoc[] = [
  {
    name: "auth_status",
    summary: "Check whether Relay auth is configured (without revealing the token).",
    examplePrompt: "Check my Relay MCP auth status.",
  },
  {
    name: "publish_artifact",
    summary: "Publish a local HTML/zip file or raw HTML and return the share URL.",
    examplePrompt: "Publish ./report.html to Relay as a public artifact.",
    params: "filePath or html, optional title, visibility",
  },
  {
    name: "list_artifacts",
    summary: "List artifacts you own and artifacts shared with you.",
    examplePrompt: "List everything I've published on Relay.",
  },
  {
    name: "get_artifact_analytics",
    summary: "View counts, trends, recent viewers, and invite open rates.",
    examplePrompt: "Show analytics for artifact slug abc123.",
    params: "slug",
  },
  {
    name: "update_artifact_permissions",
    summary: "Change an artifact title or visibility (public, private, restricted).",
    examplePrompt: "Make artifact abc123 restricted.",
    params: "slug, optional title, visibility",
  },
  {
    name: "invite_artifact_viewers",
    summary: "Invite emails to view a restricted artifact (sends invite links).",
    examplePrompt: "Invite alice@co.com to view artifact abc123.",
    params: "slug, emails[]",
  },
];

export const CURSOR_MCP_CONFIG = `{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["-y", "${RELAY_MCP_PACKAGE}"],
      "env": {
        "RELAY_API_URL": "${RELAY_API_URL}",
        "RELAY_TOKEN": "relay_pat_..."
      }
    }
  }
}`;

export const MCP_TOOL_SUMMARIES = MCP_TOOLS.map((tool) => `${tool.name} — ${tool.summary}`);
