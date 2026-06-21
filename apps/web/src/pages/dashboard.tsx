import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Copy, Globe, Key, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/app-header";
import { PageLoading } from "@/components/layout/page-loading";
import { ArtifactGridCard } from "@/components/artifact-grid-card";
import { PaginatedArtifactGrid } from "@/components/paginated-artifact-grid";
import {
  AuthError,
  createAgentToken,
  emailToHandle,
  ensureApiAuth,
  listAgentTokens,
  listArtifacts,
  revokeAgentToken,
  type AgentTokenRecord,
  type ArtifactRecord,
} from "@/lib/api";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/pagination";

const ARTIFACTS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function DashboardPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [owned, setOwned] = useState<ArtifactRecord[]>([]);
  const [agentTokens, setAgentTokens] = useState<AgentTokenRecord[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("Cursor MCP");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate("/login?next=/dashboard");
      return;
    }

    ensureApiAuth()
      .then(async () => {
        const [artifacts, tokens] = await Promise.all([listArtifacts(), listAgentTokens()]);
        setOwned(artifacts.owned);
        setAgentTokens(tokens.tokens);
      })
      .catch((e) => {
        if (e instanceof AuthError) navigate("/login?next=/dashboard");
      })
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, navigate]);

  const { page, setPage, pageCount, paginatedItems } = usePagination(owned, ARTIFACTS_PAGE_SIZE);

  if (!isLoaded || loading) return <PageLoading />;

  const email = user?.primaryEmailAddress?.emailAddress;
  const profileHandle = email ? emailToHandle(email) : null;

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
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-x-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
              <span className="min-w-0 truncate">Your artifacts</span>
              <CountBadge>
                {owned.length} {owned.length === 1 ? "artifact" : "artifacts"}
              </CountBadge>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profileHandle && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/user/${profileHandle}`}>
                  <Globe />
                  @{profileHandle}
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link to="/publish">
                <Plus />
                New artifact
              </Link>
            </Button>
          </div>
        </div>

        <Card className="mb-8 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              Agent tokens
            </CardTitle>
            <CardDescription>
              Create a long-lived token for Cursor, MCP, or the Relay CLI. Tokens are shown once.
            </CardDescription>
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

            {agentTokens.length > 0 && (
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

        {owned.length === 0 ? (
          <Card className="border-dashed bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground">No artifacts yet — publish your first one.</p>
              <Button className="mt-4" asChild>
                <Link to="/publish">Publish artifact</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <PaginatedArtifactGrid page={page} pageCount={pageCount} onPageChange={setPage}>
            {paginatedItems.map((a) => (
              <ArtifactGridCard key={a.id} artifact={a} />
            ))}
          </PaginatedArtifactGrid>
        )}
      </div>
    </PageShell>
  );
}
