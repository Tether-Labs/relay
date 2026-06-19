import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Mail,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, VisibilityBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/app-header";
import { ArtifactPreview } from "@/components/artifact-preview";
import {
  AuthError,
  getArtifactViewUrl,
  getArtifact,
  getArtifactAccess,
  getArtifactAnalytics,
  getMe,
  inviteToArtifact,
  updateArtifact,
  type ArtifactAccess,
  type ArtifactRecord,
  type User,
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
  const [user, setUser] = useState<User | null>(null);
  const [artifact, setArtifact] = useState<ArtifactRecord | null>(null);
  const [analytics, setAnalytics] = useState<{ totalViews: number; uniqueViewers: number; lastViewedAt: number | null } | null>(null);
  const [access, setAccess] = useState<ArtifactAccess[]>([]);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<ArtifactRecord["visibility"]>("public");
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const me = await getMe();
    if (!me) {
      navigate(`/login?next=/artifacts/${slug}`);
      return;
    }
    setUser(me);
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
  }, [slug, navigate]);

  useEffect(() => {
    load()
      .catch((e) => {
        if (e instanceof AuthError) navigate(`/login?next=/artifacts/${slug}`);
        else setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [load, navigate, slug]);

  async function saveChanges() {
    if (!slug || !artifact) return;
    setSaving(true);
    setError(null);
    try {
      await updateArtifact(slug, { title, visibility });
      setArtifact({ ...artifact, title, visibility });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
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
      if (visibility !== "restricted") {
        setVisibility("restricted");
        setArtifact((a) => (a ? { ...a, visibility: "restricted" } : a));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  function copyLink() {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (!artifact || !slug) {
    return (
      <PageShell user={user}>
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-muted-foreground">{error ?? "Experience not found"}</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const dirty = title !== artifact.title || visibility !== artifact.visibility;

  return (
    <PageShell user={user}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            All artifacts
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <VisibilityBadge visibility={artifact.visibility} />
              <span className="font-mono text-xs text-muted-foreground">/a/{slug}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{artifact.title}</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={getArtifactViewUrl(slug)} target="_blank" rel="noreferrer">
              <ExternalLink />
              Open experience
            </a>
          </Button>
        </div>

        {/* Preview */}
        <Card className="mt-8 overflow-hidden p-0">
          <ArtifactPreview
            slug={slug}
            visibility={artifact.visibility}
            className="h-64 w-full"
            scale={0.28}
          />
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Share */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Share link</CardTitle>
              <CardDescription>Send this URL to viewers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={artifact.url} className="font-mono text-xs bg-muted/40" onClick={(e) => e.currentTarget.select()} />
                <Button variant="outline" onClick={copyLink}>
                  <Copy />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analytics</CardTitle>
              <CardDescription>Who's viewing your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{analytics?.totalViews ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total views</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{analytics?.uniqueViewers ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Unique</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {formatRelative(analytics?.lastViewedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">Last viewed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>Visibility</Label>
              <p className="text-xs text-muted-foreground">
                Private = only you. Restricted = invited emails only. Inviting someone sets Restricted automatically.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                      visibility === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <opt.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={saveChanges} disabled={!dirty || saving}>
              {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
              {saved ? "Saved" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Invites */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Invite viewers
            </CardTitle>
            <CardDescription>
              Add emails for restricted access. Invites send a magic link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="jane@company.com, bob@team.io"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={sendInvites} disabled={inviting || !inviteInput.trim()}>
                {inviting ? <Loader2 className="animate-spin" /> : <Send />}
                Invite
              </Button>
            </div>
            {access.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
                {access.map((a) => (
                  <li key={a.email} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{a.email}</span>
                    <Badge variant="secondary">{formatRelative(a.invited_at)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
