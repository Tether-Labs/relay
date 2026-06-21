import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Globe, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/app-header";
import { PageLoading } from "@/components/layout/page-loading";
import { ArtifactGridCard } from "@/components/artifact-grid-card";
import { PaginatedArtifactGrid } from "@/components/paginated-artifact-grid";
import {
  AuthError,
  emailToHandle,
  ensureApiAuth,
  listArtifacts,
  type ArtifactRecord,
} from "@/lib/api";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/pagination";

const ARTIFACTS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function DashboardPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [owned, setOwned] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate("/login?next=/dashboard");
      return;
    }

    ensureApiAuth()
      .then(() => listArtifacts())
      .then((data) => setOwned(data.owned))
      .catch((e) => {
        if (e instanceof AuthError) navigate("/login?next=/dashboard");
      })
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, navigate]);

  const { page, setPage, pageCount, paginatedItems } = usePagination(owned, ARTIFACTS_PAGE_SIZE);

  if (!isLoaded || loading) return <PageLoading />;

  const email = user?.primaryEmailAddress?.emailAddress;
  const profileHandle = email ? emailToHandle(email) : null;

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
