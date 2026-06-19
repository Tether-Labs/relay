import { Eye } from "lucide-react";
import { VisibilityBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArtifactPreview } from "@/components/artifact-preview";
import type { PublicArtifactRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PublicArtifactCard({
  artifact,
  truncateTitle = false,
}: {
  artifact: PublicArtifactRecord;
  truncateTitle?: boolean;
}) {
  const views = artifact.totalViews ?? 0;

  return (
    <a href={artifact.url} target="_blank" rel="noreferrer" className="group block h-full">
      <Card className="paper-sheet-hover flex h-full flex-col gap-0 overflow-hidden p-0">
        <ArtifactPreview
          slug={artifact.slug}
          visibility="public"
          className="h-32 w-full shrink-0"
        />

        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h3
              className={cn(
                "min-w-0 font-heading text-sm font-semibold leading-snug tracking-tight group-hover:text-primary",
                truncateTitle ? "truncate" : "line-clamp-2",
              )}
            >
              {artifact.title}
            </h3>
            <VisibilityBadge visibility="public" />
          </div>

          <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span className="truncate font-mono">/a/{artifact.slug}</span>
            {artifact.created_at > 0 && (
              <>
                <span className="shrink-0 text-border">·</span>
                <span className="shrink-0">{formatDate(artifact.created_at)}</span>
              </>
            )}
            <span className="shrink-0 text-border">·</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-sans">
              <Eye className="size-3" />
              <span className="tabular-nums">{views}</span>
            </span>
          </p>
        </div>
      </Card>
    </a>
  );
}
