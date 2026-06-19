import { Link } from "react-router-dom";
import { Copy, ExternalLink, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArtifactPreview } from "@/components/artifact-preview";
import { getArtifactViewUrl, type ArtifactRecord } from "@/lib/api";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ArtifactGridCard({ artifact }: { artifact: ArtifactRecord }) {
  function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(artifact.url);
    toast.success("Link copied");
  }

  const views = artifact.totalViews ?? 0;
  const unique = artifact.uniqueViewers ?? 0;

  return (
    <Link to={`/artifacts/${artifact.slug}`} className="group block h-full">
      <Card className="paper-sheet-hover flex h-full flex-col gap-0 overflow-hidden p-0">
        <ArtifactPreview
          slug={artifact.slug}
          visibility={artifact.visibility}
          className="h-32 w-full shrink-0"
        />

        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-heading text-sm font-semibold leading-snug tracking-tight group-hover:text-primary">
              {artifact.title}
            </h3>
            <VisibilityBadge visibility={artifact.visibility} />
          </div>

          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            /a/{artifact.slug}
            <span className="mx-1.5 text-border">·</span>
            <span className="font-sans">{formatDate(artifact.created_at)}</span>
          </p>

          <div className="mt-2.5 flex items-center gap-3 border border-border/70 bg-muted/30 px-2.5 py-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums text-foreground">{views}</span>
              <span className="text-muted-foreground">views</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums text-foreground">{unique}</span>
              <span className="text-muted-foreground">unique</span>
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-card"
                  onClick={copyLink}
                  aria-label="Copy link"
                >
                  <Copy className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-card"
                  onClick={(e) => e.stopPropagation()}
                  asChild
                >
                  <a
                    href={getArtifactViewUrl(artifact.slug)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>
    </Link>
  );
}
