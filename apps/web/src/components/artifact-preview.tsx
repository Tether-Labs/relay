import { getArtifactViewUrl, type ArtifactRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FileText, Lock } from "lucide-react";

export function ArtifactPreview({
  slug,
  visibility,
  className,
  scale = 0.22,
  fadeBottom = true,
}: {
  slug: string;
  visibility: ArtifactRecord["visibility"];
  className?: string;
  scale?: number;
  fadeBottom?: boolean;
}) {
  const pct = `${100 / scale}%`;

  if (visibility === "private") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 border-b border-border/60 bg-muted/60 text-muted-foreground",
          className,
        )}
      >
        <Lock className="size-5 opacity-50" />
        <span className="text-xs">Private preview</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      <div
        className="absolute inset-0"
        style={
          fadeBottom
            ? {
                maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
              }
            : undefined
        }
      >
        <iframe
          src={getArtifactViewUrl(slug)}
          title={`Preview of ${slug}`}
          className="pointer-events-none absolute left-0 top-0 border-0"
          style={{
            width: pct,
            height: pct,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          tabIndex={-1}
          loading="lazy"
        />
      </div>
    </div>
  );
}

export function ArtifactPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted/40 text-muted-foreground/50",
        className,
      )}
    >
      <FileText className="size-8" strokeWidth={1.25} />
    </div>
  );
}
