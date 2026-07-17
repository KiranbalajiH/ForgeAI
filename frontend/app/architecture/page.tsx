import PageTemplate from "@/components/common/page-template";

export default function ArchitecturePage() {
  return (
    <PageTemplate
      title="Architecture"
      description="System architecture visualization and analysis."
    >
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Architecture</h2>
        <p className="mt-2 text-muted-foreground">
          Architecture diagrams and dependency graphs will be available here.
        </p>
      </div>
    </PageTemplate>
  );
}