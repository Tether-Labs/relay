import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Globe, Plus, UsersThree } from "@phosphor-icons/react";
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
import { useClerkSession } from "@/lib/use-clerk-session";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/pagination";

const ARTIFACTS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function DashboardPage() {
  const navigate = useNavigate();
  const { isLoaded, ready, hasSession } = useClerkSession();
  const { user } = useUser();
  const [owned, setOwned] = useState<ArtifactRecord[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"auth" | "sync" | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!hasSession) {
      navigate("/login?next=/dashboard");
      return;
    }

    setLoadError(null);
    setLoading(true);

    const timeout = window.setTimeout(() => {
      setLoading(false);
      setLoadError("sync");
    }, 20000);

    ensureApiAuth()
      .then(() => listArtifacts())
      .then((data) => {
        setOwned(data.owned);
        setSharedWithMe(data.sharedWithMe);
        setLoadError(null);
      })
      .catch((e) => {
        if (e instanceof AuthError) {
          setLoadError("auth");
          return;
        }
        setLoadError("sync");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => window.clearTimeout(timeout);
  }, [ready, hasSession, navigate]);

  const ownedPagination = usePagination(owned, ARTIFACTS_PAGE_SIZE);
  const sharedPagination = usePagination(sharedWithMe, ARTIFACTS_PAGE_SIZE);

  if (!isLoaded || !ready || loading) return <PageLoading />;

  if (loadError) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md space-y-4 px-6 py-20 text-center">
          <h1 className="font-heading text-xl font-semibold">
            {loadError === "auth" ? "Session expired" : "Couldn&apos;t load dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loadError === "auth"
              ? "Sign in again to view your artifacts."
              : "Check your connection and try again. Mobile networks can be slow on first load."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {loadError === "auth" ? (
              <Button asChild>
                <Link to="/login?next=/dashboard">Sign in</Link>
              </Button>
            ) : (
              <Button onClick={() => window.location.reload()}>Retry</Button>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

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
          <PaginatedArtifactGrid
            page={ownedPagination.page}
            pageCount={ownedPagination.pageCount}
            onPageChange={ownedPagination.setPage}
          >
            {ownedPagination.paginatedItems.map((a) => (
              <ArtifactGridCard key={a.id} artifact={a} />
            ))}
          </PaginatedArtifactGrid>
        )}

        <section className="mt-14">
          <div className="mb-6">
            <h2 className="flex items-center gap-x-2 font-heading text-xl font-semibold tracking-tight text-foreground">
              <UsersThree className="size-5 text-muted-foreground" />
              <span>Shared with me</span>
              <CountBadge>
                {sharedWithMe.length} {sharedWithMe.length === 1 ? "artifact" : "artifacts"}
              </CountBadge>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Restricted artifacts you were invited to view.
            </p>
          </div>

          {sharedWithMe.length === 0 ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nothing shared with you yet. When someone invites your email to a restricted artifact, it
                will show up here.
              </CardContent>
            </Card>
          ) : (
            <PaginatedArtifactGrid
              page={sharedPagination.page}
              pageCount={sharedPagination.pageCount}
              onPageChange={sharedPagination.setPage}
            >
              {sharedPagination.paginatedItems.map((a) => (
                <ArtifactGridCard key={a.id} artifact={a} variant="shared" />
              ))}
            </PaginatedArtifactGrid>
          )}
        </section>
      </div>
    </PageShell>
  );
}
