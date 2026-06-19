import { Link } from "react-router-dom";
import { ArrowRight, Eye, Link2, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/app-header";

export function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Relay
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Share AI-generated experiences like documents
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Publish HTML from Claude Code or Cursor. One link, permissions, analytics — no PDF exports.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/login">
                Get started
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-3xl gap-5 sm:grid-cols-3">
          {[
            { icon: Share2, title: "One link", desc: "Share instantly" },
            { icon: Lock, title: "Permissions", desc: "Public or private" },
            { icon: Eye, title: "Analytics", desc: "Track every view" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="paper-sheet paper-sheet-hover p-5 text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="paper-sheet mx-auto mt-12 max-w-md p-5 text-center">
          <Link2 className="mx-auto mb-2 size-4 text-muted-foreground" />
          <code className="text-xs text-muted-foreground">relay publish report.html</code>
        </div>
      </section>
    </PageShell>
  );
}
