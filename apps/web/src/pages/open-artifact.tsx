import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { ClerkFormLoading } from "@/components/auth/clerk-form-loading";
import { PageShell } from "@/components/layout/app-header";
import { AuthError, canViewArtifact, ensureApiAuth, getAuthenticatedArtifactViewUrl } from "@/lib/api";
import { useClerkSession } from "@/lib/use-clerk-session";

export function OpenArtifactPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ready, hasSession } = useClerkSession();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"waiting" | "opening">("waiting");

  useEffect(() => {
    if (!slug || !ready) return;

    if (!hasSession) {
      const params = new URLSearchParams({ next: `/open/${slug}` });
      const email = searchParams.get("email");
      if (email) params.set("email", email);
      navigate(`/login?${params.toString()}`, { replace: true });
      return;
    }

    let cancelled = false;
    setStatus("opening");
    setError(null);

    ensureApiAuth()
      .then(() => canViewArtifact(slug))
      .then(async (allowed) => {
        if (cancelled) return;
        if (!allowed) {
          setError("access_denied");
          return;
        }
        const url = await getAuthenticatedArtifactViewUrl(slug);
        if (cancelled) return;
        window.location.replace(url);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof AuthError) {
          setError("sync_failed");
          return;
        }
        setError(e instanceof Error ? e.message : "Could not open artifact");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, hasSession, navigate, searchParams, slug]);

  if (error) {
    const loginParams = new URLSearchParams({ next: `/open/${slug}` });
    const email = searchParams.get("email");
    if (email) loginParams.set("email", email);

    return (
      <PageShell>
        <div className="mx-auto max-w-md space-y-4 px-6 py-20 text-center">
          {error === "access_denied" ? (
            <>
              <h1 className="font-heading text-xl font-semibold">Access restricted</h1>
              <p className="text-sm text-muted-foreground">
                This experience is only visible to invited viewers. The account you&apos;re signed
                into may not match the invite email.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void signOut({ redirectUrl: `/login?${loginParams.toString()}` });
                  }}
                >
                  Sign in with another account
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              </div>
            </>
          ) : error === "sync_failed" ? (
            <>
              <h1 className="font-heading text-xl font-semibold">Couldn&apos;t connect session</h1>
              <p className="text-sm text-muted-foreground">
                You&apos;re signed in, but Relay couldn&apos;t sync with the API. Try again in a moment.
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ClerkFormLoading
        label={status === "opening" ? "Opening artifact…" : "Checking sign in…"}
      />
    </PageShell>
  );
}
