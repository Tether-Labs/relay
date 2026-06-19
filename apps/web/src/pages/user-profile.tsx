import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageShell } from "@/components/layout/app-header";
import { PageLoading } from "@/components/layout/page-loading";
import { PaginatedArtifactGrid } from "@/components/paginated-artifact-grid";
import { PublicArtifactCard } from "@/components/public-artifact-card";
import { Card, CardContent } from "@/components/ui/card";
import { CountBadge } from "@/components/ui/badge";
import { getUserPublicArtifacts, type PublicUserProfile } from "@/lib/api";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/pagination";

const ARTIFACTS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveHandle(paramHandle: string | undefined, pathname: string): string | null {
  if (paramHandle?.trim()) return decodeURIComponent(paramHandle.trim());
  const match = pathname.match(/^\/user\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function UserProfilePage() {
  const { handle: paramHandle } = useParams<{ handle: string }>();
  const { pathname } = useLocation();
  const handle = useMemo(() => resolveHandle(paramHandle, pathname), [paramHandle, pathname]);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getUserPublicArtifacts(handle)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  const { page, setPage, pageCount, paginatedItems } = usePagination(
    profile?.artifacts ?? [],
    ARTIFACTS_PAGE_SIZE,
  );

  if (loading) return <PageLoading />;

  if (notFound || !profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-muted-foreground">User not found.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Public profile
          </p>
          <h1 className="mt-2 flex items-center gap-x-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
            <span className="min-w-0 truncate">@{profile.user.handle}</span>
            <CountBadge>
              {profile.artifacts.length} public{" "}
              {profile.artifacts.length === 1 ? "artifact" : "artifacts"}
            </CountBadge>
          </h1>
        </div>

        {profile.artifacts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No public artifacts yet.
            </CardContent>
          </Card>
        ) : (
          <PaginatedArtifactGrid page={page} pageCount={pageCount} onPageChange={setPage}>
            {paginatedItems.map((artifact) => (
              <PublicArtifactCard key={artifact.slug} artifact={artifact} />
            ))}
          </PaginatedArtifactGrid>
        )}
      </div>
    </PageShell>
  );
}
