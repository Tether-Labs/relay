import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  Globe,
  Loader2,
  Lock,
  Mail,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/app-header";
import { AuthError, getMe, publishArtifact, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "visibility";
type Visibility = "public" | "private" | "restricted";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Preview" },
  { id: "visibility", label: "Visibility" },
];

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  desc: string;
  icon: typeof Globe;
}[] = [
  { value: "public", label: "Public", desc: "Anyone with the link can view", icon: Globe },
  { value: "private", label: "Private", desc: "Only you can view", icon: Lock },
  { value: "restricted", label: "Restricted", desc: "Invited emails only", icon: Mail },
];

export function PublishPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!file || !file.name.match(/\.html?$/i)) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    getMe().then((me) => {
      if (!me) navigate("/login?next=/publish");
      else setUser(me);
    }).catch((e) => {
      if (e instanceof AuthError) navigate("/login?next=/publish");
    });
  }, [navigate]);

  function pickFile(f: File) {
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.(html|htm|zip)$/i, "").replace(/[-_]/g, " "));
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
    setPublishing(true);
    setError(null);
    try {
      const result = await publishArtifact(file, title || "Untitled experience", visibility);
      navigate(`/artifacts/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <PageShell user={user}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight">Publish experience</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload → preview → set visibility → share</p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-medium",
                  i < stepIndex && "bg-primary text-primary-foreground",
                  i === stepIndex && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  i > stepIndex && "bg-muted text-muted-foreground",
                )}
              >
                {i < stepIndex ? <Check className="size-4" /> : i + 1}
              </div>
              <span className={cn("hidden text-sm sm:inline", i === stepIndex ? "font-medium" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-1 h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        <Card className="mt-8">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="size-5" />
                  Upload file
                </CardTitle>
                <CardDescription>HTML file or zip bundle from Claude Code, Cursor, or any generator.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
                    dragOver ? "border-primary bg-primary/5" : "border-border",
                    file && "border-primary/50 bg-primary/5",
                  )}
                >
                  <FileUp className="mb-3 size-8 text-muted-foreground" />
                  {file ? (
                    <>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Drop your file here</p>
                      <p className="text-sm text-muted-foreground">.html, .htm, or .zip</p>
                    </>
                  )}
                  <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                    Choose file
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept=".html,.htm,.zip"
                    className="sr-only"
                    onChange={onFileChange}
                  />
                </div>
                <div className="flex justify-end">
                  <Button disabled={!file} onClick={() => setStep("preview")}>
                    Continue
                    <ArrowRight />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>This is how viewers will see your artifact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-white">
                    <iframe src={previewUrl} title="Preview" className="h-[420px] w-full" sandbox="allow-scripts allow-same-origin" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                    <p className="text-muted-foreground">Zip bundles preview after publish.</p>
                    <Badge variant="secondary" className="mt-2">{file?.name}</Badge>
                  </div>
                )}
                <div className="flex justify-between">
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

          {/* Step 3: Visibility */}
          {step === "visibility" && (
            <>
              <CardHeader>
                <CardTitle>Who can view this?</CardTitle>
                <CardDescription>You can change this later from the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        visibility === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <opt.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("preview")}>
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button onClick={handlePublish} disabled={publishing}>
                    {publishing ? <Loader2 className="animate-spin" /> : <Check />}
                    Publish
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
