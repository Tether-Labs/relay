import { PageShell } from "@/components/layout/app-header";
import { ArtifactShowcase } from "@/components/artifact-showcase";
import { PublishMethodPanel } from "@/components/publish-method-panel";

export function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid w-full min-w-0 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] md:leading-[1.08]">
              Your agent builds it.
              <br />
              Relay publishes with{" "}
              <span className="text-primary">access control</span> and{" "}
              <span className="text-primary">analytics</span>.
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Upload HTML or zip bundles from your coding agent and publish them to a link — set who
              can view it, see who opened it.
            </p>
          </div>

          <div className="min-w-0 w-full">
            <PublishMethodPanel className="w-full lg:mt-0" />
          </div>
        </div>
      </section>

      <ArtifactShowcase />

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-2 text-center text-xs text-muted-foreground">
        Web · CLI · MCP · Skills
      </footer>
    </PageShell>
  );
}
