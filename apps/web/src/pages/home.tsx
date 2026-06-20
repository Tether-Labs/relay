import { PageShell } from "@/components/layout/app-header";
import { ArtifactShowcase } from "@/components/artifact-showcase";
import { PublishMethodPanel } from "@/components/publish-method-panel";

export function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-20 lg:py-24">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] md:leading-[1.08]">
          Your agent builds it.
          <br />
          Relay publishes with{" "}
          <span className="text-primary">access control</span> and{" "}
          <span className="text-primary">analytics</span>.
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Upload HTML or zip bundles from your coding agent and publish them to a link — set who can
          view it, see who opened it.
        </p>

        <div className="mt-12 w-full min-w-0 max-w-xl text-left">
          <PublishMethodPanel className="w-full" />
        </div>
      </section>

      <ArtifactShowcase />

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-2 text-center text-xs text-muted-foreground">
        Web · CLI · MCP · Skills
      </footer>
    </PageShell>
  );
}
