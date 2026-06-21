import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Lock,
  UploadSimple,
  Users,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/app-header";
import { publishArtifact, ensureApiAuth, inviteToArtifact } from "@/lib/api";
import { ARTIFACT_UPLOAD_ACCEPT, markdownPreviewDocument, titleFromFilename } from "@/lib/artifact-files";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "visibility";
type Visibility = "public" | "private" | "restricted";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Preview" },
  { id: "visibility", label: "Share" },
];

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  desc: string;
  icon: typeof Globe;
}[] = [
  { value: "public", label: "Public", desc: "Anyone with the link", icon: Globe },
  { value: "private", label: "Private", desc: "Only you", icon: Lock },
  { value: "restricted", label: "Restricted", desc: "Invited emails", icon: Users },
];

function parseEmails(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3">
          <span
            className={cn(
              "font-medium",
              i === stepIndex ? "text-foreground" : i < stepIndex ? "text-muted-foreground" : "text-muted-foreground/60",
            )}
          >
            {i < stepIndex ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3" weight="bold" />
                {s.label}
              </span>
            ) : (
              <span>
                {i + 1}. {s.label}
              </span>
            )}
          </span>
          {i < STEPS.length - 1 && <span className="text-border">/</span>}
        </div>
      ))}
    </div>
  );
}

export function PublishPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [inviteEmails, setInviteEmails] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    if (file.name.match(/\.html?$/i)) {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    if (file.name.match(/\.(md|markdown)$/i)) {
      void file.text().then((text) => {
        if (cancelled) return;
        const html = markdownPreviewDocument(title || file.name, text);
        objectUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        setPreviewUrl(objectUrl);
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    setPreviewUrl(null);
  }, [file, title]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) navigate("/login?next=/publish");
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const stateFile = (location.state as { file?: File } | null)?.file;
    if (stateFile) pickFile(stateFile);
  }, [location.state]);

  function pickFile(f: File) {
    setFile(f);
    if (!title) {
      setTitle(titleFromFilename(f.name));
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }

  async function handlePublish() {
    if (!file) return;

    const emails = parseEmails(inviteEmails);
    if (visibility === "restricted") {
      if (emails.length === 0) {
        toast.error("Add at least one email to invite");
        return;
      }
      const invalid = emails.find((e) => !isValidEmail(e));
      if (invalid) {
        toast.error(`Invalid email: ${invalid}`);
        return;
      }
    }

    setPublishing(true);
    try {
      await ensureApiAuth();
      const result = await publishArtifact(file, title || "Untitled artifact", visibility);
      if (visibility === "restricted") {
        await inviteToArtifact(result.slug, emails);
      }
      toast.success("Published", { description: result.url });
      navigate(`/artifacts/${result.slug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const parsedInviteEmails = parseEmails(inviteEmails);
  const canPublish =
    visibility !== "restricted" ||
    (parsedInviteEmails.length > 0 && parsedInviteEmails.every(isValidEmail));

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">Publish</h1>
            </div>
            <StepIndicator stepIndex={stepIndex} />
          </div>

          <Card className="mt-6">
          {step === "upload" && (
            <>
              <CardHeader className="border-b">
                <CardTitle>Upload</CardTitle>
                <CardDescription>.html, .md, or .zip from Claude Code, Cursor, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Q2 Research Report"
                  />
                </div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-10 text-center transition-colors",
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
                    file && "border-primary/50",
                  )}
                >
                  <UploadSimple className="mb-2 size-5 text-muted-foreground" />
                  {file ? (
                    <>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Drop file or click to browse</p>
                      <p className="text-xs text-muted-foreground">.html, .htm, .md, .zip</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ARTIFACT_UPLOAD_ACCEPT}
                    className="sr-only"
                    onChange={onFileChange}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button disabled={!file} onClick={() => setStep("preview")}>
                    Continue
                    <ArrowRight />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === "preview" && (
            <>
              <CardHeader className="border-b">
                <CardTitle>Preview</CardTitle>
                <CardDescription>How viewers will see your artifact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {previewUrl ? (
                  <div className="overflow-hidden border border-border bg-white">
                    <iframe
                      src={previewUrl}
                      title="Preview"
                      className="h-[min(50vh,400px)] w-full"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    Zip bundles preview after publish.
                    {file && (
                      <Badge variant="secondary" className="mt-2">
                        {file.name}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button onClick={() => setStep("visibility")}>
                    Continue
                    <ArrowRight />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === "visibility" && (
            <>
              <CardHeader className="border-b">
                <CardTitle>Who can view</CardTitle>
                <CardDescription>Change this later from the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={cn(
                        "flex items-start gap-3 border p-3 text-left text-sm transition-colors",
                        visibility === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30",
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
                {visibility === "restricted" && (
                  <div className="space-y-2 border border-border bg-muted/20 p-4">
                    <Label htmlFor="invite-emails">Invite emails</Label>
                    <Input
                      id="invite-emails"
                      placeholder="jane@company.com, bob@team.io"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated. Invites send a sign-in link before they can view.
                    </p>
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep("preview")}>
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button onClick={handlePublish} disabled={publishing || !canPublish}>
                    {publishing ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    ) : (
                      <Check />
                    )}
                    Publish
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
        </div>
      </div>
    </PageShell>
  );
}
