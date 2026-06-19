import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/app-header";
import { ArtifactGridCard } from "@/components/artifact-grid-card";
import { AuthError, getMe, listArtifacts, type ArtifactRecord, type User } from "@/lib/api";

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [owned, setOwned] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await getMe();
        if (!me) {
          navigate("/login?next=/dashboard");
          return;
        }
        setUser(me);
        const data = await listArtifacts();
        setOwned(data.owned);
      } catch (e) {
        if (e instanceof AuthError) navigate("/login?next=/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell user={user}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your experiences</h1>
            <p className="mt-1 text-sm text-muted-foreground">{owned.length} published · {user?.email}</p>
          </div>
          <Button asChild>
            <Link to="/publish">
              <Plus />
              New experience
            </Link>
          </Button>
        </div>

        {owned.length === 0 ? (
          <Card className="border-dashed bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground">No experiences yet — publish your first report.</p>
              <Button className="mt-4" asChild>
                <Link to="/publish">Publish experience</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((a) => (
              <ArtifactGridCard key={a.id} artifact={a} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
