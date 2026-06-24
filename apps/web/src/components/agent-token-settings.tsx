import { useEffect, useState } from "react";
import { Copy, Key, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createAgentToken,
  ensureApiAuth,
  listAgentTokens,
  revokeAgentToken,
  AuthError,
  type AgentTokenRecord,
} from "@/lib/api";
import { CURSOR_MCP_CONFIG } from "@/lib/mcp-tools";
import { McpToolsReference } from "@/components/mcp-tools-reference";

export function AgentTokenSettings() {
  const [agentTokens, setAgentTokens] = useState<AgentTokenRecord[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("Cursor MCP");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureApiAuth()
      .then(() => listAgentTokens())
      .then((data) => setAgentTokens(data.tokens))
      .catch((e) => {
        if (e instanceof AuthError) return;
        toast.error(e instanceof Error ? e.message : "Could not load agent tokens");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateToken() {
    setTokenBusy(true);
    try {
      const created = await createAgentToken(tokenName);
      setAgentTokens((tokens) => [created.tokenRecord, ...tokens]);
      setNewToken(created.token);
      await navigator.clipboard.writeText(created.token);
      toast.success("Agent token copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create token");
    } finally {
      setTokenBusy(false);
    }
  }

  async function handleCopyNewToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    toast.success("Copied token");
  }

  async function handleRevokeToken(id: string) {
    setTokenBusy(true);
    try {
      await revokeAgentToken(id);
      setAgentTokens((tokens) => tokens.filter((token) => token.id !== id));
      toast.success("Agent token revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke token");
    } finally {
      setTokenBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">MCP & agent tokens</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Create long-lived Relay tokens for Cursor, MCP, or the Relay CLI. Tokens are shown once and
          can be revoked any time.
        </p>
      </div>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4 text-primary" />
            Agent tokens
          </CardTitle>
          <CardDescription>Use these as `RELAY_TOKEN=relay_pat_...` in local agent tools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              placeholder="Token name"
            />
            <Button onClick={handleCreateToken} disabled={tokenBusy || !tokenName.trim()}>
              Create token
            </Button>
          </div>

          {newToken && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-foreground">Copy this token now. It will not be shown again.</p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-sm bg-background px-2 py-1.5 font-mono text-xs text-foreground">
                  {newToken}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyNewToken}>
                  <Copy />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              Loading tokens...
            </p>
          ) : agentTokens.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No agent tokens yet.
            </p>
          ) : (
            <div className="space-y-2">
              {agentTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{token.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {token.tokenPrefix} · {token.lastUsedAt ? "Used" : "Never used"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRevokeToken(token.id)}
                    disabled={tokenBusy}
                  >
                    <Trash />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Cursor config</CardTitle>
          <CardDescription>Paste this into Cursor MCP settings and replace the token value.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border border-border/80 bg-muted/35 p-3 text-xs leading-relaxed text-foreground">
            <code>{CURSOR_MCP_CONFIG}</code>
          </pre>
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>MCP tools</CardTitle>
          <CardDescription>
            After connecting Relay in Cursor, ask your agent to use these tools by name or natural language.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <McpToolsReference />
        </CardContent>
      </Card>
    </div>
  );
}
