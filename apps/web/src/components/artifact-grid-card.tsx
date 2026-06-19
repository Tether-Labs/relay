import { Link } from "react-router-dom";
import { Copy, ExternalLink, Eye, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtifactPreview } from "@/components/artifact-preview";
import { getArtifactViewUrl, type ArtifactRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ArtifactGridCard({ artifact }: { artifact: ArtifactRecord }) {
  const [copied, setCopied] = useState(false);

  function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(artifact.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Link to={`/artifacts/${artifact.slug}`} className="group block">
      <Card className={cn("paper-sheet-hover flex h-full flex-col overflow-hidden p-0")}>
        <ArtifactPreview
          slug={artifact.slug}
          visibility={artifact.visibility}
          className="h-36 w-full border-b border-border/60"
        />
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary">
              {artifact.title}
            </CardTitle>
            <VisibilityBadge visibility={artifact.visibility} />
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">/a/{artifact.slug}</p>
        </CardHeader>
        <CardContent className="mt-auto space-y-3 pb-4">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {artifact.totalViews ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {artifact.uniqueViewers ?? 0} unique
            </span>
            <span className="ml-auto">{formatDate(artifact.created_at)}</span>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-card"
            onClick={copyLink}
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            asChild
          >
            <a href={getArtifactViewUrl(artifact.slug)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
