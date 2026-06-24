import { useEffect, useRef, useState } from "react";
import { fetchArtifactPreviewHtml, getArtifactViewUrl, type ArtifactRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FileText, Lock } from "lucide-react";

function ScaledPreviewFrame({
  html,
  slug,
  className,
  scale = 0.22,
  fadeBottom = true,
}: {
  html?: string;
  slug: string;
  className?: string;
  scale?: number;
  fadeBottom?: boolean;
}) {
  const pct = `${100 / scale}%`;

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
          {...(html
            ? { srcDoc: html }
            : { src: getArtifactViewUrl(slug) })}
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
          sandbox={html ? "allow-same-origin" : undefined}
        />
      </div>
    </div>
  );
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || visibility !== "restricted") {
      if (visibility !== "restricted") setPreviewHtml(null);
      return;
    }

    let cancelled = false;
    void fetchArtifactPreviewHtml(slug)
      .then((html) => {
        if (!cancelled) setPreviewHtml(html);
      })
      .catch(() => {
        if (!cancelled) setPreviewHtml(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, visibility, visible]);

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

  if (visibility === "public" && !visible) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex items-center justify-center border-b border-border/60 bg-muted/30 text-muted-foreground",
          className,
        )}
      >
        <span className="text-xs">Preview</span>
      </div>
    );
  }

  if (visibility === "restricted" && !previewHtml) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col items-center justify-center gap-2 border-b border-border/60 bg-muted/40 text-muted-foreground",
          className,
        )}
      >
        <FileText className="size-5 opacity-40" />
        <span className="text-xs">{visible ? "Loading preview…" : "Preview"}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <ScaledPreviewFrame
        slug={slug}
        html={visibility === "restricted" ? previewHtml ?? undefined : undefined}
        className="h-full w-full"
        scale={scale}
        fadeBottom={fadeBottom}
      />
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
