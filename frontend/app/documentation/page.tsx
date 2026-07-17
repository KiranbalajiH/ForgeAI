import PageTemplate from "@/components/common/page-template";

export default function DocumentationPage() {
  return (
    <PageTemplate
      title="Documentation"
      description="Generate and manage project documentation."
    >
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Documentation</h2>
        <p className="mt-2 text-muted-foreground">
          AI-generated documentation and technical references will be displayed here.
        </p>
      </div>
    </PageTemplate>
  );
}