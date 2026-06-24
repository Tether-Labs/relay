import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";
import { PageLoading } from "@/components/layout/page-loading";
import { AuthError, ensureApiAuth, getArtifactViewUrl } from "@/lib/api";

export function OpenArtifactPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !isLoaded) return;

    if (!isSignedIn) {
      const params = new URLSearchParams({ next: `/open/${slug}` });
      const email = searchParams.get("email");
      if (email) params.set("email", email);
      navigate(`/login?${params.toString()}`, { replace: true });
      return;
    }

    ensureApiAuth()
      .then(() => {
        window.location.replace(getArtifactViewUrl(slug));
      })
      .catch((e) => {
        if (e instanceof AuthError) {
          const params = new URLSearchParams({ next: `/open/${slug}` });
          const email = searchParams.get("email");
          if (email) params.set("email", email);
          navigate(`/login?${params.toString()}`, { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "Could not open artifact");
      });
  }, [isLoaded, isSignedIn, navigate, searchParams, slug]);

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </PageShell>
    );
  }

  return <PageLoading />;
}
