import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>Loading…</span>
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
