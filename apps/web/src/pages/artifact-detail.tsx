import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Mail,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/app-header";
import { PageLoading } from "@/components/layout/page-loading";
import { ArtifactPreview } from "@/components/artifact-preview";
import { ArtifactAnalyticsPanel } from "@/components/artifact-analytics-panel";
import {
  AuthError,
  ensureApiAuth,
  getArtifactViewUrl,
  getArtifact,
  getArtifactAccess,
  getArtifactAnalytics,
  inviteToArtifact,
  revokeArtifactAccess,
  updateArtifact,
  type ArtifactAccess,
  type ArtifactAnalytics,
  type ArtifactRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const VISIBILITY_OPTIONS = [
  { value: "public" as const, label: "Public", desc: "Anyone with the link", icon: Globe },
  { value: "private" as const, label: "Private", desc: "Only you", icon: Lock },
  { value: "restricted" as const, label: "Restricted", desc: "Invited emails only", icon: Mail },
];

function formatRelative(ts: number | null | undefined) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function ArtifactDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [artifact, setArtifact] = useState<ArtifactRecord | null>(null);
  const [analytics, setAnalytics] = useState<ArtifactAnalytics | null>(null);
  const [access, setAccess] = useState<ArtifactAccess[]>([]);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<ArtifactRecord["visibility"]>("public");
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    await ensureApiAuth();
    const [art, stats, accessList] = await Promise.all([
      getArtifact(slug),
      getArtifactAnalytics(slug),
      getArtifactAccess(slug),
    ]);
    setArtifact(art);
    setTitle(art.title);
    setVisibility(art.visibility);
    setAnalytics(stats);
    setAccess(accessList.emails);
  }, [slug]);

  const refreshAnalytics = useCallback(async () => {
    if (!slug) return;
    const stats = await getArtifactAnalytics(slug);
    setAnalytics(stats);
  }, [slug]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate(`/login?next=/artifacts/${slug}`);
      return;
    }

    load()
      .catch((e) => {
        if (e instanceof AuthError) navigate(`/login?next=/artifacts/${slug}`);
        else setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [load, navigate, slug, isLoaded, isSignedIn]);

  async function saveChanges() {
    if (!slug || !artifact) return;
    setSaving(true);
    setError(null);
    try {
      await updateArtifact(slug, { title, visibility });
      setArtifact({ ...artifact, title, visibility });
      toast.success("Changes saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function sendInvites() {
    if (!slug || !inviteInput.trim()) return;
    setInviting(true);
    setError(null);
    const emails = inviteInput.split(/[\s,;]+/).filter(Boolean);
    try {
      await inviteToArtifact(slug, emails);
      setInviteInput("");
      const accessList = await getArtifactAccess(slug);
      setAccess(accessList.emails);
      await refreshAnalytics();
      if (visibility !== "restricted") {
        setVisibility("restricted");
        setArtifact((a) => (a ? { ...a, visibility: "restricted" } : a));
      }
      toast.success(`Invited ${emails.length} viewer${emails.length === 1 ? "" : "s"}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invite failed";
      setError(message);
      toast.error(message);
    } finally {
      setInviting(false);
    }
  }

  async function revokeViewer(email: string) {
    if (!slug) return;
    setRevokingEmail(email);
    setError(null);
    try {
      await revokeArtifactAccess(slug, email);
      setAccess((prev) => prev.filter((a) => a.email !== email));
      await refreshAnalytics();
      toast.success(`Removed ${email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove viewer";
      setError(message);
      toast.error(message);
    } finally {
      setRevokingEmail(null);
    }
  }

  function copyLink() {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.url);
    toast.success("Link copied to clipboard");
  }

  if (loading) return <PageLoading />;

  if (!artifact || !slug) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-muted-foreground">{error ?? "Artifact not found"}</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const dirty = title !== artifact.title || visibility !== artifact.visibility;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {artifact.title}
            </h1>
            <VisibilityBadge visibility={artifact.visibility} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
          <div className="space-y-5 lg:col-span-2">
            <Card className="overflow-hidden p-0">
              <ArtifactPreview
                slug={slug}
                visibility={artifact.visibility}
                className="h-40 w-full border-0"
                scale={0.24}
              />
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Settings & access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="grid gap-2">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={cn(
                        "flex items-start gap-2 border p-2.5 text-left text-sm transition-colors",
                        visibility === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30",
                      )}
                    >
                      <opt.icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-medium">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="share-url" className="text-xs">
                  Share link
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    readOnly
                    value={artifact.url}
                    className="min-w-0 flex-1 bg-muted/40 font-mono text-xs"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    <Copy />
                    Copy
                  </Button>
                  <Button variant="outline" size="icon-sm" asChild>
                    <a href={getArtifactViewUrl(slug)} target="_blank" rel="noreferrer" aria-label="Open link">
                      <ExternalLink />
                    </a>
                  </Button>
                </div>
              </div>

              {(visibility === "restricted" || access.length > 0) && (
                <div className="space-y-3 border-t border-border pt-4">
                  <Label>Invited viewers</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="jane@company.com, bob@team.io"
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={sendInvites} disabled={inviting || !inviteInput.trim()}>
                      {inviting ? <Loader2 className="animate-spin" /> : <Send />}
                      Invite
                    </Button>
                  </div>
                  {access.length > 0 && (
                    <ul className="divide-y divide-border border border-border">
                      {access.map((a) => {
                        const inviteStats = analytics?.invites.find(
                          (i) => i.email.toLowerCase() === a.email.toLowerCase(),
                        );
                        return (
                          <li key={a.email} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                            <div className="min-w-0">
                              <p className="truncate">{a.email}</p>
                              {inviteStats && (
                                <p className="text-muted-foreground">
                                  {inviteStats.opened
                                    ? `Opened · ${inviteStats.viewCount} view${inviteStats.viewCount === 1 ? "" : "s"}`
                                    : "Pending"}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="text-muted-foreground">{formatRelative(a.invited_at)}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Remove ${a.email}`}
                                disabled={revokingEmail === a.email}
                                onClick={() => revokeViewer(a.email)}
                              >
                                {revokingEmail === a.email ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <X className="size-3" />
                                )}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={saveChanges} disabled={!dirty || saving} size="sm">
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                Save changes
              </Button>
            </CardContent>
            </Card>
          </div>

          {analytics && (
            <div className="lg:col-span-3">
              <ArtifactAnalyticsPanel slug={slug} analytics={analytics} />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
